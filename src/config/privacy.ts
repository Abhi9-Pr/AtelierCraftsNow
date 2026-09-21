/**
 * The words of the privacy notice. Read by the Privacy page and by the tests. Kept free of DOM and alias
 * imports so a test can load it.
 *
 * Two kinds of thing change what the notice says. What the studio decides is in `privacySettings`, and what the
 * site was built to use (the spam check, visitor counting) is passed in, so the notice never describes a service
 * the site does not use, or leaves one out that it does.
 */
import { brand } from './brand.ts'

/** What the studio decides. Read it through once, and change what is not true for you. */
export const privacySettings = {
  /** The date the notice last changed, as it should read on the page. Update it whenever you edit anything here. */
  updated: '21 September 2026',
  /** The email service that delivers each request to your inbox. Set it to null if you do not use one. */
  emailService: 'Web3Forms' as string | null,
  /** How long requests are kept. This is a promise to your customers, so write what you will actually do. */
  retention:
    'We keep a request for as long as we need it to deal with it, and afterwards as a record of what was made and agreed. You can ask us to delete it at any time.',
}

export type PrivacySettings = typeof privacySettings

/** What the site was built to use, which it works out from its build settings. */
export interface PrivacyFacts {
  /** The spam check on the request form */
  spamCheck: boolean
  /** Cloudflare Web Analytics */
  visitorCounting: boolean
}

export interface PrivacySection {
  heading: string
  paragraphs: readonly string[]
}

export function privacySections({ spamCheck, visitorCounting }: PrivacyFacts, settings: PrivacySettings = privacySettings): PrivacySection[] {
  const handlers = [
    'This site is hosted by Cloudflare. Cloudflare delivers its pages and keeps our request records in its database.',
    ...(settings.emailService
      ? [`When a request arrives, ${settings.emailService} sends a copy to our inbox by email, so your details pass through it too.`]
      : []),
    ...(spamCheck
      ? [
          'The request form uses a Cloudflare spam check to tell people from automated programs. Cloudflare looks at your browser to do this. Cloudflare says the check does not read what you type into the form.',
        ]
      : []),
    'Apart from that, we do not pass your details to anyone else.',
  ]

  const counting = [
    'On the page where you design the back of a bookmark, we count how often the page is visited and which choices people ended with. Nothing in that count says who you are, and the words you type on the back are never part of it. If your browser tells sites not to track you, by Do Not Track or Global Privacy Control, we do not count your visit.',
    ...(visitorCounting
      ? ['We also use Cloudflare Web Analytics to see how many people visit the site and which pages they look at. Cloudflare says it does not collect or use visitors’ personal data.']
      : []),
  ]

  const storage = [
    'This site itself does not set cookies and does not keep anything in your browser’s storage.',
    ...(spamCheck || visitorCounting ? ['The Cloudflare services described above are run by Cloudflare, and its own notices describe what they keep in your browser.'] : []),
  ]

  return [
    {
      heading: 'Who this is about',
      paragraphs: [`${brand.name} makes hand-painted bookmarks. This page explains what we do with the details you give us on this site. You can write to us at ${brand.email} about any of it.`],
    },
    {
      heading: 'What we keep when you send a request',
      paragraphs: [
        'When you send the request form we keep your name and email address, the kind of request, and anything you tell us: a quantity, your idea, a link. If you sent a back design, we keep the choices you made and the price you were shown. We also keep the date, what stage your request is at, and notes we make while working on it.',
        'We do not take payment on this site, and we do not ask for your address or phone number.',
      ],
    },
    {
      heading: 'Why we keep it',
      paragraphs: ['We use these details to write back to you, to make your bookmarks and to keep a record of what we agreed. We do not sell them, and we do not send newsletters or marketing emails from them.'],
    },
    { heading: 'Who else handles it', paragraphs: handlers },
    { heading: 'What we count about visits', paragraphs: counting },
    { heading: 'Cookies and browser storage', paragraphs: storage },
    { heading: 'How long we keep it', paragraphs: [settings.retention] },
    {
      heading: 'Your choices',
      paragraphs: [
        `You can ask us what we hold about you, ask us to correct it, or ask us to delete it. Write to ${brand.email} from the address you used, so we can find your request.`,
        'When we delete a request we remove it and its history from our records. Copies in our email and in backups are removed when we next clear them out.',
      ],
    },
    { heading: 'Changes', paragraphs: [`This page was last changed on ${settings.updated}. If it changes, this date changes.`] },
  ]
}
