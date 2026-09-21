import { Container } from '@/components/ui/Container'
import { FadeIn } from '@/components/ui/FadeIn'
import { SectionRule } from '@/components/ui/SectionRule'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { brand } from '@/config/brand'

export function StorySection() {
  return (
    <section id="story" aria-labelledby="story-heading" className="bg-parchment">
      <Container size="narrow" spaced>
        <FadeIn>
          <TrackedHeading as="p" tracking="widest" size="sm" className="text-center text-ink-soft">
            Our story
          </TrackedHeading>
          <h2 id="story-heading" className="mt-6 text-center text-4xl md:text-5xl">
            Painted by hand, in a small studio.
          </h2>
          <SectionRule ornament className="my-10" />
          <div className="space-y-6 text-lg leading-relaxed text-ink-soft">
            <p>
              We paint every front in watercolor. We work small and in thin layers. The paint
              pools where we hurry and dries flat where we wait. The painting is printed on heavy
              textured stock. It is thick enough to hold a page and rough enough to feel like
              paper.
            </p>
            <p>
              The back is the part we care about most. It is ruled and mostly empty. Write a line
              from a chapter, a date, or the name of whoever lent you the book.
            </p>
            <p>
              {brand.name} is a small studio. {brand.taglines.secondary} is the line we wrote
              under the first sketch, and it stayed. Everything here is made for people who read
              slowly and leave notes in the margins.
            </p>
          </div>
        </FadeIn>
      </Container>
    </section>
  )
}
