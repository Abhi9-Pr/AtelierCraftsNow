/** A spreadsheet reads a cell that starts with one of these as a formula, so it is written as text instead. */
const FORMULA_START = /^[=+\-@\t\r]/

/** One CSV cell. Quoted always, with a leading apostrophe on anything a spreadsheet could run as a formula. */
export function csvCell(value: string | number | null): string {
  if (value === null) return ''
  const text = typeof value === 'number' ? String(value) : FORMULA_START.test(value) ? `'${value}` : value
  return `"${text.replace(/"/g, '""')}"`
}

/**
 * Rows as CSV text. It starts with a byte order mark so Excel reads it as UTF-8 (rupee signs and accented
 * names survive), and uses CRLF line ends as the format asks.
 */
export const toCsv = (rows: readonly (readonly (string | number | null)[])[]): string =>
  `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
