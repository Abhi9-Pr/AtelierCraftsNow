import { cx } from '@/lib/cx'
import { controlClass, FieldFrame } from './Field'

interface SelectProps {
  name: string
  label: string
  value: string
  error: string | undefined
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
  onBlur: () => void
  required?: boolean
}

export function Select({
  name,
  label,
  value,
  error,
  options,
  onChange,
  onBlur,
  required = false,
}: SelectProps) {
  return (
    <FieldFrame label={label} required={required} error={error}>
      {(control) => (
        <div className="relative">
          <select
            {...control}
            name={name}
            value={value}
            required={required}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            className={cx(
              controlClass,
              'cursor-pointer appearance-none pl-0 pr-8',
              value === '' ? 'text-ink-soft' : 'text-ink',
            )}
          >
            <option value="" disabled>
              Choose one
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value} className="text-ink">
                {option.label}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 10 6"
            className="pointer-events-none absolute right-1 top-1/2 h-1.5 w-2.5 -translate-y-1/2 text-ink-soft"
          >
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
      )}
    </FieldFrame>
  )
}
