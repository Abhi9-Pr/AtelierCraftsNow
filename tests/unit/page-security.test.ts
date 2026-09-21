import { dashboardPolicy, visitorPolicy } from '../../vite/pageSecurity.ts'
import { check } from '../helpers/check.ts'

const none = { turnstile: false, analytics: false, formServices: [] }
const directive = (policy: string, name: string): string[] => (policy.split('; ').find((part) => part.startsWith(`${name} `)) ?? '').split(' ').slice(1)

check('with no optional feature, a page may load only from the site itself', ['script-src', 'connect-src', 'img-src', 'style-src', 'font-src'].every((name) => directive(visitorPolicy(none), name).every((source) => source === "'self'" || source === 'data:' || source === "'unsafe-inline'")))
check('and there is no frame source at all, so the default of nothing holds', directive(visitorPolicy(none), 'frame-src').length === 0 && directive(visitorPolicy(none), 'default-src').join() === "'none'")
check('the spam check adds its script and its frame, and nothing else', directive(visitorPolicy({ ...none, turnstile: true }), 'script-src').includes('https://challenges.cloudflare.com') && directive(visitorPolicy({ ...none, turnstile: true }), 'frame-src').join() === 'https://challenges.cloudflare.com' && directive(visitorPolicy({ ...none, turnstile: true }), 'connect-src').join() === "'self'")
check('visitor counting adds its script and where it reports to', directive(visitorPolicy({ ...none, analytics: true }), 'script-src').includes('https://static.cloudflareinsights.com') && directive(visitorPolicy({ ...none, analytics: true }), 'connect-src').includes('https://cloudflareinsights.com') && directive(visitorPolicy({ ...none, analytics: true }), 'frame-src').length === 0)
check('an email service is allowed to be contacted only when one is set up', directive(visitorPolicy({ ...none, formServices: ['https://api.web3forms.com'] }), 'connect-src').includes('https://api.web3forms.com') && !directive(visitorPolicy(none), 'connect-src').includes('https://api.web3forms.com'))
check('no policy ever allows inline script or eval', [none, { turnstile: true, analytics: true, formServices: ['https://formspree.io'] }].every((features) => !/'unsafe-eval'/.test(visitorPolicy(features)) && !directive(visitorPolicy(features), 'script-src').includes("'unsafe-inline'")))
check('a page may never add a base address, send a form elsewhere or hold an object', directive(visitorPolicy(none), 'base-uri').join() === "'self'" && directive(visitorPolicy(none), 'form-action').join() === "'self'" && directive(visitorPolicy(none), 'object-src').join() === "'none'")
check('the dashboard policy names no other site at all', !/https?:/.test(dashboardPolicy) && directive(dashboardPolicy, 'connect-src').join() === "'self'" && directive(dashboardPolicy, 'script-src').join() === "'self'")
check('the dashboard cannot send a form or add a base address', directive(dashboardPolicy, 'form-action').join() === "'none'" && directive(dashboardPolicy, 'base-uri').join() === "'none'")
