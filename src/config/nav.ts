export const routes = {
  home: '/',
  collection: '/collection',
  custom: '/custom',
  privacy: '/privacy',
  story: '/#story',
} as const

/** The page where a visitor designs the back of one bookmark. */
export const designPath = (bookmarkId: string) => `/design/${bookmarkId}`

export interface NavItem {
  label: string
  to: string
}

export const navItems: readonly NavItem[] = [
  { label: 'Collection', to: routes.collection },
  { label: 'Custom Orders', to: routes.custom },
  { label: 'Our Story', to: routes.story },
]

/** Hash links point into a page rather than at one, so they are never "current". */
export function isCurrent(pathname: string, item: NavItem): boolean {
  return !item.to.includes('#') && pathname === item.to
}
