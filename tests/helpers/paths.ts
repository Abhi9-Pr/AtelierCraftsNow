import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/** The project folder. */
export const ROOT = resolve(import.meta.dirname, '../..')

/** A folder for one test's scratch files, inside the computer's temporary folder, never in the project. */
export const scratch = (name: string): string => join(tmpdir(), 'atelier-tests', name)
