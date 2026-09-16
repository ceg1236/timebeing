import Link from 'next/link'
import { getAllEvents } from '../../lib/event-registry'

export default function EventsPage() {
  const events = getAllEvents()

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-medium tracking-tight">Upcoming events</h1>

      {events.length === 0 && <p className="mt-6 text-black/60">Nothing on the calendar just yet — check back soon.</p>}

      <ul className="mt-8 space-y-6">
        {events.map((event) => (
          <li key={event.slug} className="border-b border-black/10 pb-6">
            <Link href={`/events/${event.slug}`} className="text-xl font-medium hover:underline">
              {event.title}
            </Link>
            <p className="mt-1 text-black/70">{event.summary}</p>
            <p className="mt-2 text-sm text-black/50">
              {event.dates.map((d) => d.label).join(' · ')} — {event.location}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
