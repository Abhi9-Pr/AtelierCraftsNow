import type { BackGroup } from '../../types/index.ts'
import type { BackDesign } from './resolveBack.ts'

/** What a visitor set on purpose in one category. */
export interface Pick {
  group: string
  /** An option's slug, or one of the four words below */
  option: string
}

export const NONE = 'none'
export const ON = 'on'
export const OFF = 'off'
export const OWN_WORDS = 'own-words'

/** How the words that stand in for an option read to a person. */
export const pickWords: Readonly<Record<string, string>> = { [NONE]: 'None', [ON]: 'On', [OFF]: 'Off', [OWN_WORDS]: 'Own words' }

/**
 * The choices a design holds on purpose, one line for each: a picked option, "none" where a category allows
 * that, on or off for a switch, and "own words" when the visitor typed some. The words themselves are not
 * part of it. A category the visitor never touched is left out, so a starting value is not counted as a
 * choice. A choice that no longer exists in the catalog is left out too.
 */
export function designPicks(groups: readonly BackGroup[], design: BackDesign): Pick[] {
  const picks: Pick[] = []
  for (const group of groups) {
    const selection = design[group.slug]
    if (!selection) continue

    if (group.kind === 'toggle') {
      if (selection.on !== undefined) picks.push({ group: group.slug, option: selection.on ? ON : OFF })
      continue
    }
    if (selection.option === '' && !group.required) picks.push({ group: group.slug, option: NONE })
    else if (selection.option !== undefined && group.options.some((option) => option.slug === selection.option)) {
      picks.push({ group: group.slug, option: selection.option })
    }
    if (group.allowCustomText && selection.text?.trim()) picks.push({ group: group.slug, option: OWN_WORDS })
  }
  return picks
}
