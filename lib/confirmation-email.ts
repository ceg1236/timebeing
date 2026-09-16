/**
 * Optional booking confirmation email via Resend. If RESEND_API_KEY isn't
 * set, this quietly no-ops — email confirmation is a nice-to-have, not a
 * requirement for the booking to count (the Sheet row is the source of truth).
 */

import { Resend } from 'resend'
import { getResendConfig } from './payment-env'

export async function sendConfirmationEmail(params: {
  to: string
  name: string
  eventTitle: string
  dateLabel: string
  tierLabel: string
  quantity: number
  amountPaidLabel: string
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const { apiKey, from } = getResendConfig()
  if (!apiKey || !from) {
    return { ok: true, skipped: true }
  }

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: `You're booked: ${params.eventTitle}`,
      text:
        `Hi ${params.name},\n\n` +
        `You're confirmed for ${params.eventTitle} — ${params.dateLabel}.\n` +
        `${params.quantity} x ${params.tierLabel} — ${params.amountPaidLabel}\n\n` +
        `See you there!`,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
