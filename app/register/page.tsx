'use client'
// file: app/register/page.tsx
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const name = fd.get('name') as string
    const email = fd.get('email') as string
    const password = fd.get('password') as string

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Registration failed')
      setLoading(false)
      return
    }

    await signIn('credentials', { email, password, callbackUrl: '/', redirect: true })
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-2xl font-bold text-ocean-700">
            🌊 WaveCamp
          </Link>
          <h1 className="font-display mt-4 text-3xl font-bold text-gray-900">
            Create your account
          </h1>
          <p className="mt-2 text-gray-500">Join thousands of surfers in Morocco</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Full name</label>
              <input name="name" type="text" required placeholder="Alex Surfer" className="input-field" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input name="email" type="email" required placeholder="you@example.com" className="input-field" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
              <input name="password" type="password" required placeholder="Min. 6 characters" minLength={6} className="input-field" />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-ocean-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
