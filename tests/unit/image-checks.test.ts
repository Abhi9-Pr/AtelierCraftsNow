import { join } from 'node:path'
import { check } from '../helpers/check.ts'
import { ROOT, scratch } from '../helpers/paths.ts'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { checkImages } from '../../vite/imageChecks.ts'

const sharp = createRequire(join(ROOT, 'package.json'))('sharp')
const WORK = scratch('img-root')

rmSync(WORK, { recursive: true, force: true })
mkdirSync(`${WORK}/public/artwork`, { recursive: true })
mkdirSync(`${WORK}/public/back`, { recursive: true })

const flat = (w: number, h: number, colour = '#F1EBE1') => sharp({ create: { width: w, height: h, channels: 3, background: colour } })
const noise = (w: number, h: number) => {
  const raw = randomBytes(w * h * 3)
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } })
}

await flat(600, 1800).jpeg({ quality: 80 }).toFile(`${WORK}/public/artwork/good.jpg`)
await noise(1500, 1500).png().toFile(`${WORK}/public/artwork/square.png`)
await noise(1200, 3600).jpeg({ quality: 95 }).toFile(`${WORK}/public/artwork/heavy.jpg`)
await flat(300, 900).jpeg().toFile(`${WORK}/public/artwork/small.jpg`)
writeFileSync(`${WORK}/public/artwork/broken.jpg`, 'not a picture')
await flat(600, 1800).jpeg().toFile(`${WORK}/public/back/template-good.jpg`)
await flat(600, 600).jpeg().toFile(`${WORK}/public/back/template-square.jpg`)
await flat(120, 60).jpeg().toFile(`${WORK}/public/back/stamp-photo.jpg`)
await noise(300, 300).png().toFile(`${WORK}/public/back/stamp-heavy.png`)
await flat(120, 60).png().toFile(`${WORK}/public/back/stamp-ok.png`)
writeFileSync(`${WORK}/public/back/stamp-ok.svg`, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M1 1L9 9"/></svg>')
await noise(400, 400).png().toFile(`${WORK}/public/back/pattern-heavy.png`)

const bookmark = (artwork: string) => ({ id: artwork, title: 't', theme: 't', artwork, artworkAlt: 'a', quote: 'q', headerText: 'h', description: 'd', available: true })
const group = (kind: string, slot: string, images: string[]) => ({
  slug: kind, label: kind, kind, slot, required: false,
  options: images.map((image) => ({ slug: image, label: image, image })),
})

const advice = await checkImages(WORK, {
  themes: [], artTypes: [],
  bookmarks: ['good.jpg', 'square.png', 'heavy.jpg', 'small.jpg', 'broken.jpg', 'missing.jpg'].map((f) => bookmark(`/artwork/${f}`)),
  back: [
    group('template', 'background', ['/back/template-good.jpg', '/back/template-square.jpg']),
    group('stamp', 'footer', ['/back/stamp-photo.jpg', '/back/stamp-heavy.png', '/back/stamp-ok.png', '/back/stamp-ok.svg']),
    group('lines', 'lines', ['/back/pattern-heavy.png']),
  ],
} as never)

const about = (file: string) => advice.filter((a) => a.startsWith(file + ' '))
check('a 600 x 1800 JPEG of normal weight gets no advice', about('/artwork/good.jpg').length === 0, about('/artwork/good.jpg').join())
check('a square picture is told it will be cropped', about('/artwork/square.png').some((a) => /1500 x 1500 px.*1:3 portrait.*cropped/.test(a)), about('/artwork/square.png').join(' | '))
check('a heavy file is told its size', about('/artwork/heavy.jpg').some((a) => /KB\. Aim for 300 KB or less/.test(a)), about('/artwork/heavy.jpg').join(' | '))
check('a heavy square PNG gets both the size and the shape advice', about('/artwork/square.png').length === 2, String(about('/artwork/square.png').length))
check('a narrow picture is told it prints soft', about('/artwork/small.jpg').some((a) => /only 300 px wide, which prints soft/.test(a)), about('/artwork/small.jpg').join(' | '))
check('a damaged file is reported as unreadable', about('/artwork/broken.jpg').some((a) => /could not be read as a picture/.test(a)), about('/artwork/broken.jpg').join(' | '))
check('a missing file is reported rather than crashing the check', about('/artwork/missing.jpg').some((a) => /could not be read/.test(a)))
check('a good back template gets no advice; a square one is told to be 1:3', about('/back/template-good.jpg').length === 0 && about('/back/template-square.jpg').some((a) => /600 x 600 px/.test(a)))
check('a JPEG stamp is told it has no transparent background', about('/back/stamp-photo.jpg').some((a) => /has no transparent background\. Use a PNG or SVG/.test(a)), about('/back/stamp-photo.jpg').join(' | '))
check('a heavy stamp is told its size (limit 200 KB)', about('/back/stamp-heavy.png').some((a) => /Aim for 200 KB or less/.test(a)), about('/back/stamp-heavy.png').join(' | '))
check('a small PNG stamp and an SVG stamp get no advice', about('/back/stamp-ok.png').length === 0 && about('/back/stamp-ok.svg').length === 0, [...about('/back/stamp-ok.png'), ...about('/back/stamp-ok.svg')].join(' | '))
check('a heavy line pattern is told its size (limit 100 KB)', about('/back/pattern-heavy.png').some((a) => /Aim for 100 KB or less/.test(a)), about('/back/pattern-heavy.png').join(' | '))
check('a picture used twice is described once', new Set(advice).size === advice.length)

// the real content: the advice it gives today
const real = await (await import('../../vite/content.ts')).loadContent(WORK)
const realAdvice = await checkImages(WORK, real)
check('the new back pictures and drawings need no advice', !realAdvice.some((a) => a.startsWith('/back/')), realAdvice.filter((a) => a.startsWith('/back/')).join(' | '))

rmSync(WORK, { recursive: true, force: true })
