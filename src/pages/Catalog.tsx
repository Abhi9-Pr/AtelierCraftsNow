import { CatalogGrid } from '@/components/catalog/CatalogGrid'
import { FilterBar } from '@/components/catalog/FilterBar'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { FadeIn } from '@/components/ui/FadeIn'
import { SectionRule } from '@/components/ui/SectionRule'
import { TrackedHeading } from '@/components/ui/TrackedHeading'
import { artTypeLabel, bookmarks, themeLabel } from '@/config/products'
import { routes } from '@/config/nav'
import { pageMeta } from '@/config/pageMeta'
import { artOptions, themeOptions, useCatalogFilter } from '@/hooks/useCatalogFilter'
import { useSeo } from '@/hooks/useSeo'

export function Catalog() {
  useSeo(pageMeta.collection)
  const { theme, art, setTheme, setArt, isVisible } = useCatalogFilter()
  const count = bookmarks.filter(isVisible).length
  // A second bar only earns its place once there is a choice to make between art types.
  const showArtBar = artOptions.length > 2
  const scope = [
    theme === 'all' ? 'all themes' : themeLabel(theme),
    showArtBar ? (art === 'all' ? 'all art types' : artTypeLabel(art)) : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Container spaced>
      <FadeIn className="mx-auto max-w-2xl text-center">
        <TrackedHeading as="p" tracking="widest" size="sm" className="text-ink-soft">
          Collection
        </TrackedHeading>
        <h1 className="mt-6 text-5xl md:text-6xl">Painted on one side. Ruled on the other.</h1>
        <p className="mt-6 text-ink-soft">
          Each bookmark is hand-painted in watercolor and printed on heavy textured stock. The
          reverse is ruled paper for a line or two of your own.
        </p>
      </FadeIn>

      <div className="mb-14 mt-14 space-y-6 md:mb-16">
        <FilterBar
          legend="Filter by theme"
          caption={showArtBar ? 'Theme' : undefined}
          options={themeOptions}
          value={theme}
          onChange={setTheme}
        />
        {showArtBar && (
          <FilterBar legend="Filter by art type" caption="Art type" options={artOptions} value={art} onChange={setArt} />
        )}
      </div>

      <p role="status" className="sr-only">
        {count} {count === 1 ? 'bookmark' : 'bookmarks'} shown, {scope}
      </p>

      {count === 0 && (
        <p className="py-16 text-center font-display text-2xl italic text-ink-soft">
          Nothing here yet.
        </p>
      )}
      <CatalogGrid items={bookmarks} isVisible={isVisible} resetKey={`${theme}/${art}`} />

      <div className="mx-auto mt-24 max-w-md space-y-8 text-center">
        <SectionRule ornament />
        <p className="font-display text-2xl italic">Looking for something else? A set can be painted to order.</p>
        <Button to={routes.custom} variant="text">
          Commission a Set
        </Button>
      </div>
    </Container>
  )
}
