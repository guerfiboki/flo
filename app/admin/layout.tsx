// file: app/admin/layout.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session || (session.user as any).role !== 'ADMIN') {
    redirect('/login')
  }

  const navLinks = [
    { href: '/admin', label: '📊 Dashboard' },
    { href: '/admin/bookings', label: '📋 Bookings' },
    { href: '/admin/listings', label: '🏡 Listings' },
    { href: '/admin/listings/new', label: '➕ Add listing' },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 w-60 border-r border-gray-100 bg-white pt-16 shadow-sm">
        <div className="px-4 py-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Admin panel
          </p>
          <p className="font-display text-lg font-bold text-ocean-700">🌊 WaveCamp</p>
        </div>
        <nav className="px-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-ocean-50 hover:text-ocean-700 mb-1"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-6 left-0 w-full px-4">
          <Link href="/" className="btn-secondary w-full text-sm">
            ← Back to site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-60 flex-1 pt-16">
        <div className="p-8">{children}</div>
      </div>
    </div>
  )
}
