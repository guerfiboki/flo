'use client'
// file: components/Navbar.tsx
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'

export function Navbar() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-xl font-bold text-ocean-700">
            🌊 WaveCamp
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 sm:flex">
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
            Explore
          </Link>
          {isAdmin && (
            <Link href="/admin" className="text-sm font-medium text-ocean-600 hover:text-ocean-700 transition">
              Admin
            </Link>
          )}

          {session ? (
            <div className="flex items-center gap-3">
              <Link href="/account/bookings" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                My bookings
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="btn-secondary py-2 px-4 text-sm"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="btn-secondary py-2 px-4 text-sm">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary py-2 px-4 text-sm">
                Sign up
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="flex sm:hidden items-center justify-center rounded-xl border border-gray-200 p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 sm:hidden">
          <div className="flex flex-col gap-3">
            <Link href="/" className="text-sm font-medium text-gray-700">Explore</Link>
            {isAdmin && <Link href="/admin" className="text-sm font-medium text-ocean-600">Admin</Link>}
            {session ? (
              <>
                <Link href="/account/bookings" className="text-sm font-medium text-gray-700">My bookings</Link>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="btn-secondary text-sm">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-sm">Sign in</Link>
                <Link href="/register" className="btn-primary text-sm">Sign up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
