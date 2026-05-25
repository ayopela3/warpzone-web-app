import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

export const runtime = "edge"

const COURTSIDE_BASE = "https://wholesale.courtside.com.ph"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CourtsideProduct {
  _key: string
  source: "courtside"
  title: string
  price: number
  image_url: string | null
  source_url: string
  categories: string[]
  product_id: string
  already_exists: boolean
}

interface LoginCredentials {
  username: string
  password: string
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

async function courtsideLogin(credentials: LoginCredentials): Promise<{ cookie: string }> {
  // First, get the login page to extract nonce and initial cookies
  const loginPageRes = await fetch(`${COURTSIDE_BASE}/my-account/`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  })

  if (!loginPageRes.ok) {
    throw new Error("Failed to access Courtside login page")
  }

  const loginPageHtml = await loginPageRes.text()
  
  // Extract cookies from initial response
  const initialCookies = parseCookies(loginPageRes.headers.get("set-cookie"))

  // Extract WordPress login nonce
  const nonceMatch = loginPageHtml.match(/id=["']woocommerce-login-nonce["'][^>]*value=["']([^"]+)["']/i) ||
                     loginPageHtml.match(/name=["']woocommerce-login-nonce["'][^>]*value=["']([^"]+)["']/i)
  const loginNonce = nonceMatch?.[1]

  // Extract _wp_http_referer
  const refererMatch = loginPageHtml.match(/name=["']_wp_http_referer["'][^>]*value=["']([^"]+)["']/i)
  const wpReferer = refererMatch?.[1] || "/my-account/"

  if (!loginNonce) {
    throw new Error("Could not extract login nonce from page")
  }

  // Prepare login form data - exact WooCommerce format
  const formData = new URLSearchParams()
  formData.append("username", credentials.username)
  formData.append("password", credentials.password)
  formData.append("rememberme", "forever")
  formData.append("woocommerce-login-nonce", loginNonce)
  formData.append("_wp_http_referer", wpReferer)
  formData.append("login", "Log in")

  // Submit login
  const loginRes = await fetch(`${COURTSIDE_BASE}/my-account/`, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Origin": COURTSIDE_BASE,
      "Referer": `${COURTSIDE_BASE}/my-account/`,
      "Cookie": formatCookies(initialCookies),
      "Upgrade-Insecure-Requests": "1",
    },
    body: formData.toString(),
    redirect: "manual",
  })

  // Collect all cookies from login response
  const loginCookies = parseCookies(loginRes.headers.get("set-cookie"))
  const allCookies = { ...initialCookies, ...loginCookies }

  // Follow redirect if present (302 redirect to dashboard)
  const location = loginRes.headers.get("location")
  if (location && (loginRes.status === 302 || loginRes.status === 301)) {
    // Login likely succeeded, verify with a test request
    const verifyRes = await fetch(`${COURTSIDE_BASE}/my-account/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Cookie": formatCookies(allCookies),
        "Referer": `${COURTSIDE_BASE}/my-account/`,
      },
    })

    const verifyHtml = await verifyRes.text()
    
    // If we see login form again, credentials were wrong
    if (verifyHtml.includes('name="password"') && verifyHtml.includes('woocommerce-form-login')) {
      throw new Error("Invalid Courtside credentials")
    }

    // If we see account dashboard elements, login succeeded
    if (verifyHtml.includes("logout") || verifyHtml.includes("Dashboard") || 
        verifyHtml.includes("Orders") || verifyHtml.includes("Account details")) {
      return { cookie: formatCookies(allCookies) }
    }
  }

  // Check response body for error messages
  const responseText = await loginRes.text().catch(() => "")
  if (responseText.includes("Incorrect username") || 
      responseText.includes("incorrect password") ||
      responseText.includes("Invalid username")) {
    throw new Error("Invalid Courtside credentials")
  }

  // If we got a 200 back to login page, it likely failed
  if (loginRes.status === 200) {
    // Try to check the response for error indicators
    const errorCheckRes = await fetch(`${COURTSIDE_BASE}/my-account/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Cookie": formatCookies(allCookies),
      },
    })
    const errorCheckHtml = await errorCheckRes.text()
    
    if (errorCheckHtml.includes('name="password"') && errorCheckHtml.includes('woocommerce-form-login')) {
      throw new Error("Courtside login failed - please check credentials")
    }
    
    // If we don't see login form, might be logged in
    if (errorCheckHtml.includes("logout") || errorCheckHtml.includes("Dashboard")) {
      return { cookie: formatCookies(allCookies) }
    }
  }

  throw new Error(`Courtside login failed (status: ${loginRes.status})`)
}

// Helper to parse Set-Cookie header
function parseCookies(setCookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!setCookieHeader) return cookies

  // Handle multiple cookies (comma-separated in some cases, but usually multiple headers)
  const cookieStrings = setCookieHeader.split(/,(?=[^\s])/)
  
  for (const cookieStr of cookieStrings) {
    const [nameValue] = cookieStr.split(";")
    const [name, value] = nameValue.trim().split("=")
    if (name && value) {
      cookies[name.trim()] = value.trim()
    }
  }
  
  return cookies
}

// Helper to format cookies for Cookie header
function formatCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ")
}

// ---------------------------------------------------------------------------
// Scraping
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
}

function extractPrice(text: string): number {
  const match = text.match(/[₱$]?([\d,]+\.?\d*)/)
  if (match) {
    return parseFloat(match[1].replace(/,/g, ""))
  }
  return 0
}

interface ScrapeDebug {
  url: string
  htmlLength: number
  htmlPreview: string
  hasProductsClass: boolean
  hasUlProducts: boolean
  hasProductLi: boolean
  hasPostClass: boolean
  productMatches?: number
  firstProductPreview?: string
  error?: string
}

async function scrapePreOrdersPage(cookie: string, page: number): Promise<{ products: CourtsideProduct[]; hasNext: boolean; debug: ScrapeDebug }> {
  const url = page === 1 
    ? `${COURTSIDE_BASE}/product-category/current-pre-orders/`
    : `${COURTSIDE_BASE}/product-category/current-pre-orders/page/${page}/`

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Cookie": cookie,
      "Referer": `${COURTSIDE_BASE}/product-category/current-pre-orders/`,
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch page ${page}: ${res.status}`)
  }

  const html = await res.text()
  const products: CourtsideProduct[] = []

  // Check if we got redirected to login page
  const isLoginPage = html.includes('My account') && html.includes('woocommerce-form-login')
  if (isLoginPage) {
    return { 
      products: [], 
      hasNext: false, 
      debug: {
        url,
        htmlLength: html.length,
        htmlPreview: html.substring(0, 200),
        hasProductsClass: false,
        hasUlProducts: false,
        hasProductLi: false,
        hasPostClass: false,
        error: 'Session expired or invalid - redirected to login page. Try using username/password instead, or refresh cookies from browser.',
      }
    }
  }

  // Debug info to return
  const debug: ScrapeDebug = {
    url,
    htmlLength: html.length,
    htmlPreview: html.substring(0, 500),
    hasProductsClass: html.includes('class="products'),
    hasUlProducts: html.includes('<ul class="products'),
    hasProductLi: html.includes('class="product'),
    hasPostClass: html.includes('post-'),
  }

  // Courtside uses post-XXXX class for product IDs in the <li> element
  // Example: <li class="product type-product post-9730 status-publish...">
  const productRegex = /<li[^>]*class=["'][^"']*product[^"']*post-(\d+)[^"']*["'][^>]*>[\s\S]*?<\/li>/gi
  const productMatches = [...html.matchAll(productRegex)]

  debug.productMatches = productMatches.length
  
  if (productMatches.length > 0) {
    debug.firstProductPreview = productMatches[0][0].substring(0, 200)
  }

  for (const match of productMatches) {
    const productHtml = match[0]
    const productId = match[1]

    // Extract title from woocommerce-loop-product__title
    const titleMatch = productHtml.match(/<h2[^>]*class=["'][^"']*woocommerce-loop-product__title[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)
    const sourceUrl = titleMatch?.[1] || ""
    const title = titleMatch ? stripHtml(titleMatch[2]) : ""

    // Extract image - look for wp-post-image class
    const imgMatch = productHtml.match(/<img[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*wp-post-image[^"']*["']/i)
    const imageUrl = imgMatch?.[1] || null

    // Extract price - look for woocommerce-Price-amount in bdi
    const priceMatch = productHtml.match(/<span[^>]*class=["'][^"']*woocommerce-Price-amount[^"']*["'][^>]*>[\s\S]*?<bdi>([\s\S]*?)<\/bdi>/i)
    const priceText = priceMatch ? stripHtml(priceMatch[1]) : ""
    const price = extractPrice(priceText)

    // Extract categories from meta-categories
    const categories: string[] = []
    const catMatch = productHtml.match(/<li[^>]*class=["'][^"']*meta-categories[^"']*["'][^>]*>([\s\S]*?)<\/li>/i)
    if (catMatch) {
      const catLinks = [...catMatch[1].matchAll(/<a[^>]*rel=["']tag["'][^>]*>([^<]+)<\/a>/gi)]
      for (const cat of catLinks) {
        categories.push(cat[1].trim())
      }
    }

    if (title && productId) {
      products.push({
        _key: `courtside-${productId}`,
        source: "courtside",
        title,
        price,
        image_url: imageUrl,
        source_url: sourceUrl,
        categories,
        product_id: productId,
        already_exists: false,
      })
    }
  }

  // Check for pagination next button
  const hasNext = html.includes('rel="next"') || html.includes(`/page/${page + 1}/`)

  return { products, hasNext, debug }
}

// ---------------------------------------------------------------------------
// API Route
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    // Admin-only
    try {
      await requireAdmin(request, db)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Forbidden"
      const status = msg === "Not authenticated" ? 401 : 403
      return NextResponse.json({ success: false, error: msg }, { status })
    }

    // Accept credentials in body to avoid URL encoding issues with special chars
    let username: string | null = null
    let password: string | null = null
    let sessionCookie: string | null = null

    try {
      const body = await request.json()
      username = body.username ?? null
      password = body.password ?? null
      sessionCookie = body.sessionCookie ?? null
    } catch {
      // If JSON parsing fails, fall back to query params for backwards compatibility
      const { searchParams } = new URL(request.url)
      username = searchParams.get("username")
      password = searchParams.get("password")
    }

    // Validate we have either credentials or session cookie
    if (!sessionCookie && (!username || !password)) {
      return NextResponse.json(
        { success: false, error: "Courtside credentials or session cookie required" },
        { status: 400 }
      )
    }

    // Use provided session cookie or login to get one
    let cookie: string
    if (sessionCookie) {
      cookie = sessionCookie
    } else if (username && password) {
      try {
        const loginResult = await courtsideLogin({ username, password })
        cookie = loginResult.cookie
      } catch (e) {
        return NextResponse.json(
          { success: false, error: e instanceof Error ? e.message : "Courtside login failed" },
          { status: 401 }
        )
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Courtside credentials or session cookie required" },
        { status: 400 }
      )
    }

    // Fetch existing pre-order titles to flag duplicates
    const existing = await db
      .prepare("SELECT title FROM pre_orders")
      .all<{ title: string }>()
    const existingTitles = new Set(
      (existing.results ?? []).map((r) => r.title.toLowerCase().trim()),
    )

    // Scrape all pages
    const allProducts: CourtsideProduct[] = []
    let page = 1
    let hasNext = true
    let firstPageDebug: ScrapeDebug | null = null

    while (hasNext && page <= 10) { // Limit to 10 pages to prevent infinite loops
      const result = await scrapePreOrdersPage(cookie, page)
      allProducts.push(...result.products)
      if (page === 1) {
        firstPageDebug = result.debug
      }
      hasNext = result.hasNext
      page++
    }

    // Mark duplicates and add unique keys
    for (const product of allProducts) {
      product.already_exists = existingTitles.has(product.title.toLowerCase().trim())
    }

    return NextResponse.json({
      success: true,
      items: allProducts,
      total: allProducts.length,
      source: "courtside",
      debug: firstPageDebug,
    })
  } catch (error) {
    console.error("Courtside scrape error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to scrape Courtside" },
      { status: 500 }
    )
  }
}
