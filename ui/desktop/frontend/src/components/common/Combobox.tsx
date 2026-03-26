import { useState, useRef, useEffect } from 'react'

interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  loading?: boolean
  allowCustom?: boolean
  disabled?: boolean
}

export function Combobox({ value, onChange, options, placeholder, loading, allowCustom = true, disabled }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.value.toLowerCase().includes(search.toLowerCase())
  )

  const displayValue = options.find((o) => o.value === value)?.label || value

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (val: string) => {
    onChange(val)
    setSearch('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={open ? search : displayValue}
        onChange={(e) => { setSearch(e.target.value); if (allowCustom) onChange(e.target.value) }}
        onFocus={() => { setOpen(true); setSearch('') }}
        placeholder={loading ? 'Loading...' : placeholder}
        disabled={disabled || loading}
        className="w-full bg-surface-tertiary border border-border rounded-lg px-3 py-2.5 text-base md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
      />
      {/* Dropdown chevron */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </div>

      {open && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto bg-surface-secondary border border-border rounded-lg shadow-lg py-1"
        >
          {filtered.map((o) => (
            <button
              key={o.value}
              onClick={() => handleSelect(o.value)}
              className={[
                'w-full text-left px-3 py-1.5 text-sm hover:bg-surface-tertiary transition-colors',
                o.value === value ? 'text-accent font-medium' : 'text-text-primary',
              ].join(' ')}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
