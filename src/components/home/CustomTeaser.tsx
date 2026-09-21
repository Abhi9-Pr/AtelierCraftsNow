import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { FadeIn } from '@/components/ui/FadeIn'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { routes } from '@/config/nav'

export function CustomTeaser() {
  return (
    <section aria-labelledby="custom-heading">
      <Container size="narrow" spaced>
        <FadeIn className="text-center">
          <TrackedHeading as="p" tracking="widest" size="sm" className="text-ink-soft">
            Custom orders
          </TrackedHeading>
          <h2 id="custom-heading" className="mt-6 text-4xl md:text-5xl">
            A set made to your theme.
          </h2>
          <p className="mt-6 text-ink-soft">
            Bulk orders, bookplate signatures and custom print themes. Bring a place, a story or a
            color, and we will paint it.
          </p>
          <div className="mt-10">
            <Button to={routes.custom} variant="text">
              Start a Request
            </Button>
          </div>
        </FadeIn>
      </Container>
    </section>
  )
}
