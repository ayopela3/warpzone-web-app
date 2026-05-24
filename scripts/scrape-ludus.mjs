#!/usr/bin/env node
/**
 * Ludus Distributors Pre-Order Scraper
 *
 * Uses Ludus's public Shopify JSON API — no login required.
 * Pulls Magic: the Gathering and Riftbound TCG collections and outputs a
 * ready-to-apply SQL file for Warpzone's pre_orders table.
 *
 * Usage:
 *   node scripts/scrape-ludus.mjs
 *
 * Optional overrides in .env.local:
 *   SCRAPE_MAX_SLOTS=            (blank = unlimited)
 *   SCRAPE_DOWNPAYMENT_PCT=30    (e.g. 30 = 30%, blank = full price up front)
 *   LUDUS_EXCHANGE_RATE=56       (PHP per USD, default 56)
 *
 * Output:
 *   scripts/output/ludus-<date>.sql
 *
 * Apply:
 *   npx wrangler d1 execute DB --remote --file=scripts/output/ludus-<date>.sql
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { randomUUID } from "crypto"

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const ENV_FILE = path.join(ROOT, ".env.local")

/** @type {Record<string, string>} */
const env = {}
if (fs.existsSync(ENV_FILE)) {
  fs.readFileSync(ENV_FILE, "utf-8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) return
      const idx = trimmed.indexOf("=")
      if (idx === -1) return
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "")
      env[key] = val
    })
}

const MAX_SLOTS = env.SCRAPE_MAX_SLOTS ? parseInt(env.SCRAPE_MAX_SLOTS, 10) : null
const DOWNPAYMENT_PCT = env.SCRAPE_DOWNPAYMENT_PCT
  ? parseFloat(env.SCRAPE_DOWNPAYMENT_PCT) / 100
  : null
/** PHP per 1 USD — used to convert MSRP USD prices found in descriptions */
const EXCHANGE_RATE = env.LUDUS_EXCHANGE_RATE ? parseFloat(env.LUDUS_EXCHANGE_RATE) : 56

const BASE_URL = "https://www.ludusproducts.com"

// ---------------------------------------------------------------------------
// Collections to scrape — slug → your app's game tag
// ---------------------------------------------------------------------------

/**
 * Add or remove entries here to control which Ludus collections are imported.
 * The slug must match the Ludus collection URL: /collections/<slug>
 */
const COLLECTIONS = [
  { slug: "magic-the-gathering", game: "Magic: The Gathering" },
  { slug: "riftbound-tcg",       game: "Riftbound TCG" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags from a string.
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
}

/**
 * Extract a release/ETA date from product description text.
 * Returns ISO date string (YYYY-MM-DD) or null.
 * @param {string} text
 * @returns {string | null}
 */
function extractDate(text) {
  // Explicit ISO date
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/)
  if (iso) {
    const d = new Date(iso[1])
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }

  // "ETA: June 2026" or "ETA: June 15, 2026"
  const eta = text.match(/ETA[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4}|[A-Za-z]+ \d{4})/i)
  if (eta) {
    const d = new Date(eta[1])
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }

  // "release date: May 22, 2026"
  const rel = text.match(/release\s*date[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i)
  if (rel) {
    const d = new Date(rel[1])
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }

  // Month + year only → use the 1st of that month as a fallback
  const monthYear = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i)
  if (monthYear) {
    const d = new Date(`${monthYear[1]} 1, ${monthYear[2]}`)
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }

  return null
}

/**
 * Extract MSRP in USD from description text, then convert to PHP.
 * Falls back to the Shopify variant price (already in PHP).
 * @param {string} text
 * @param {number} shopifyPricePhp  — variant price as PHP (Shopify stores it × 100, already divided)
 * @returns {number}
 */
function extractPrice(text, shopifyPricePhp) {
  const msrp = text.match(/MSRP[:\s₱$]*([\d,.]+)\s*(USD|PHP|₱)?/i)
  if (msrp) {
    const raw = parseFloat(msrp[1].replace(/,/g, ""))
    if (raw > 0) {
      const currency = (msrp[2] ?? "USD").toUpperCase()
      return currency === "PHP" || currency === "₱" ? raw : Math.round(raw * EXCHANGE_RATE)
    }
  }
  // Fall back to Shopify variant price
  return shopifyPricePhp
}

/**
 * Escape a string for SQL single-quote insertion.
 * @param {string | null} val
 * @returns {string}
 */
function sqlStr(val) {
  if (val === null || val === undefined) return "NULL"
  return `'${String(val).replace(/'/g, "''")}'`
}

// ---------------------------------------------------------------------------
// Shopify collection fetcher — handles pagination
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ShopifyVariant
 * @property {string} price
 * @property {boolean} available
 */

/**
 * @typedef {Object} ShopifyImage
 * @property {string} src
 */

/**
 * @typedef {Object} ShopifyProduct
 * @property {number} id
 * @property {string} title
 * @property {string} handle
 * @property {string} body_html
 * @property {string} published_at
 * @property {ShopifyVariant[]} variants
 * @property {ShopifyImage[]} images
 * @property {string[]} tags
 */

/**
 * Fetch all products from a Shopify collection using the JSON API with pagination.
 * @param {string} collectionSlug
 * @returns {Promise<ShopifyProduct[]>}
 */
async function fetchCollection(collectionSlug) {
  const all = []
  let page = 1
  const limit = 250

  while (true) {
    const url = `${BASE_URL}/collections/${collectionSlug}/products.json?limit=${limit}&page=${page}`
    console.log(`  📦  Fetching page ${page}: /collections/${collectionSlug}/products.json`)

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 WarpzoneScraper/1.0" },
    })

    if (!res.ok) {
      console.warn(`  ⚠️  HTTP ${res.status} for collection "${collectionSlug}" — stopping pagination`)
      break
    }

    const data = await res.json()
    const products = data.products ?? []
    all.push(...products)

    if (products.length < limit) break
    page++
    await new Promise((r) => setTimeout(r, 500))
  }

  return all
}

// ---------------------------------------------------------------------------
// SQL generation
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ProcessedProduct
 * @property {string} title
 * @property {string | null} description
 * @property {string} game
 * @property {string | null} image_url
 * @property {number} full_price
 * @property {string | null} release_date
 * @property {string | null} cutoff_date
 * @property {string} source_url
 */

/**
 * Convert a Shopify product into a SQL INSERT for pre_orders.
 * @param {ProcessedProduct} product
 * @returns {string}
 */
function toSql(product) {
  const id = randomUUID()
  const now = new Date().toISOString().replace("T", " ").split(".")[0]

  const fullPrice = product.full_price
  const dpPct = DOWNPAYMENT_PCT
  const dpAmount = dpPct !== null ? Math.round(fullPrice * dpPct * 100) / 100 : null
  const displayPrice = dpAmount ?? fullPrice
  const releaseDate =
    product.release_date ??
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  // cutoff_date is not published by Ludus — emit a TODO comment so it's easy to find
  const cutoffLine = product.cutoff_date
    ? sqlStr(product.cutoff_date)
    : `NULL -- TODO: set cutoff date if needed (format: 'YYYY-MM-DD')`

  return [
    `-- ${product.source_url}`,
    `INSERT INTO pre_orders`,
    `  (id, title, description, game, image_url,`,
    `   price, full_price, downpayment_amount, downpayment_pct,`,
    `   cutoff_date, release_date, status, approval_status,`,
    `   seller_id, max_slots, created_at, updated_at)`,
    `VALUES (`,
    `  ${sqlStr(id)},`,
    `  ${sqlStr(product.title)},`,
    `  ${sqlStr(product.description)},`,
    `  ${sqlStr(product.game)},`,
    `  ${sqlStr(product.image_url)},`,
    `  ${displayPrice},`,
    `  ${fullPrice},`,
    `  ${dpAmount ?? "NULL"},`,
    `  ${dpPct ?? "NULL"},`,
    `  ${cutoffLine},`,
    `  ${sqlStr(releaseDate)},`,
    `  'active',`,
    `  'approved',`,
    `  NULL,`,
    `  ${MAX_SLOTS ?? "NULL"},`,
    `  '${now}',`,
    `  '${now}'`,
    `);`,
  ].join("\n")
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🚀  Warpzone Scraper — Ludus Distributors (Shopify API)")
  console.log(`    Collections:  ${COLLECTIONS.map((c) => c.game).join(", ")}`)
  console.log(`    Exchange rate: 1 USD = ₱${EXCHANGE_RATE}`)
  console.log(`    Max slots:    ${MAX_SLOTS ?? "unlimited"}`)
  console.log(`    Downpayment:  ${DOWNPAYMENT_PCT ? `${DOWNPAYMENT_PCT * 100}%` : "none (full price)"}`)
  console.log("")

  const sqlStatements = [
    `-- Warpzone Pre-Order Import — Ludus Distributors`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Source:    https://www.ludusproducts.com`,
    `-- Apply:     npx wrangler d1 execute DB --remote --file=<this-file>`,
    `--`,
    `-- NOTE: Review release dates and prices before applying!`,
    `--       Prices converted from USD using rate: 1 USD = ${EXCHANGE_RATE} PHP`,
    ``,
    `PRAGMA foreign_keys = ON;`,
    ``,
  ]

  let successCount = 0
  let skippedCount = 0

  for (const { slug, game } of COLLECTIONS) {
    console.log(`\n🗂️   Collection: ${game} (/collections/${slug})`)
    const products = await fetchCollection(slug)
    console.log(`    Found ${products.length} product(s)`)

    for (const p of products) {
      const descText = stripHtml(p.body_html ?? "")
      const shopifyPrice = parseFloat(p.variants?.[0]?.price ?? "0")
      const full_price = extractPrice(descText, shopifyPrice)
      const release_date = extractDate(descText)
      const image_url = p.images?.[0]?.src ?? null
      const source_url = `${BASE_URL}/products/${p.handle}`

      if (!full_price) {
        console.warn(`  ⚠️  No price found for "${p.title}" — skipping`)
        skippedCount++
        continue
      }

      if (!release_date) {
        console.warn(`  ⚠️  No release date for "${p.title}" — defaulting to 90 days from now`)
      }
      console.log(`  ✅  "${p.title}" ₱${full_price}${release_date ? ` — ${release_date}` : ""} (cutoff: set manually in SQL)`)

      sqlStatements.push(
        toSql({
          title: p.title,
          description: descText || null,
          game,
          image_url,
          full_price,
          release_date,
          cutoff_date: null,
          source_url,
        })
      )
      sqlStatements.push("")
      successCount++
    }

    await new Promise((r) => setTimeout(r, 500))
  }

  // Write output
  const outputDir = path.join(__dirname, "output")
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

  const dateStr = new Date().toISOString().slice(0, 10)
  const outFile = path.join(outputDir, `ludus-${dateStr}.sql`)
  fs.writeFileSync(outFile, sqlStatements.join("\n"), "utf-8")

  console.log("")
  console.log(`📄  Output: scripts/output/ludus-${dateStr}.sql`)
  console.log(`    ✅ Exported: ${successCount}  ⏭  Skipped: ${skippedCount}`)
  console.log("")
  console.log("Next steps:")
  console.log("  1. Review the .sql file — adjust prices/dates as needed")
  console.log(`  2. Apply to remote D1:`)
  console.log(`       npx wrangler d1 execute DB --remote --file=scripts/output/ludus-${dateStr}.sql`)
  console.log(`  3. Or test locally first:`)
  console.log(`       npx wrangler d1 execute DB --local --file=scripts/output/ludus-${dateStr}.sql`)
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err))
  process.exit(1)
})
