import { Button } from '@/components/ui/Button'

interface SubmitButtonProps {
  busy: boolean
}

export function SubmitButton({ busy }: SubmitButtonProps) {
  return (
    <Button type="submit" busy={busy}>
      {busy ? 'Sending' : 'Send Request'}
    </Button>
  )
}
