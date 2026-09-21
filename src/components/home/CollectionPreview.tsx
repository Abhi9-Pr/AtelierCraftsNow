import { CatalogGrid } from '@/components/catalog/CatalogGrid'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { FadeIn } from '@/components/ui/FadeIn'
import { SectionRule } from '@/components/ui/SectionRule'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { routes } from '@/config/nav'
import { featuredBookmarks } from '@/config/products'

const showAll = () => true

export function CollectionPreview() {
  return (
    <section aria-labelledby="preview-heading">
      <Container className="pb-section">
        <SectionRule className="mb-16 md:mb-24" />
        <FadeIn className="mb-14 text-center">
          <TrackedHeading as="p" tracking="widest" size="sm" className="text-ink-soft">
            Collection
          </TrackedHeading>
          <h2 id="preview-heading" className="mt-6 text-4xl md:text-5xl">
            Three to begin with.
          </h2>
        </FadeIn>

        <CatalogGrid items={featuredBookmarks} isVisible={showAll} resetKey="home" headingLevel={3} />

        <div className="mt-16 text-center">
          <Button to={routes.collection} variant="text">
            View all
          </Button>
        </div>
      </Container>
    </section>
  )
}
