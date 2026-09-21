import {
  BACK_IMAGE_PREFIX,
  DEFAULT_TEXT_LENGTH,
  MAX_TEXT_LENGTH,
  backKinds,
  backSlots,
  choiceModes,
  lineSpacings,
  lineTypes,
  requiredByDefault,
  singleSlots,
  slotsForKind,
  stampAligns,
  stampSizes,
} from '../src/config/backSchema.ts'
import type { BackKind } from '../src/config/backSchema.ts'
import type { BackGroup, BackOption } from '../src/types/index.ts'
import {
  byOrder,
  flag,
  oneOf,
  optionalText,
  pictureExists,
  readEntries,
  requiredOneOf,
  text,
  whole,
  type Entry,
} from './contentFiles.ts'

const GROUPS_DIR = 'content/back-groups'
const OPTIONS_DIR = 'content/back-options'

interface GroupDraft {
  order: number | undefined
  group: BackGroup
  options: { order: number | undefined; option: BackOption }[]
}

const isRequired = (choice: (typeof choiceModes)[number] | undefined, kind: BackKind) =>
  choice === undefined || choice === 'auto' ? requiredByDefault.includes(kind) : choice === 'required'

async function readGroup(root: string, entry: Entry, problems: string[]): Promise<GroupDraft | undefined> {
  const label = text(entry, 'label', problems)
  const kind = requiredOneOf(entry, 'kind', backKinds, problems)
  const slot = requiredOneOf(entry, 'slot', backSlots, problems)
  if (!kind || !slot) return undefined

  const allowed = slotsForKind[kind]
  if (!allowed.includes(slot)) {
    problems.push(`${entry.file}: a "${kind}" category cannot go in the "${slot}" place. It can go in: ${allowed.join(', ')}`)
  }

  const group: BackGroup = {
    slug: entry.slug,
    label,
    kind,
    slot,
    required: isRequired(oneOf(entry, 'choice', choiceModes, problems), kind),
    options: [],
  }
  const hint = optionalText(entry, 'hint', problems)
  if (hint) group.hint = hint

  if (kind === 'text' && flag(entry, 'allowCustomText', false, problems)) {
    const maxLength = whole(entry, 'maxLength', problems) ?? DEFAULT_TEXT_LENGTH
    if (maxLength < 1 || maxLength > MAX_TEXT_LENGTH) {
      problems.push(`${entry.file}: "maxLength" must be between 1 and ${MAX_TEXT_LENGTH}`)
    }
    group.allowCustomText = true
    group.maxLength = maxLength
  }
  if (kind === 'toggle') {
    group.defaultOn = flag(entry, 'defaultOn', false, problems)
    const priceINR = whole(entry, 'priceINR', problems)
    if (priceINR !== undefined) group.priceINR = priceINR
    const image = optionalText(entry, 'image', problems)
    if (image) {
      if (!(await pictureExists(root, image, BACK_IMAGE_PREFIX))) {
        problems.push(`${entry.file}: the picture "${image}" is not in public/back`)
      }
      group.image = image
      group.size = oneOf(entry, 'size', stampSizes, problems) ?? 'medium'
      group.align = oneOf(entry, 'align', stampAligns, problems) ?? 'center'
    } else if (slot !== 'signature') {
      problems.push(`${entry.file}: an on/off switch with no picture draws the Date and Signed lines, which belong in the "signature" place`)
    }
  }
  if (kind === 'stamp') {
    group.size = oneOf(entry, 'size', stampSizes, problems) ?? 'medium'
    group.align = oneOf(entry, 'align', stampAligns, problems) ?? 'center'
  }
  return { order: whole(entry, 'order', problems), group, options: [] }
}

/** Fills in the fields a choice needs for its category's kind, and reports what is missing. */
async function readOption(
  root: string,
  entry: Entry,
  draft: GroupDraft,
  problems: string[],
): Promise<BackOption | undefined> {
  const { group } = draft
  const option: BackOption = { slug: entry.slug, label: text(entry, 'label', problems) }
  const image = optionalText(entry, 'image', problems)
  if (image && !(await pictureExists(root, image, BACK_IMAGE_PREFIX))) {
    problems.push(`${entry.file}: the picture "${image}" is not in public/back`)
  }

  if (group.kind === 'toggle') {
    problems.push(`${entry.file}: "${group.label}" is an on/off switch, so it has no choices. Delete this choice`)
    return undefined
  }
  if (group.kind === 'stamp' && !image) problems.push(`${entry.file}: "${group.label}" needs a picture for this choice`)
  if (group.kind === 'text') option.text = text(entry, 'text', problems)
  if (group.kind === 'lines') {
    const lineType = requiredOneOf(entry, 'lineType', lineTypes, problems)
    if (lineType) {
      option.lineType = lineType
      option.spacing = oneOf(entry, 'spacing', lineSpacings, problems) ?? 'regular'
      if (lineType === 'custom' && !image) problems.push(`${entry.file}: a "custom" line type needs a picture to repeat as the pattern`)
    }
  }

  const keepsImage = group.kind === 'template' || group.kind === 'stamp' || option.lineType === 'custom'
  if (image && keepsImage) option.image = image
  const priceINR = whole(entry, 'priceINR', problems)
  if (priceINR !== undefined) option.priceINR = priceINR
  return flag(entry, 'available', true, problems) ? option : undefined
}

/**
 * Reads the categories a visitor can choose from for the back of a bookmark,
 * and the choices inside each. A category with no choices yet stays out of the
 * result, the way an empty theme does, so it can be prepared before it shows.
 */
export async function loadBack(root: string, problems: string[]): Promise<BackGroup[]> {
  const drafts = new Map<string, GroupDraft>()
  for (const entry of await readEntries(root, GROUPS_DIR, problems)) {
    const draft = await readGroup(root, entry, problems)
    if (draft) drafts.set(entry.slug, draft)
  }

  for (const entry of await readEntries(root, OPTIONS_DIR, problems)) {
    const groupSlug = text(entry, 'group', problems)
    const draft = drafts.get(groupSlug)
    if (groupSlug && !draft) {
      const known = [...drafts.keys()].join(', ') || 'none'
      problems.push(`${entry.file}: category "${groupSlug}" does not exist. Categories are: ${known}`)
    }
    if (!draft) continue
    const order = whole(entry, 'order', problems)
    const option = await readOption(root, entry, draft, problems)
    if (option) draft.options.push({ order, option })
  }

  const live = [...drafts.values()]
    .filter(({ group, options }) => group.kind === 'toggle' || options.length > 0)
    .sort((a, b) => byOrder(a, b) || a.group.label.localeCompare(b.group.label))

  for (const slot of singleSlots) {
    const sharing = live.filter(({ group }) => group.slot === slot).map(({ group }) => `"${group.label}"`)
    if (sharing.length > 1) {
      problems.push(`Back categories ${sharing.join(' and ')} both use the "${slot}" place, which holds only one. Move one to another place, or remove its choices`)
    }
  }

  const plainSwitches = live.filter(({ group }) => group.kind === 'toggle' && !group.image).map(({ group }) => `"${group.label}"`)
  if (plainSwitches.length > 1) {
    problems.push(`Back categories ${plainSwitches.join(' and ')} are both on/off switches with no picture, so both would draw the Date and Signed lines. Give one a picture, or remove one`)
  }

  return live.map(({ group, options }) => ({
    ...group,
    options: options
      .sort((a, b) => byOrder(a, b) || a.option.label.localeCompare(b.option.label))
      .map(({ option }) => option),
  }))
}
