#!/usr/bin/env node
/**
 * Courtside Wholesale Pre-Order Scraper
 *
 * Logs into wholesale.courtside.com.ph using your retailer credentials,
 * then either:
 *   (A) Auto-crawls the pre-orders category pages and filters by the
 *       supported games (Pokemon, One Piece, Hololive, Palworld, Gundam), or
 *   (B) Scrapes specific product URLs you pass as CLI args / set in .env.local
 *
 * Outputs a ready-to-apply SQL file:
 *   npx wrangler d1 execute DB --remote --file=./scripts/output/preorders-<date>.sql
 *
 * Usage:
 *   # Auto-crawl all supported games from pre-orders category:
 *   node scripts/scrape-preorders.mjs --auto
 *
 *   # Scrape specific product URLs:
 *   node scripts/scrape-preorders.mjs https://wholesale.courtside.com.ph/product/...
 *
 *   # URLs can also be set in .env.local as SCRAPE_URLS (comma-separated)
 *
 * Credentials (.env.local):
 *   COURTSIDE_EMAIL=your@email.com
 *   COURTSIDE_PASSWORD=yourpassword
 *
 * Optional (.env.local):
 *   SCRAPE_URLS=https://...,https://...   (comma-separated, used when no CLI args)
 *   SCRAPE_MAX_SLOTS=                     (blank = unlimited)
 *   SCRAPE_DOWNPAYMENT_PCT=30             (e.g. 30 = 30%, blank = full price up front)
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { randomUUID } from "crypto"

// ---------------------------------------------------------------------------
// Load .env.local manually (no dotenv dep required)
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

const EMAIL = env.COURTSIDE_EMAIL ?? process.env.COURTSIDE_EMAIL
const PASSWORD = env.COURTSIDE_PASSWORD ?? process.env.COURTSIDE_PASSWORD
const MAX_SLOTS = env.SCRAPE_MAX_SLOTS
  ? parseInt(env.SCRAPE_MAX_SLOTS, 10)
  : null
const DOWNPAYMENT_PCT = env.SCRAPE_DOWNPAYMENT_PCT
  ? parseFloat(env.SCRAPE_DOWNPAYMENT_PCT) / 100
  : null

// ---------------------------------------------------------------------------
// Supported games — keywords must appear in product title for auto-crawl filter
// ---------------------------------------------------------------------------

/**
 * The 5 games we care about. Each entry maps title keywords → your app's game tag.
 * Add/remove entries here to change which products get imported.
 */
const SUPPORTED_GAMES = [
  {
    game: "Pokemon",
    keywords: ["pokemon", "pok\u00e9mon", "scarlet", "violet", "stellar", "twilight"],
  },
  {
    game: "One Piece",
    keywords: ["one piece", "optcg"],
  },
  {
    game: "Hololive Card Game",
    keywords: ["hololive"],
  },
  {
    game: "Palworld",
    keywords: ["palworld"],
  },
  {
    game: "Gundam Card Game",
    keywords: ["gundam"],
  },
]

// ---------------------------------------------------------------------------
// Auto-crawl category pages — Courtside WooCommerce shop search/category URLs
// ---------------------------------------------------------------------------

/**
 * Candidate listing/category URLs to crawl when running in --auto mode.
 * The script searches each for product links, then filters by SUPPORTED_GAMES.
 * Pagination is handled automatically (page 2, 3, …) until no more products.
 */
const CATEGORY_URLS = [
  // WooCommerce search — "pre-order" keyword covers all pre-order products
  "https://wholesale.courtside.com.ph/?s=pre-order&post_type=product",
  // Direct category if it exists
  "https://wholesale.courtside.com.ph/product-category/pre-orders/",
  // Per-game searches as fallback
  "https://wholesale.courtside.com.ph/?s=pre-order+pokemon&post_type=product",
  "https://wholesale.courtside.com.ph/?s=pre-order+one+piece&post_type=product",
  "https://wholesale.courtside.com.ph/?s=pre-order+hololive&post_type=product",
  "https://wholesale.courtside.com.ph/?s=pre-order+palworld&post_type=product",
  "https://wholesale.courtside.com.ph/?s=pre-order+gundam&post_type=product",
]

// CLI mode flags
const AUTO_MODE = process.argv.includes("--auto")
const CLI_URLS = process.argv.slice(2).filter((a) => a.startsWith("http"))
const ENV_URLS = env.SCRAPE_URLS
  ? env.SCRAPE_URLS.split(",").map((u) => u.trim()).filter(Boolean)
  : []
// In auto mode URLs are discovered at runtime; otherwise fall back to explicit list
const EXPLICIT_URLS = CLI_URLS.length ? CLI_URLS : ENV_URLS

if (!EMAIL || !PASSWORD) {
  console.error(
    "❌  COURTSIDE_EMAIL and COURTSIDE_PASSWORD must be set in .env.local"
  )
  process.exit(1)
}

if (!AUTO_MODE && !EXPLICIT_URLS.length) {
  console.error("❌  No URLs to scrape. Use one of:")
  console.error("    --auto                              auto-crawl pre-orders for all supported games")
  console.error("    https://wholesale.courtside.com.ph/product/...   specific product URL(s)")
  console.error("    SCRAPE_URLS=... in .env.local")
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Ensure cheerio is available — install on-the-fly if missing
// ---------------------------------------------------------------------------
let cheerio
try {
  cheerio = await import("cheerio")
} catch {
  console.log("📦  cheerio not found — installing locally (one-time setup)…")
  const { execSync } = await import("child_process")
  execSync("npm install --save-dev cheerio", { cwd: ROOT, stdio: "inherit" })
  cheerio = await import("cheerio")
}
const { load } = cheerio

// ---------------------------------------------------------------------------
// Cookie jar — lightweight, no external dep
// ---------------------------------------------------------------------------
/** @type {Map<string, string>} */
const cookieJar = new Map()

/**
 * Merge Set-Cookie headers into the jar.
 * @param {string[]} setCookieHeaders
 */
function mergeCookies(setCookieHeaders) {
  for (const header of setCookieHeaders) {
    const pair = header.split(";")[0].trim()
    const idx = pair.indexOf("=")
    if (idx === -1) continue
    cookieJar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
  }
}

/** Build Cookie header string from jar. */
function cookieHeader() {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
}

/**
 * Fetch wrapper that maintains cookies across requests.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
async function fetchWithCookies(url, options = {}) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Cookie: cookieHeader(),
    ...(options.headers ?? {}),
  }

  const res = await fetch(url, { ...options, headers, redirect: "follow" })

  const setCookies = res.headers.getSetCookie?.() ?? []
  mergeCookies(setCookies)

  return res
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

const LOGIN_URL = "https://wholesale.courtside.com.ph/my-account/"
const LOGIN_POST_URL = "https://wholesale.courtside.com.ph/my-account/"

/**
 * Authenticate with Courtside using WooCommerce login form.
 * Returns true if login succeeded.
 * @returns {Promise<boolean>}
 */
async function login() {
  console.log("🔐  Fetching login page…")
  const loginPage = await fetchWithCookies(LOGIN_URL)
  const html = await loginPage.text()
  const $ = load(html)

  // WooCommerce login nonce
  const nonce = $('input[name="woocommerce-login-nonce"]').val()
  const redirect = $('input[name="_wp_http_referer"]').val() ?? "/my-account/"

  if (!nonce) {
    // Already logged in, or page structure changed
    if (html.includes("Log out") || html.includes("logout")) {
      console.log("✅  Already logged in (session cookie still valid)")
      return true
    }
    console.warn("⚠️  Could not find login nonce — page structure may have changed")
  }

  console.log("🔐  Submitting credentials…")
  const body = new URLSearchParams({
    username: EMAIL,
    password: PASSWORD,
    "woocommerce-login-nonce": nonce ?? "",
    "_wp_http_referer": redirect,
    login: "Log in",
  })

  const res = await fetchWithCookies(LOGIN_POST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  const resultHtml = await res.text()

  if (
    resultHtml.includes("Log out") ||
    resultHtml.includes("logout") ||
    resultHtml.includes("dashboard")
  ) {
    console.log("✅  Login successful")
    return true
  }

  console.error("❌  Login failed — check your credentials in .env.local")
  console.error("    (If the site uses 2FA or reCAPTCHA, manual login is required)")
  return false
}

// ---------------------------------------------------------------------------
// Game detection — uses SUPPORTED_GAMES defined above
// ---------------------------------------------------------------------------

/**
 * Detect game from a product title/description string.
 * Returns null if it doesn't match any supported game.
 * @param {string} text
 * @returns {string | null}
 */
function detectGame(text) {
  const lower = text.toLowerCase()
  for (const { keywords, game } of SUPPORTED_GAMES) {
    if (keywords.some((kw) => lower.includes(kw))) return game
  }
  return null
}

// ---------------------------------------------------------------------------
// Category crawler — discovers product URLs from WooCommerce listing pages
// ---------------------------------------------------------------------------

/**
 * Crawl a WooCommerce listing/search page (with pagination) and return all
 * product URLs whose slugs match a supported game keyword.
 * @param {string} baseUrl
 * @returns {Promise<string[]>}
 */
async function crawlCategoryPage(baseUrl) {
  const found = []
  let page = 1

  while (true) {
    const pageUrl = page === 1 ? baseUrl : `${baseUrl.replace(/\/$/, "")}/page/${page}/`
    console.log(`  📂  Crawling listing page ${page}: ${pageUrl}`)

    let res
    try {
      res = await fetchWithCookies(pageUrl)
    } catch {
      break
    }

    // 404 or redirect to login = stop
    if (res.status === 404 || res.url.includes("my-account")) break

    const html = await res.text()
    const $ = load(html)

    const links = []
    $('a[href*="/product/"]').each((_, el) => {
      const href = $(el).attr("href")
      if (href && href.includes("/product/") && !href.includes("#")) {
        links.push(href.split("?")[0].split("#")[0])
      }
    })

    const unique = [...new Set(links)]
    if (!unique.length) break

    for (const link of unique) {
      const slug = decodeURIComponent(link.toLowerCase())
      const matchedGame = SUPPORTED_GAMES.find(({ keywords }) =>
        keywords.some((kw) => slug.includes(kw.replace(/ /g, "-")))
      )
      if (matchedGame) {
        found.push(link)
        console.log(`    ✔  [${matchedGame.game}] ${link.split("/product/")[1]?.replace(/\/$/, "") ?? link}`)
      }
    }

    // Fewer than 12 results usually means it's the last page
    if (unique.length < 12) break
    page++
    await new Promise((r) => setTimeout(r, 800))
  }

  return found
}

// ---------------------------------------------------------------------------
// Date parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extract a release/pre-order-end date from arbitrary text.
 * Returns ISO date string (YYYY-MM-DD) or null.
 * @param {string} text
 * @returns {string | null}
 */
function extractDate(text) {
  // Patterns like "July 25, 2025" or "25 July 2025" or "2025-07-25"
  const patterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(\w+ \d{1,2},?\s*\d{4})/,
    /(\d{1,2} \w+ \d{4})/,
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\d{1,2}-\d{1,2}-\d{4})/,
  ]
  for (const re of patterns) {
    const match = text.match(re)
    if (match) {
      const d = new Date(match[1])
      if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0]
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Price parsing helper
// ---------------------------------------------------------------------------

/**
 * Parse a price string like "₱1,299.00" or "1299" into a number.
 * @param {string} str
 * @returns {number}
 */
function parsePrice(str) {
  const cleaned = str.replace(/[^\d.]/g, "")
  return parseFloat(cleaned) || 0
}

// ---------------------------------------------------------------------------
// Scrape a single product page
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ScrapedProduct
 * @property {string} title
 * @property {string | null} description
 * @property {string | null} game
 * @property {string | null} image_url
 * @property {number} full_price
 * @property {string | null} release_date
 * @property {string | null} cutoff_date
 * @property {string} source_url
 */

/**
 * Scrape a single Courtside wholesale product page.
 * @param {string} url
 * @returns {Promise<ScrapedProduct | null>}
 */
async function scrapePage(url) {
  console.log(`  🌐  Fetching ${url}`)
  const res = await fetchWithCookies(url)

  if (res.status === 302 || res.url.includes("my-account")) {
    console.error(`  ❌  Redirected to login — session may have expired`)
    return null
  }

  const html = await res.text()
  const $ = load(html)

  // --- Title ---
  const title =
    $("h1.product_title").first().text().trim() ||
    $("h1.entry-title").first().text().trim() ||
    $("h1").first().text().trim() ||
    "Untitled Product"

  // --- Description ---
  const descEl =
    $(".woocommerce-product-details__short-description").first() ||
    $(".entry-summary .short-description").first() ||
    $('[itemprop="description"]').first()
  const description = descEl.text().trim() || null

  // --- Price ---
  const priceRaw =
    $(".price .woocommerce-Price-amount").first().text().trim() ||
    $(".price").first().text().trim() ||
    ""
  const full_price = parsePrice(priceRaw)

  // --- Image ---
  const imgEl =
    $(".woocommerce-product-gallery__image img").first() ||
    $(".product-image img").first() ||
    $('img[class*="product"]').first()
  const image_url =
    imgEl.attr("data-large_image") ||
    imgEl.attr("data-src") ||
    imgEl.attr("src") ||
    null

  // --- Game detection ---
  const game = detectGame(title + " " + (description ?? ""))

  // --- Dates: look in title, description, and all visible text ---
  const allText = $("body").text()

  // Release date — look for "release", "ships", "available" keywords
  let release_date = null
  const relPatterns = [
    /release(?:s|d)?\s*(?:on|date[:\s]*)?\s*([\w\s,/-]+\d{4})/i,
    /ships?\s*(?:on|date[:\s]*)?\s*([\w\s,/-]+\d{4})/i,
    /available\s*(?:on|from|date[:\s]*)?\s*([\w\s,/-]+\d{4})/i,
    /(?:set|product)\s*release[:\s]*([\w\s,/-]+\d{4})/i,
  ]
  for (const re of relPatterns) {
    const m = allText.match(re)
    if (m) {
      release_date = extractDate(m[1])
      if (release_date) break
    }
  }
  // Fallback: first date found anywhere on the page
  if (!release_date) release_date = extractDate(allText)

  // Cutoff / pre-order-ends date
  let cutoff_date = null
  const cutoffPatterns = [
    /(?:pre-?order\s*(?:ends?|closes?|deadline|cutoff|cut-?off)[:\s]*)([\w\s,/-]+\d{4})/i,
    /(?:order\s*(?:by|before)[:\s]*)([\w\s,/-]+\d{4})/i,
    /(?:deadline[:\s]*)([\w\s,/-]+\d{4})/i,
  ]
  for (const re of cutoffPatterns) {
    const m = allText.match(re)
    if (m) {
      cutoff_date = extractDate(m[1])
      if (cutoff_date) break
    }
  }

  return {
    title,
    description,
    game,
    image_url,
    full_price,
    release_date,
    cutoff_date,
    source_url: url,
  }
}

// ---------------------------------------------------------------------------
// SQL generation
// ---------------------------------------------------------------------------

/**
 * Escape a string value for SQL insertion (single-quote escaping).
 * @param {string | null} val
 * @returns {string}
 */
function sqlStr(val) {
  if (val === null || val === undefined) return "NULL"
  return `'${String(val).replace(/'/g, "''")}'`
}

/**
 * Generate a D1-compatible INSERT statement for a scraped product.
 * @param {ScrapedProduct} product
 * @returns {string}
 */
function toSql(product) {
  const id = randomUUID()
  const now = new Date().toISOString().replace("T", " ").split(".")[0]

  // Downpayment calculations
  const fullPrice = product.full_price
  const dpPct = DOWNPAYMENT_PCT // e.g. 0.30
  const dpAmount =
    dpPct !== null ? Math.round(fullPrice * dpPct * 100) / 100 : null
  const displayPrice = dpAmount ?? fullPrice

  const releaseDate = product.release_date ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0] // fallback: 90 days from now

  const lines = [
    `-- Source: ${product.source_url}`,
    `-- Game:   ${product.game}`,
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
    `  ${sqlStr(product.cutoff_date)},`,
    `  ${sqlStr(releaseDate)},`,
    `  'active',`,
    `  'approved',`,
    `  NULL,`,
    `  ${MAX_SLOTS ?? "NULL"},`,
    `  '${now}',`,
    `  '${now}'`,
    `);`,
  ]

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🚀  Warpzone Pre-Order Scraper — Courtside Wholesale")
  console.log(`    Mode:        ${AUTO_MODE ? "auto-crawl" : "explicit URLs"}`)
  console.log(`    Games:       ${SUPPORTED_GAMES.map((g) => g.game).join(", ")}`)
  console.log(`    Max slots:   ${MAX_SLOTS ?? "unlimited"}`)
  console.log(`    Downpayment: ${DOWNPAYMENT_PCT ? `${DOWNPAYMENT_PCT * 100}%` : "none (full price)"}`)
  console.log("")

  // Login
  const loggedIn = await login()
  if (!loggedIn) process.exit(1)

  // Discover product URLs
  let URLS = EXPLICIT_URLS

  if (AUTO_MODE) {
    console.log("\n🔍  Auto-crawling pre-order category pages…")
    const discovered = new Set()
    for (const categoryUrl of CATEGORY_URLS) {
      const links = await crawlCategoryPage(categoryUrl)
      links.forEach((l) => discovered.add(l))
      // Delay between category crawls
      await new Promise((r) => setTimeout(r, 1000))
    }
    URLS = [...discovered]
    console.log(`\n📋  Discovered ${URLS.length} matching product URL(s)\n`)
    if (!URLS.length) {
      console.warn("⚠️  No products found. The site structure may have changed — try passing URLs directly.")
      process.exit(0)
    }
  }

  // Scrape each URL
  const sqlStatements = [
    `-- Warpzone Pre-Order Import`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Source:    wholesale.courtside.com.ph`,
    `-- Apply:     npx wrangler d1 execute DB --remote --file=<this-file>`,
    `--`,
    `-- NOTE: Review dates and prices before applying!`,
    `--       Fields marked "TODO" need manual editing.`,
    ``,
    `PRAGMA foreign_keys = ON;`,
    ``,
  ]

  let successCount = 0
  let failCount = 0

  for (const url of URLS) {
    try {
      const product = await scrapePage(url)
      if (!product) {
        failCount++
        continue
      }

      // In explicit mode, accept any detected game; in auto mode only supported games pass
      if (!product.game) {
        console.log(`  ⏭   Skipping "${product.title}" — not a supported game`)
        continue
      }

      // Warn if price or date is missing/zero
      if (!product.full_price) {
        console.warn(`  ⚠️  Price not found for "${product.title}" — set to 0, edit before applying`)
      }
      if (!product.release_date) {
        console.warn(`  ⚠️  Release date not found for "${product.title}" — defaulting to 90 days from now`)
      }

      console.log(`  ✅  "${product.title}" [${product.game}] ₱${product.full_price}`)

      sqlStatements.push(toSql(product))
      sqlStatements.push("")
      successCount++
    } catch (err) {
      console.error(`  ❌  Failed to scrape ${url}: ${err instanceof Error ? err.message : String(err)}`)
      failCount++
    }

    // Polite delay between requests
    if (URLS.indexOf(url) < URLS.length - 1) {
      await new Promise((r) => setTimeout(r, 1500))
    }
  }

  // Write output file
  const outputDir = path.join(__dirname, "output")
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

  const dateStr = new Date().toISOString().slice(0, 10)
  const outFile = path.join(outputDir, `preorders-${dateStr}.sql`)
  fs.writeFileSync(outFile, sqlStatements.join("\n"), "utf-8")

  console.log("")
  console.log(`📄  Output written to: scripts/output/preorders-${dateStr}.sql`)
  console.log(`    ✅ Scraped: ${successCount}  ❌ Failed: ${failCount}`)
  console.log("")
  console.log("Next steps:")
  console.log("  1. Review the .sql file and fix any TODO fields (dates, prices)")
  console.log(`  2. Apply to remote D1:`)
  console.log(`       npx wrangler d1 execute DB --remote --file=scripts/output/preorders-${dateStr}.sql`)
  console.log(`  3. Or apply to local D1 for testing:`)
  console.log(`       npx wrangler d1 execute DB --local --file=scripts/output/preorders-${dateStr}.sql`)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
