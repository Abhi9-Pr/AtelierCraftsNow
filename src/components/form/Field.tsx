import { useId, type ReactNode } from 'react'
import { TrackedHeading } from '@/components/ui/TrackedHeading'

/*
 * Bottom hairline only. Colour and horizontal padding are set per control.
 * Resting, the line is ink-soft at 60%, which keeps the control identifiable
 * (3:1 against the paper). Focus or an error thickens it to 2px in clay,
 * using a shadow so nothing shifts.
 */
export const controlClass =
  'block w-full border-0 border-b border-ink-soft/60 bg-transparent py-3 font-body text-base outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-soft/70 focus:border-clay focus:shadow-[0_1px_0_0_var(--color-clay)] aria-invalid:border-clay aria-invalid:shadow-[0_1px_0_0_var(--color-clay)] motion-reduce:transition-none'

/** The props a control needs to be wired to its label, hint and error. */
export interface ControlProps {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

interface FieldFrameProps {
  label: string
  required?: boolean
  hint?: string
  error: string | undefined
  children: (control: ControlProps) => ReactNode
}

/** Label, optional hint, control, and an error region shared by every field. */
export function FieldFrame({ label, required = false, hint, error, children }: FieldFrameProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className="pb-6">
      <label htmlFor={id} className="block">
        <TrackedHeading as="span" tracking="wider" size="sm" className="text-ink-soft">
          {label}
          {required && <span aria-hidden="true">*</span>}
        </TrackedHeading>
      </label>
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {/* The error is positioned over space the field already reserves (pb-6 plus the form gap).
          If it pushed content down instead, a Send button under the pointer would move between
          mousedown and mouseup, and the click would be lost. */}
      <div className="relative">
        {children({
          id,
          'aria-describedby': describedBy || undefined,
          'aria-invalid': error ? true : undefined,
        })}
        <div id={errorId} aria-live="polite" className="absolute inset-x-0 top-full">
          {error && (
            <p className="mt-2 flex items-start gap-2 text-sm text-ink">
              <span aria-hidden="true" className="mt-2 size-1 shrink-0 bg-clay" />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface FieldProps {
  name: string
  label: string
  value: string
  error: string | undefined
  onChange: (value: string) => void
  onBlur: () => void
  type?: 'text' | 'email' | 'url' | 'number'
  required?: boolean
  hint?: string
  autoComplete?: string
  inputMode?: 'text' | 'email' | 'url' | 'numeric'
}

export function Field({
  name,
  label,
  value,
  error,
  onChange,
  onBlur,
  type = 'text',
  required = false,
  hint,
  autoComplete,
  inputMode,
}: FieldProps) {
  return (
    <FieldFrame label={label} required={required} hint={hint} error={error}>
      {(control) => (
        <input
          {...control}
          name={name}
          type={type}
          value={value}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          min={type === 'number' ? 1 : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className={`${controlClass} px-0 text-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        />
      )}
    </FieldFrame>
  )
}
