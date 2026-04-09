'use client'
// file: app/admin/listings/[slug]/edit/page.tsx
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EditListingPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch(`/api/listings/${slug}`)
      .then((r) => r.json())
      .then(setListing)
      .finally(() => setLoading(false))
    setLoading(true)
  }, [slug])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const payload = {
      title: fd.get('title'),
      description: fd.get('description'),
      location: fd.get('location'),
      pricePerNight: Number(fd.get('pricePerNight')),
      capacity: Number(fd.get('capacity')),
      active: fd.get('active') === 'true',
    }

    const res = await fetch(`/api/listings/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      setError('Failed to update listing')
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  if (loading) return <div className="animate-pulse text-gray-400">Loading…</div>
  if (!listing) return <div>Listing not found</div>

  return (
    <div className="max-w-2xl">
      <h1 className="font-display mb-8 text-3xl font-bold text-gray-900">
        Edit: {listing.title}
      </h1>

      <form onSubmit={handleSubmit} className="card p-8 space-y-5">
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        {success && <div className="rounded-xl bg-green-50 p-3 text-sm text-green-600">✓ Saved successfully</div>}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
          <input name="title" defaultValue={listing.title} required className="input-field" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Location</label>
            <input name="location" defaultValue={listing.location} required className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Price / night (€)</label>
            <input name="pricePerNight" type="number" defaultValue={listing.pricePerNight} required className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Capacity</label>
            <input name="capacity" type="number" defaultValue={listing.capacity} required className="input-field" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <select name="active" defaultValue={String(listing.active)} className="input-field">
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" defaultValue={listing.description} rows={6} className="input-field resize-none" />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-3.5">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/listings')}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
