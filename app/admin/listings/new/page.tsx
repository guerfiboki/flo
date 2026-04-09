'use client'
// file: app/admin/listings/new/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const AMENITIES_OPTIONS = [
  'WiFi', 'Surf board rental', 'Wetsuit rental', 'Surf lessons',
  'Pool', 'Air conditioning', 'Breakfast included', 'Airport transfer',
  'Parking', 'Beachfront', 'Kitchen', 'Towels & linens',
]

export default function NewListingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [images, setImages] = useState([''])

  function toggleAmenity(a: string) {
    setSelectedAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)

    const payload = {
      title: fd.get('title'),
      slug: fd.get('slug'),
      description: fd.get('description'),
      location: fd.get('location'),
      pricePerNight: Number(fd.get('pricePerNight')),
      capacity: Number(fd.get('capacity')),
      category: fd.get('category'),
      amenities: selectedAmenities,
      images: images.filter(Boolean),
    }

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create listing')
      setLoading(false)
      return
    }

    router.push('/admin/listings')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display mb-8 text-3xl font-bold text-gray-900">New listing</h1>

      <form onSubmit={handleSubmit} className="card p-8 space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
            <input name="title" required placeholder="Taghazout Surf Camp" className="input-field" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">URL slug</label>
            <input name="slug" required placeholder="taghazout-surf-camp" className="input-field" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
            <select name="category" className="input-field">
              <option value="SURF_CAMP">Surf Camp</option>
              <option value="ROOM">Room</option>
              <option value="VILLA">Villa</option>
              <option value="HOSTEL">Hostel</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Location</label>
            <input name="location" required placeholder="Taghazout, Morocco" className="input-field" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Price per night (€)</label>
            <input name="pricePerNight" type="number" min="1" required placeholder="89" className="input-field" />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Max capacity (guests)</label>
            <input name="capacity" type="number" min="1" required placeholder="6" className="input-field" />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              required
              rows={5}
              placeholder="Describe the place, the vibe, the surf spots nearby…"
              className="input-field resize-none"
            />
          </div>
        </div>

        {/* Images */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Image URLs</label>
          <div className="space-y-2">
            {images.map((img, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={img}
                  onChange={(e) => {
                    const updated = [...images]
                    updated[i] = e.target.value
                    setImages(updated)
                  }}
                  placeholder={`https://images.unsplash.com/…`}
                  className="input-field"
                />
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, j) => j !== i))}
                    className="rounded-xl border border-gray-200 px-3 text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setImages([...images, ''])}
              className="text-sm font-medium text-ocean-600 hover:underline"
            >
              + Add another image
            </button>
          </div>
        </div>

        {/* Amenities */}
        <div>
          <label className="mb-3 block text-sm font-medium text-gray-700">Amenities</label>
          <div className="flex flex-wrap gap-2">
            {AMENITIES_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
                  selectedAmenities.includes(a)
                    ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
          {loading ? 'Creating…' : 'Create listing'}
        </button>
      </form>
    </div>
  )
}
