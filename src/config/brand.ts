/**
 * Every brand-specific string lives here. Components import from this
 * module; nothing brand-specific is hardcoded elsewhere. Changing the
 * domain means changing the one `domain` line below.
 */
const domain = 'ateliercraftsnow.co.in'

export const brand = {
  name: 'ATELIER CRAFTS NOW',
  secondaryName: 'Studio ATELIER CRAFTS NOW',
  taglines: {
    primary: 'Tales & Thoughts',
    secondary: 'Crafted for Dreamers',
  },
  domain,
  siteUrl: `https://${domain}`,
  email: 'info@ateliercraftsnow.co.in',
  /** Low-opacity text printed at the foot of Side B */
  watermark: 'ATELIER CRAFTS NOW',
  social: {
    instagram: {
      label: 'Instagram',
      handle: '@apatelier',
      url: 'https://www.instagram.com/abhi9_3110?stkn=ODJrb3BjMHVvMzl0',
    },
    pinterest: {
      label: 'Pinterest',
      handle: 'apatelier',
      url: 'https://www.pinterest.com/ateliercraftsnow',
    },
  },
} as const
