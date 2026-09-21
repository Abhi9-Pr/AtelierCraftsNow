import { stat } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import type { Content } from '../src/types/index.ts'

type Role = 'picture' | 'stamp' | 'pattern'

interface Target {
  file: string
  role: Role
}

/** 50 mm at 300 dpi is about 591 px, so anything narrower prints soft. */
const MIN_PRINT_WIDTH = 591
const TALL_RATIO = 1 / 3
const RATIO_TOLERANCE = 0.02
const KB = 1024
const MAX_BYTES: Record<Role, number> = { picture: 300 * KB, stamp: 200 * KB, pattern: 100 * KB }
const TRANSPARENT_FORMATS = new Set(['png', 'webp', 'svg', 'gif'])

function collectTargets(content: Content): Target[] {
  const targets = new Map<string, Role>()
  for (const bookmark of content.bookmarks) targets.set(bookmark.artwork, 'picture')
  for (const group of content.back) {
    if (group.image) targets.set(group.image, 'stamp')
    for (const option of group.options) {
      if (!option.image) continue
      if (group.kind === 'template') targets.set(option.image, 'picture')
      else if (group.kind === 'stamp') targets.set(option.image, 'stamp')
      else targets.set(option.image, 'pattern')
    }
  }
  return [...targets].map(([file, role]) => ({ file, role }))
}

async function checkOne(root: string, { file, role }: Target): Promise<string[]> {
  const location = path.join(root, 'public', file)
  const notes: string[] = []
  try {
    const bytes = (await stat(location)).size
    const { width, height, format } = await sharp(location).metadata()
    if (bytes > MAX_BYTES[role]) {
      notes.push(`is ${Math.round(bytes / KB)} KB. Aim for ${Math.round(MAX_BYTES[role] / KB)} KB or less, because large files slow the page down`)
    }
    if (role === 'picture' && width && height) {
      if (Math.abs(width / height - TALL_RATIO) > RATIO_TOLERANCE) {
        notes.push(`is ${width} x ${height} px. Bookmark pictures are a tall 1:3 portrait, 600 x 1800 px, and other shapes are cropped to fit`)
      }
      if (width < MIN_PRINT_WIDTH) notes.push(`is only ${width} px wide, which prints soft. Aim for 600 px or more`)
    }
    if (role === 'stamp' && format && !TRANSPARENT_FORMATS.has(format)) {
      notes.push(`is a ${format.toUpperCase()}, which has no transparent background. Use a PNG or SVG so only the drawing shows`)
    }
  } catch {
    notes.push('could not be read as a picture. Check the file is not damaged')
  }
  return notes.map((note) => `${file} ${note}`)
}

/**
 * Looks at every picture the content uses and describes the ones that are
 * the wrong shape, too heavy or unreadable. These are advice only: they never
 * stop a build, because a slightly wrong picture is better than a change that
 * cannot be published.
 */
export async function checkImages(root: string, content: Content): Promise<string[]> {
  const results = await Promise.all(collectTargets(content).map((target) => checkOne(root, target)))
  return results.flat()
}
