'use client'

import { useState } from 'react'
import type { EventConfig } from '../../content/event-schema'
import type { DateAvailability } from '../../lib/sheets-availability'

export function BookingForm({
  event,
  availability,
}: {
  event: EventConfig
  availability: DateAvailability[] | null
}) {
  const [dateId, setDateId] = useState(event.dates[0]?.id ?? '')
  const [tierId, setTierId] = useState(event.tiers[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remainingForDate = availability?.find((a) => a.dateId === dateId)?.remaining
  const soldOut = remainingForDate === 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventSlug: event.slug, dateId, tierId, quantity, name, email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Could not reach the server. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-black/10 p-6">
      <div>
        <label className="block text-sm font-medium">Date</label>
        <select
          value={dateId}
          onChange={(e) => setDateId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2"
        >
          {event.dates.map((d) => {
            const avail = availability?.find((a) => a.dateId === d.id)
            return (
              <option key={d.id} value={d.id} disabled={avail?.soldOut}>
                {d.label} — {d.timeLabel}
                {avail?.soldOut ? ' (sold out)' : ''}
              </option>
            )
          })}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Ticket</label>
        <select
          value={tierId}
          onChange={(e) => setTierId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2"
        >
          {event.tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} — ${t.price}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Quantity</label>
        <input
          type="number"
          min={1}
          max={8}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="mt-1 w-24 rounded-lg border border-black/20 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || soldOut}
        className="w-full rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {soldOut ? 'Sold out for this date' : submitting ? 'Redirecting to checkout…' : 'Continue to payment'}
      </button>
    </form>
  )
}
