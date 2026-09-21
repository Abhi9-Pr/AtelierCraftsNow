import { useEffect } from 'react'
import { headTags, type PageMeta } from '@/config/seo'

/**
 * Keeps the tab title and head tags in step with the current route. The
 * static HTML shells already carry the right tags for a first load; this
 * covers navigation inside the app.
 */
export function useSeo(meta: PageMeta): void {
  useEffect(() => {
    document.title = meta.title
    document.head.querySelectorAll('[data-seo]').forEach((node) => node.remove())

    for (const { tag, attrs, text } of headTags(meta)) {
      const element = document.createElement(tag)
      for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value)
      element.setAttribute('data-seo', '')
      if (text) element.textContent = text
      document.head.append(element)
    }
  }, [meta])
}
