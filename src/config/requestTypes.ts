import type { RequestType } from '../types'

export const requestTypes: readonly { value: RequestType; label: string }[] = [
  { value: 'bulk', label: 'Bulk order' },
  { value: 'bookplate', label: 'Custom bookplate signature' },
  { value: 'print-theme', label: 'Custom print theme' },
  { value: 'back-design', label: 'Custom back design' },
  { value: 'other', label: 'Something else' },
]

export function requestTypeLabel(value: RequestType): string {
  return requestTypes.find((type) => type.value === value)?.label ?? value
}
