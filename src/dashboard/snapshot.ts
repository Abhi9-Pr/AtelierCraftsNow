import type { DesignSnapshot } from '@/types/orders'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown): value is string => typeof value === 'string'
const isPieces = (value: unknown): boolean => Array.isArray(value) && value.every(isRecord)

/**
 * The stored design, if it has the shape the page needs to draw it. An order whose snapshot is damaged
 * or from a much older version still opens, and shows its plain-text design instead of a picture.
 */
export function readSnapshot(value: unknown): DesignSnapshot | null {
  if (!isRecord(value) || value.version !== 1) return null
  const { render, lines, price } = value
  if (!isText(value.text) || !isText(value.link) || !isText(value.bookmarkTitle)) return null
  if (!Array.isArray(lines) || !lines.every((line) => isRecord(line) && isText(line.label) && isText(line.value))) return null
  if (!isRecord(price) || typeof price.extras !== 'number') return null
  if (!isRecord(render) || !isText(render.heading) || !isRecord(render.lines) || !isText(render.lines.type) || !isText(render.lines.spacing)) return null
  if (!isPieces(render.signature) || !isPieces(render.footer) || !isPieces(render.corner)) return null
  return value as unknown as DesignSnapshot
}
