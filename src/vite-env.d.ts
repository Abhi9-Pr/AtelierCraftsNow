/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Web3Forms public access key. Safe to ship in the browser by design. */
  readonly VITE_FORM_ACCESS_KEY?: string
  /** Formspree form id, only used if the Formspree relay module is selected. */
  readonly VITE_FORMSPREE_FORM_ID?: string
  /** Cloudflare Turnstile site key. Public by design. Turns on the spam check in the request form. */
  readonly VITE_TURNSTILE_SITE_KEY?: string
  /** Cloudflare Web Analytics site token. Public by design. Adds the visitor-counting script to the built pages. */
  readonly VITE_WEB_ANALYTICS_TOKEN?: string
}

/** The themes, art types and bookmarks read from the content folder at build time. */
declare module 'virtual:content' {
  const content: import('./types').Content
  export default content
}

/** Generated at build time for each file in public/artwork, keyed by its public path. */
declare module 'virtual:artwork-assets' {
  interface ArtworkAsset {
    /** 16px blurred stand-in, as a data URI */
    placeholder: string
    /** srcset listing the 300 and 600 px WebP variants */
    srcSet: string
  }
  const assets: Readonly<Record<string, ArtworkAsset>>
  export default assets
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
