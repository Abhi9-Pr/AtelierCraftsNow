import { brand } from '../../src/config/brand.ts'
import { privacySections, privacySettings, type PrivacyFacts } from '../../src/config/privacy.ts'
import { check } from '../helpers/check.ts'

/*
 * The privacy notice says what the site really does. What it says about the spam check and visitor counting follows
 * what the site was built to use, and the studio's own choices come from the settings, so it can neither describe a
 * service the site does not use nor leave one out.
 */
const plain: PrivacyFacts = { spamCheck: false, visitorCounting: false }
const everything: PrivacyFacts = { spamCheck: true, visitorCounting: true }
const text = (facts: PrivacyFacts, settings = privacySettings): string =>
  privacySections(facts, settings)
    .flatMap((section) => [section.heading, ...section.paragraphs])
    .join('\n')

check(
  'it has the parts a visitor looks for, in order',
  privacySections(plain)
    .map((section) => section.heading)
    .join('|') ===
    'Who this is about|What we keep when you send a request|Why we keep it|Who else handles it|What we count about visits|Cookies and browser storage|How long we keep it|Your choices|Changes',
)
check('every heading is different, so each can be linked to', new Set(privacySections(everything).map((section) => section.heading)).size === privacySections(everything).length)
check('no section is empty', privacySections(everything).every((section) => section.paragraphs.length > 0 && section.paragraphs.every((paragraph) => paragraph.trim().length > 20)))

check('a site with neither feature does not mention the spam check or Web Analytics', !/spam check|Web Analytics|Turnstile/i.test(text(plain)))
check('a site with the spam check says so, and that Cloudflare looks at the browser', /spam check/.test(text({ spamCheck: true, visitorCounting: false })) && !/Web Analytics/.test(text({ spamCheck: true, visitorCounting: false })))
check('a site with visitor counting says so', /Cloudflare Web Analytics/.test(text({ spamCheck: false, visitorCounting: true })) && !/spam check/.test(text({ spamCheck: false, visitorCounting: true })))
check('it never claims the services it names keep nothing in the browser', !/(spam check|Web Analytics)[^.]*does not (set|keep|use) cookies/i.test(text(everything)))
check('the claim of no cookies is about the site itself, and only that', /This site itself does not set cookies/.test(text(plain)) && /run by Cloudflare/.test(text(everything)) && !/run by Cloudflare/.test(text(plain)))
check('the design page counting is described, with the choice to opt out and the words never counted', /never part of it/.test(text(plain)) && /Do Not Track/.test(text(plain)))

check('the email service is named where it handles requests, and can be switched off', /Web3Forms sends a copy/.test(text(plain)) && !/sends a copy/.test(text(plain, { ...privacySettings, emailService: null })))
check('the studio can name a different email service', /Mailgun sends a copy/.test(text(plain, { ...privacySettings, emailService: 'Mailgun' })))
check('the retention and the date come from the studio\'s settings', text(plain, { ...privacySettings, retention: 'We keep it for two years.', updated: '1 January 2030' }).includes('We keep it for two years.') && text(plain, { ...privacySettings, updated: '1 January 2030' }).includes('1 January 2030'))
check('the studio\'s own address is the way to ask, and the name is the brand\'s', text(plain).includes(brand.email) && text(plain).includes(brand.name))
check('a request to be forgotten is promised only what the system does: the record and its history', /remove it and its history/.test(text(plain)))
check('it says plainly that no payment is taken on the site', /do not take payment/.test(text(plain)))

const banned = /\b(elevate|curated|unleash|journey|magical|delve|whimsy|vibes|seamless|effortless|leverage|robust)\b/i
check('no exclamation marks and none of the banned words', !text(everything).includes('!') && !banned.test(text(everything)))
check('no double spaces, and every paragraph ends with a full stop', privacySections(everything).every((section) => section.paragraphs.every((paragraph) => !/ {2}/.test(paragraph) && /[.]$/.test(paragraph))))
check('the date in the settings is written out in words, not a number code', /^\d{1,2} [A-Z][a-z]+ \d{4}$/.test(privacySettings.updated))
