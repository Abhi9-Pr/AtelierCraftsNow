import { FieldFrame, controlClass } from '@/components/form/Field'

interface OwnWordsProps {
  name: string
  value: string
  maxLength: number
  onChange: (text: string) => void
}

/** A box for the visitor's own words, with the limit shown. They are printed in capitals. */
export function OwnWords({ name, value, maxLength, onChange }: OwnWordsProps) {
  return (
    <FieldFrame
      label="Or type your own words"
      hint={`Up to ${maxLength} characters, printed in capitals. ${value.length} of ${maxLength} used.`}
      error={undefined}
    >
      {(control) => (
        <input
          {...control}
          name={name}
          type="text"
          value={value}
          maxLength={maxLength}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          className={`${controlClass} px-0 text-ink`}
        />
      )}
    </FieldFrame>
  )
}
