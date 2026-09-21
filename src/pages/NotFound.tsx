import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { SectionRule } from '@/components/ui/SectionRule'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { routes } from '@/config/nav'
import { pageMeta } from '@/config/pageMeta'
import { useSeo } from '@/hooks/useSeo'

export function NotFound() {
  useSeo(pageMeta.notFound)

  return (
    <Container size="narrow" spaced className="text-center md:py-32">
      <TrackedHeading as="p" tracking="widest" size="sm" className="text-ink-soft">
        Error 404
      </TrackedHeading>
      <h1 className="mt-6 text-5xl md:text-6xl">This page has wandered off.</h1>
      <SectionRule ornament className="mx-auto my-10 max-w-xs" />
      <p className="mx-auto max-w-md text-ink-soft">
        The address may have changed, or it may never have existed. The collection and the home
        page are both close by.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        <Button to={routes.collection}>See the Collection</Button>
        <Button to={routes.home} variant="text">
          Back to Home
        </Button>
      </div>
    </Container>
  )
}
