# Security Audit — Warpzone App
**Date:** 2026-05-24  
**Auditor:** Cascade  

---

## Fix Tracker

| # | Severity | Issue | File(s) | Status |
|---|---|---|---|---|
| 1 | 🔴 Critical | `wz_role` cookie forgeable — middleware bypass | `middleware.ts`, `signin/route.ts` | ✅ Fixed |
| 2 | 🔴 Critical | `allocation_status` not runtime-validated | `pre-orders/[id]/route.ts` | ✅ Fixed |
| 3 | 🔴 Critical | Upload endpoint unauthenticated | `upload/route.ts` | ✅ Fixed |
| 4 | 🟠 High | Bid race condition — non-atomic update | `auctions/[id]/bid/route.ts` | ✅ Fixed |
| 5 | 🟠 High | Reservation slots TOCTOU race condition | `pre-orders/[id]/reserve/route.ts` | ✅ Fixed |
| 6 | 🟠 High | No email/password validation on signup | `auth/signup/route.ts` | ✅ Fixed |
| 7 | 🟠 High | Scrape route duplicates auth logic, skips ban check | `admin/scrape-preorders/route.ts` | ✅ Fixed |
| 8 | 🟡 Medium | Missing `__Secure-` cookie prefix | `auth/signin/route.ts` + all routes | ✅ Fixed |
| 9 | 🟡 Medium | No rate limiting on reserve/create/upload | multiple | ✅ Fixed |
| 10 | 🟡 Medium | Session ID read from `localStorage` in import dialog | `ImportPreOrdersDialog.tsx` | ✅ Fixed |

---

## Detail Notes

### Fix 1 — `wz_role` cookie forgeable
**Root cause:** `wz_role` is an unsigned plain-text cookie (`httpOnly: false`) used by middleware for route decisions. Any user can set it in DevTools.  
**Fix approach:** Add an `HMAC-SHA256` signature to `wz_role` value (`role.timestamp.sig`). Middleware verifies the signature using `COOKIE_SECRET` env var before trusting the role. If signature is missing/invalid, treat as guest.  
**Files changed:** `src/app/api/auth/signin/route.ts`, `src/app/api/auth/signout/route.ts`, `src/middleware.ts`, `src/lib/cookie-sign.ts` (new)

### Fix 2 — `allocation_status` not runtime-validated
**Root cause:** TypeScript union type (`'pending' | 'allocated' | 'shortlisted' | 'refunded'`) is stripped at runtime. Any string passes through to the DB UPDATE and can trigger the shortlisted wallet credit logic with an unexpected value.  
**Fix approach:** Add an explicit runtime allowlist check and return 400 if value is not in the set.  
**Files changed:** `src/app/api/pre-orders/[id]/route.ts`

### Fix 3 — Upload endpoint unauthenticated
**Root cause:** `POST /api/upload` has no session check. Any anonymous request can upload files to R2.  
**Fix approach:** Add `resolveSession` check at top of handler; return 401 if no valid session.  
**Files changed:** `src/app/api/upload/route.ts`

### Fix 4 — Bid race condition
**Root cause:** Bid INSERT and `current_bid` UPDATE are two separate queries. Concurrent bids can both read the same `current_bid`, pass the minimum check, and both succeed.  
**Fix approach:** Use a conditional `UPDATE auctions SET current_bid = ? WHERE id = ? AND current_bid < ?` (or `= old_value`). If 0 rows updated, the bid was superseded — reject with 409.  
**Files changed:** `src/app/api/auctions/[id]/bid/route.ts`

### Fix 5 — Reservation slots TOCTOU
**Root cause:** `SELECT COUNT(*)` then `INSERT` are two separate statements. Concurrent requests both pass the count check and both insert, exceeding `max_slots`.  
**Fix approach:** Use a single atomic INSERT with a sub-query guard: `INSERT … SELECT … WHERE (SELECT COUNT(*) …) < max_slots`. Check `meta.rows_written` to detect if the slot was taken.  
**Files changed:** `src/app/api/pre-orders/[id]/reserve/route.ts`

---

## Remaining (6–10) — To Do Next Session
- **#6** Signup validation: email regex + min password length 8 + max lengths
- **#7** Replace inline auth in scrape route with `requireAdmin()` from `@/lib/auth`
- **#8** Add `__Secure-` prefix to session cookie in production
- **#9** Add `rateLimit()` to reserve, pre-order create, and upload endpoints
- **#10** Remove `localStorage` session read from `ImportPreOrdersDialog` — rely on cookie
