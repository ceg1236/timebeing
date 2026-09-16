import Link from 'next/link'

export function Nav() {
  return (
    <header className="border-b border-black/10">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-medium tracking-tight">
          timebeing
        </Link>
        <div className="flex gap-6 text-sm">
          <Link href="/events" className="hover:underline">
            Events
          </Link>
        </div>
      </nav>
    </header>
  )
}
