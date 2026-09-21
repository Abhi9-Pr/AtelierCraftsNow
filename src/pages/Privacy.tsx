import { Container } from '@/components/ui/Container'
import { FadeIn } from '@/components/ui/FadeIn'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { pageMeta } from '@/config/pageMeta'
import { privacySections } from '@/config/privacy'
import { useSeo } from '@/hooks/useSeo'

/** What the site was built to use decides which services the notice describes. */
const sections = privacySections({
  spamCheck: Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY),
  visitorCounting: Boolean(import.meta.env.VITE_WEB_ANALYTICS_TOKEN),
})

/** A heading as a value that is safe in an id: no spaces, so the section can be named by it. */
const slug = (heading: string): string => heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')

export function Privacy() {
  useSeo(pageMeta.privacy)

  return (
    <Container size="narrow" spaced>
      <FadeIn className="text-center">
        <TrackedHeading as="p" tracking="widest" size="sm" className="text-ink-soft">
          Privacy
        </TrackedHeading>
        <h1 className="mt-6 text-5xl md:text-6xl">What we do with your details.</h1>
      </FadeIn>

      <div className="mt-16 space-y-12">
        {sections.map((section) => (
          <section key={section.heading} aria-labelledby={`privacy-${slug(section.heading)}`}>
            <h2 id={`privacy-${slug(section.heading)}`} className="text-3xl">
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4 text-ink-soft">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Container>
  )
}
