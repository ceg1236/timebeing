import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getEventConfig } from '../../../lib/event-registry'
import { getStripeSecretKey } from '../../../lib/payment-env'
import { checkRateLimit } from '../../../lib/rate-limit'
import { getAvailabilityForDates } from '../../../lib/sheets-availability'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_QUANTITY = 8

function getRequestBaseUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto}://${host}`
  return 'http://localhost:3000'
}

export async function POST(req: NextRequest) {
  const stripeSecretKey = getStripeSecretKey()
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  const { ok, retryAfter } = checkRateLimit(req)
  if (!ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a moment.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter ?? 60) } }
    )
  }

  let body: {
    eventSlug?: string
    dateId?: string
    tierId?: string
    quantity?: number
    name?: string
    email?: string
    notes?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { eventSlug, dateId, tierId, quantity = 1, name, email, notes = '' } = body

  const event = eventSlug ? getEventConfig(eventSlug) : undefined
  if (!event) {
    return NextResponse.json({ error: 'Unknown event' }, { status: 400 })
  }

  const date = event.dates.find((d) => d.id === dateId)
  if (!date) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const tier = event.tiers.find((t) => t.id === tierId)
  if (!tier) {
    return NextResponse.json({ error: 'Invalid ticket type' }, { status: 400 })
  }

  const qty = Math.min(MAX_QUANTITY, Math.max(1, Math.round(Number(quantity) || 1)))

  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const trimmedEmail = typeof email === 'string' ? email.trim() : ''
  if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  // Soft capacity check at checkout time. This reads current availability and
  // creates the Stripe session as two separate steps, so it's possible (if
  // rare, given typical event sizes) for two people to both pass this check
  // for the last seat. That's an accepted tradeoff — see README — rather
  // than adding a database purely to make this atomic.
  const availability = await getAvailabilityForDates(event.dates, event.slug)
  if (availability) {
    const dateAvail = availability.find((a) => a.dateId === date.id)
    if (dateAvail?.soldOut) {
      return NextResponse.json(
        { error: 'This date is sold out. Please choose another date.' },
        { status: 409 }
      )
    }
    if (dateAvail && qty > dateAvail.remaining) {
      return NextResponse.json(
        { error: `Only ${dateAvail.remaining} seat(s) left for this date.` },
        { status: 409 }
      )
    }
  }

  const baseUrl = getRequestBaseUrl(req)
  const successUrl =
    `${baseUrl}/events/${event.slug}/success?session_id={CHECKOUT_SESSION_ID}` +
    `&date_id=${encodeURIComponent(date.id)}&name=${encodeURIComponent(trimmedName)}`
  const cancelUrl = `${baseUrl}/events/${event.slug}`

  const stripe = new Stripe(stripeSecretKey)
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${date.label} · ${tier.label}`,
              description: `${event.stripeDescriptionLabel} — ${tier.label} tier`,
            },
            unit_amount: tier.price * 100,
          },
          quantity: qty,
        },
      ],
      metadata: {
        eventSlug: event.slug,
        dateId: date.id,
        dateLabel: date.label,
        tierId: tier.id,
        tierLabel: tier.label,
        quantity: String(qty),
        name: trimmedName,
        email: trimmedEmail,
        notes: notes.slice(0, 500),
      },
      // Also stamped on the PaymentIntent (and from there, the Charge) so the
      // charge.refunded webhook — which only gets the charge, not this
      // session — still knows which event's Bookings tab to update.
      payment_intent_data: {
        metadata: { eventSlug: event.slug },
      },
      customer_email: trimmedEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 })
  }
}
