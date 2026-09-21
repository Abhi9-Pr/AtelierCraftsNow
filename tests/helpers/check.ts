import assert from 'node:assert/strict'
import { test } from 'node:test'

/**
 * One check: a sentence that says what should be true, and whether it is. The longer tests work out a
 * result step by step and then state it here, so a failing line reads as the sentence that broke.
 */
export function check(label: string, ok: boolean | undefined, detail = ''): void {
  test(label, () => {
    assert.ok(ok === true, detail === '' ? label : `${label}: ${detail}`)
  })
}
