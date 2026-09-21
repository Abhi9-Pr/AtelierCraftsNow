import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { buildSite, TEST_ANALYTICS_TOKEN, TEST_FORM_KEY, TURNSTILE_TEST } from '../helpers/build.ts'
import { check } from '../helpers/check.ts'

/*
 * What the build settings do to the built site: which pages get the visitor counting script and which policy, that a
 * mistyped token stops the build, and that no setting for a feature leaves a trace when it is off.
 */
const read = (folder: string, file: string): string => readFileSync(join(folder, file), 'utf8')
const files = (folder: string): string[] => readdirSync(folder).flatMap((name) => (statSync(join(folder, name)).isDirectory() ? files(join(folder, name)).map((file) => `${name}/${file}`) : [name]))
const VISITOR_PAGES = ['index.html', 'collection/index.html', 'custom/index.html', 'privacy/index.html', 'design/emberwing-dragon/index.html', '404.html']

const off = buildSite('settings-off')
const on = buildSite('settings-on', { VITE_FORM_ACCESS_KEY: TEST_FORM_KEY, VITE_TURNSTILE_SITE_KEY: TURNSTILE_TEST.site, VITE_WEB_ANALYTICS_TOKEN: TEST_ANALYTICS_TOKEN })

check('with nothing set, no built file mentions Cloudflare\'s counting or spam check, or carries a key', files(off).filter((file) => /\.(html|js|css)$/.test(file)).every((file) => !/cloudflareinsights|challenges\.cloudflare|test-form-key|1x0000000/.test(read(off, file))))
check('with nothing set, every visitor page still has a policy that allows only the site', VISITOR_PAGES.every((page) => /http-equiv="Content-Security-Policy" content="[^"]*script-src &#39;self&#39;;/.test(read(off, page)) && !/https:\/\/(?!ateliercraftsnow)/.test((/http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(read(off, page))?.[1] ?? ''))))
check('every visitor page, including the privacy page and the 404 page, gets the counting script when a token is set', VISITOR_PAGES.every((page) => /<script type="module" src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js" data-cf-beacon="[^"]*0123456789abcdef0123456789abcdef[^"]*">/.test(read(on, page))))
check('the owner\'s dashboard and the content admin do not', !/cloudflareinsights/.test(read(on, 'admin/dashboard/index.html')) && !/cloudflareinsights/.test(read(on, 'admin/index.html')))
check('the dashboard has its own, stricter policy, and the content admin has none', /content="default-src &#39;none&#39;; script-src &#39;self&#39;[^"]*connect-src &#39;self&#39;; base-uri &#39;none&#39;/.test(read(on, 'admin/dashboard/index.html')) && !/Content-Security-Policy/.test(read(on, 'admin/index.html')))
check('the policy of a full build allows what is switched on, and the pages carry it', VISITOR_PAGES.every((page) => /challenges\.cloudflare\.com/.test(read(on, page)) && /api\.web3forms\.com/.test(read(on, page))))
check('the privacy page is a page of its own, kept out of search results and out of the sitemap', /<title>Privacy \| /.test(read(off, 'privacy/index.html')) && /name="robots" content="noindex/.test(read(off, 'privacy/index.html')) && !/privacy/.test(read(off, 'sitemap.xml')))
check('the sitemap lists the pages worth searching for at the address the host ends up serving, with the slash, and no working page', /<loc>https:\/\/[^<]+\/collection\/<\/loc>/.test(read(off, 'sitemap.xml')) && /<loc>https:\/\/[^<]+\/custom\/<\/loc>/.test(read(off, 'sitemap.xml')) && !/design|admin/.test(read(off, 'sitemap.xml')))
check('the canonical address and the share address of every searchable page are the final one, with the slash', ['collection/index.html', 'custom/index.html'].every((page) => new RegExp(`rel="canonical" href="https://[^"]+/${page.split('/')[0]}/"`).test(read(off, page)) && new RegExp(`property="og:url" content="https://[^"]+/${page.split('/')[0]}/"`).test(read(off, page))))
check('the home page keeps the plain address', /rel="canonical" href="https:\/\/[^/"]+\/"/.test(read(off, 'index.html')))
check('robots.txt keeps search engines out of the admin area', /Disallow: \/admin\//.test(read(off, 'robots.txt')))

let stopped = ''
try {
  buildSite('settings-bad', { VITE_WEB_ANALYTICS_TOKEN: 'bad token!' })
} catch (error) {
  stopped = String((error as { stderr?: Buffer }).stderr ?? error) + String((error as { stdout?: Buffer }).stdout ?? '')
}
check('a token that does not look right stops the build, and says why', /does not look like a Cloudflare Web Analytics token/.test(stopped), stopped.slice(0, 200))
