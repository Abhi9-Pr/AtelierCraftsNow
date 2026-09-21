import { CollectionPreview } from '@/components/home/CollectionPreview'
import { CustomTeaser } from '@/components/home/CustomTeaser'
import { Hero } from '@/components/home/Hero'
import { ObjectSection } from '@/components/home/ObjectSection'
import { StorySection } from '@/components/home/StorySection'
import { pageMeta } from '@/config/pageMeta'
import { featuredBookmarks } from '@/config/products'
import { useSeo } from '@/hooks/useSeo'

export function Home() {
  useSeo(pageMeta.home)

  return (
    <>
      <Hero bookmark={featuredBookmarks[0]} />
      <ObjectSection />
      <CollectionPreview />
      <StorySection />
      <CustomTeaser />
    </>
  )
}
