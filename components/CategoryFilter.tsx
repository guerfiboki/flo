'use client'
// file: components/CategoryFilter.tsx
import { useRouter, useSearchParams } from 'next/navigation'

const CATEGORIES = [
  { value: 'ALL', label: 'All', emoji: '🌊' },
  { value: 'SURF_CAMP', label: 'Surf Camps', emoji: '🏄' },
  { value: 'ROOM', label: 'Rooms', emoji: '🛏' },
  { value: 'VILLA', label: 'Villas', emoji: '🏡' },
  { value: 'HOSTEL', label: 'Hostels', emoji: '🏠' },
]

export function CategoryFilter({ current }: { current: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setCategory(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'ALL') {
      params.delete('category')
    } else {
      params.set('category', value)
    }
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => {
        const isActive = current === cat.value || (current === 'ALL' && cat.value === 'ALL')
        return (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'border-ocean-500 bg-ocean-50 text-ocean-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        )
      })}
    </div>
  )
}
