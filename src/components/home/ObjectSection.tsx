import { Container } from '@/components/ui/Container'
import { FadeIn } from '@/components/ui/FadeIn'
import { TrackedHeading } from '@/components/ui/TrackedHeading'

interface SideProps {
  label: string
  title: string
  children: string
}

function Side({ label, title, children }: SideProps) {
  return (
    <div>
      <TrackedHeading as="p" tracking="wider" size="sm" className="text-ink-soft">
        {label}
      </TrackedHeading>
      <h3 className="mt-4 text-3xl md:text-4xl">{title}</h3>
      <p className="mt-5 leading-relaxed text-ink-soft">{children}</p>
    </div>
  )
}

export function ObjectSection() {
  return (
    <section aria-labelledby="object-heading">
      <Container spaced>
        <FadeIn className="mx-auto max-w-2xl text-center">
          <TrackedHeading as="p" tracking="widest" size="sm" className="text-ink-soft">
            The object
          </TrackedHeading>
          <h2 id="object-heading" className="mt-6 text-4xl md:text-5xl">
            Two sides, one bookmark.
          </h2>
          <p className="mt-6 text-ink-soft">
            Each one measures 50 by 150 millimetres and is printed on both faces.
          </p>
        </FadeIn>

        <div className="mt-16 grid gap-14 md:grid-cols-2 md:gap-0 md:divide-x md:divide-linen">
          <FadeIn className="md:pr-16">
            <Side label="Side A" title="Watercolor">
              The front is a painting: a dragon, a castle, a stretch of mist or a moon. It is
              painted by hand, then printed on heavy textured stock. One short line of text sits
              low on the page.
            </Side>
          </FadeIn>
          <FadeIn delay={120} className="md:pl-16">
            <Side label="Side B" title="Ruled paper">
              The back is made for writing. A tracked header, faint ruled lines and a small mark
              at the foot. Write the page number, a line you liked, the date. Some sets add a
              line for a signature.
            </Side>
          </FadeIn>
        </div>
      </Container>
    </section>
  )
}
