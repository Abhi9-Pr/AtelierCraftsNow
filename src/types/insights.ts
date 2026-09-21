/*
 * What the insights address says to the dashboard. The functions build their answer with these types and the
 * dashboard reads it, so the two cannot drift apart. Kept free of DOM and alias imports so the functions that
 * run on Cloudflare can load it too.
 */

export interface InsightBookmark {
  id: string
  title: string
  /** Design pages left in the period */
  visits: number
  /** Back design requests received in the period */
  requests: number
}

export interface InsightOption {
  /** An option's slug, or none, on, off or own-words */
  key: string
  label: string
  /** Visits that ended with this chosen on purpose */
  picks: number
  /** Back design requests that had it chosen on purpose */
  requested: number
}

export interface InsightGroup {
  slug: string
  label: string
  options: InsightOption[]
}

export interface ApiInsights {
  days: number
  /** The first day counted, as YYYY-MM-DD in UTC */
  since: string
  /** The bookmark the numbers are for, or null for all of them */
  bookmark: string | null
  totals: { visits: number; requests: number; orders: number }
  /** Every bookmark, for choosing which one to look at */
  choices: { id: string; title: string }[]
  bookmarks: InsightBookmark[]
  groups: InsightGroup[]
}
