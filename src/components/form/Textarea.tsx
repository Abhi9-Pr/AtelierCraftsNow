import { controlClass, FieldFrame } from './Field'

interface TextareaProps {
  name: string
  label: string
  value: string
  error: string | undefined
  onChange: (value: string) => void
  onBlur: () => void
  hint?: string
  rows?: number
}

export function Textarea({
  name,
  label,
  value,
  error,
  onChange,
  onBlur,
  hint,
  rows = 5,
}: TextareaProps) {
  return (
    <FieldFrame label={label} hint={hint} error={error}>
      {(control) => (
        <textarea
          {...control}
          name={name}
          value={value}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className={`${controlClass} resize-y px-0 leading-relaxed text-ink`}
        />
      )}
    </FieldFrame>
  )
}
