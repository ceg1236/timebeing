import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeSecretKey, getStripeWebhookSecret } from '../../../../lib/payment-env'
import { appendBooking, getExistingPaymentIds, markBookingRefunded } from '../../../../lib/sheets-bookings'
import { sendConfirmationEmail } from '../../../../lib/confirmation-email'
import { getEventConfig } from '../../../../lib/event-registry'

export async function POST(req: NextRequest) {
  const webhookSecret = getStripeWebhookSecret()
  const secretKey = getStripeSecretKey()
  if (!webhookSecret || !secretKey) {
    console.error('STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY is not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  const stripe = new Stripe(secretKey)
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const paymentIntentId =
      typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
    const eventSlug = charge.metadata?.eventSlug
    if (paymentIntentId && eventSlug) {
      await markBookingRefunded(paymentIntentId, eventSlug)
    } else {
      console.error('[webhook] charge.refunded missing paymentIntentId or eventSlug metadata:', charge.id)
    }
    return NextResponse.json({ received: true })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const metadata = session.metadata
  if (!metadata?.eventSlug || !metadata?.dateId || !metadata?.name || !metadata?.email) {
    console.error('Missing metadata on checkout session:', session.id)
    return NextResponse.json({ error: 'Invalid session metadata' }, { status: 400 })
  }

  const paymentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? session.id

  // Idempotency: Stripe can retry webhook delivery, so skip if we've already recorded this payment.
  const existingIds = await getExistingPaymentIds(metadata.eventSlug)
  if (existingIds?.includes(paymentId)) {
    console.log('[webhook] payment already recorded, skipping:', paymentId)
    return NextResponse.json({ received: true })
  }

  const amountPaidLabel = session.amount_total != null ? `$${Math.round(session.amount_total / 100)}` : ''
  const quantity = parseInt(metadata.quantity ?? '1', 10) || 1

  const result = await appendBooking({
    name: metadata.name,
    email: metadata.email,
    eventSlug: metadata.eventSlug,
    dateId: metadata.dateId,
    dateLabel: metadata.dateLabel ?? metadata.dateId,
    tierLabel: metadata.tierLabel ?? metadata.tierId ?? '',
    quantity,
    amountPaidLabel,
    paymentId,
    notes: metadata.notes,
  })

  if (!result.ok) {
    // Don't return 500 here — Stripe will retry, and the payment already
    // succeeded. Log loudly so it gets noticed and can be added manually.
    console.error('[webhook] failed to record booking in sheet for payment', paymentId)
  }

  const eventConfig = getEventConfig(metadata.eventSlug)
  const emailResult = await sendConfirmationEmail({
    to: metadata.email,
    name: metadata.name,
    eventTitle: eventConfig?.title ?? metadata.eventSlug,
    dateLabel: metadata.dateLabel ?? metadata.dateId,
    tierLabel: metadata.tierLabel ?? '',
    quantity,
    amountPaidLabel,
  })
  if (!emailResult.ok && !emailResult.skipped) {
    console.error('[webhook] confirmation email failed:', emailResult.error)
  }

  return NextResponse.json({ received: true })
}
