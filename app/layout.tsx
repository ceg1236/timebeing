import type { Metadata } from 'next'
import './global.css'
import { Nav } from './components/nav'
import { Footer } from './components/footer'

export const metadata: Metadata = {
  title: 'timebeing',
  description: 'A teahouse space at 438 Haight St, San Francisco.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
