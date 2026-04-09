'use client'
// file: components/DateRangePicker.tsx
import { useState } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import 'react-day-picker/dist/style.css'

type Props = {
  checkIn?: Date
  checkOut?: Date
  onChange: (checkIn: Date | undefined, checkOut: Date | undefined) => void
  isDateUnavailable?: (date: Date) => boolean
}

export function DateRangePicker({ checkIn, checkOut, onChange, isDateUnavailable }: Props) {
  const [open, setOpen] = useState(false)

  const selected: DateRange | undefined =
    checkIn ? { from: checkIn, to: checkOut } : undefined

  function handleSelect(range: DateRange | undefined) {
    onChange(range?.from, range?.to)
    if (range?.from && range?.to) setOpen(false)
  }

  const displayText = checkIn && checkOut
    ? `${format(checkIn, 'MMM d')} → ${format(checkOut, 'MMM d')}`
    : checkIn
    ? `${format(checkIn, 'MMM d')} → …`
    : 'Select dates'

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm transition hover:border-gray-300 focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
      >
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Check-in</p>
            <p className={`mt-0.5 font-medium ${checkIn ? 'text-gray-900' : 'text-gray-400'}`}>
              {checkIn ? format(checkIn, 'MMM d, yyyy') : 'Add date'}
            </p>
          </div>
          <div className="border-l border-gray-100 pl-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Check-out</p>
            <p className={`mt-0.5 font-medium ${checkOut ? 'text-gray-900' : 'text-gray-400'}`}>
              {checkOut ? format(checkOut, 'MMM d, yyyy') : 'Add date'}
            </p>
          </div>
        </div>
      </button>

      {/* Dropdown calendar */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-40 mt-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
            <DayPicker
              mode="range"
              selected={selected}
              onSelect={handleSelect}
              numberOfMonths={1}
              disabled={isDateUnavailable}
              fromDate={new Date()}
              showOutsideDays={false}
              modifiersClassNames={{
                selected: 'rdp-day_selected',
                range_start: 'rdp-day_range_start',
                range_end: 'rdp-day_range_end',
                range_middle: 'rdp-day_range_middle',
              }}
            />
            {checkIn && (
              <div className="border-t border-gray-100 px-2 pt-2">
                <button
                  onClick={() => { onChange(undefined, undefined); }}
                  className="text-xs text-gray-400 hover:text-gray-700 underline"
                >
                  Clear dates
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
