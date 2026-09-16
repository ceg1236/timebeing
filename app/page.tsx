import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-medium tracking-tight">timebeing</h1>
      <p className="mt-4 max-w-xl text-lg text-black/70">
        A teahouse space at 438 Haight St in the Lower Haight, San Francisco — a
        collaboration between Midnight Teahouse and Gather SF.
      </p>
      <p className="mt-8">
        <Link
          href="/events"
          className="inline-block rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          See upcoming events
        </Link>
      </p>
    </div>
  )
}
