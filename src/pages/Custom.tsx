import { DesignNote } from '@/components/form/DesignNote'
import { OrderForm } from '@/components/form/OrderForm'
import { Container } from '@/components/ui/Container'
import { FadeIn } from '@/components/ui/FadeIn'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { brand } from '@/config/brand'
import { pageMeta } from '@/config/pageMeta'
import { useDesignRequest } from '@/hooks/useDesignRequest'
import { useSeo } from '@/hooks/useSeo'

export function Custom() {
  useSeo(pageMeta.custom)
  const design = useDesignRequest()

  return (
    <Container size="narrow" spaced>
      <FadeIn className="text-center">
        <TrackedHeading as="p" tracking="widest" size="sm" className="text-ink-soft">
          Custom orders
        </TrackedHeading>
        <h1 className="mt-6 text-5xl md:text-6xl">Tell us what you have in mind.</h1>
        <p className="mt-6 text-ink-soft">
          Each set is painted by hand, then printed on heavy textured stock. Send a few details
          and we will write back.
        </p>
      </FadeIn>

      {design && (
        <div className="mt-12">
          <DesignNote request={design} />
        </div>
      )}

      <div className="mt-16">
        <OrderForm design={design} />
      </div>

      <p className="mt-16 text-center text-sm text-ink-soft">
        Prefer email? Write to{' '}
        <a href={`mailto:${brand.email}`} className="underline underline-offset-4">
          {brand.email}
        </a>
        .
      </p>
    </Container>
  )
}
