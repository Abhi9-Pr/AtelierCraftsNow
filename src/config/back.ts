import { resolveBack, type BackRender } from '../lib/back/resolveBack'
import type { Bookmark } from '../types'
import { backGroups } from './products'

/**
 * The back a bookmark shows on the site: its own heading and Date and Signed
 * setting, and the first choice of each category the site offers. The
 * visitor's own choices are applied on top of this in the design page.
 */
export const backFor = (bookmark: Bookmark): BackRender => resolveBack(backGroups, {}, bookmark)
