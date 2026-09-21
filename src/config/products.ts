import content from 'virtual:content'
import type { ArtType, BackGroup, Bookmark, Theme } from '../types'
import { pickFeatured } from './featured'

/*
 * The themes, art types and bookmarks are not written here. They are read from the
 * content folder at build time (see vite/content.ts) and edited through the
 * admin panel at /admin, or by hand. This module only exposes them.
 */
export const themes: readonly Theme[] = content.themes

export const artTypes: readonly ArtType[] = content.artTypes

export const backGroups: readonly BackGroup[] = content.back

export const bookmarks: readonly Bookmark[] = content.bookmarks

export const featuredBookmarks: readonly Bookmark[] = pickFeatured(bookmarks)

export function themeLabel(slug: string): string {
  return themes.find((theme) => theme.slug === slug)?.label ?? slug
}

export function artTypeLabel(slug: string): string {
  return artTypes.find((artType) => artType.slug === slug)?.label ?? slug
}
