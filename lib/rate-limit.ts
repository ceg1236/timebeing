/**
 * Minimal in-memory rate limit for the checkout endpoint — enough to blunt a
 * script hammering the booking API. It resets whenever the serverless
 * function cold-starts, so it's a speed bump, not a guarantee; that's fine
 * for this use case.
 */

const WINDOW_MS = 60_000
const MAX_REQUESTS = 10

const hits = new Map<string, number[]>()

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

export function checkRateLimit(req: Request): { ok: boolean; retryAfter?: number } {
  const ip = getClientIp(req)
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  const existing = (hits.get(ip) ?? []).filter((t) => t > windowStart)
  if (existing.length >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((existing[0] + WINDOW_MS - now) / 1000)
    return { ok: false, retryAfter: Math.max(1, retryAfter) }
  }

  existing.push(now)
  hits.set(ip, existing)
  return { ok: true }
}
