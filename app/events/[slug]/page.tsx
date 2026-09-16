import { notFound } from 'next/navigation'
import { getEventConfig } from '../../../lib/event-registry'
import { getAvailabilityForDates } from '../../../lib/sheets-availability'
import { BookingForm } from '../../components/booking-form'

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = getEventConfig(slug)
  if (!event) notFound()

  const availability = await getAvailabilityForDates(event.dates)

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-medium tracking-tight">{event.title}</h1>
      <p className="mt-2 text-black/60">{event.location}</p>

      <div className="mt-6 space-y-4 text-black/80">
        {event.description.split('\n\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <BookingForm event={event} availability={availability} />
    </div>
  )
}
