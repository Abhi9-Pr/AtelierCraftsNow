import { check } from '../helpers/check.ts'
import catalog from '../../functions/_generated/catalog.json' with { type: 'json' }
import { designPicks } from '../../src/lib/back/designPicks.ts'
import { decodeDesign } from '../../src/lib/back/designParams.ts'
const groups = catalog.back as never
const picksOf = (query: string) => designPicks(groups, decodeDesign(new URLSearchParams(query), groups)).map((p) => `${p.group}:${p.option}`).join(' ')

check('an untouched design has no picks', picksOf('') === '')
check('a picked option is one pick', picksOf('b.line-style=line-style-dotted') === 'line-style:line-style-dotted')
check('picks come in the order of the categories, whatever the address order', picksOf('b.watermark=watermark-moon&b.back-template=back-template-soft-wash') === 'back-template:back-template-soft-wash watermark:watermark-moon')
check('choosing none where allowed is a pick', picksOf('b.watermark=') === 'watermark:none')
check('an empty value where a choice is required is nothing', picksOf('b.line-style=') === '')
check('a switch on and a switch off are both picks', picksOf('s.date-signed-lines=1') === 'date-signed-lines:on' && picksOf('s.date-signed-lines=0') === 'date-signed-lines:off')
check('own words are a pick and the words are not in it', picksOf('t.heading=for+mum') === 'heading:own-words')
check('a listed heading and own words are two picks', picksOf('b.heading=heading-margin-notes&t.heading=mine') === 'heading:heading-margin-notes heading:own-words')
check('blank own words are nothing', picksOf('t.heading=%20%20') === '')
check('words on a category that does not take them are dropped', picksOf('t.line-style=abc') === '')
check('an option that does not exist is dropped', picksOf('b.line-style=nope') === '')
check('a category that does not exist is dropped', picksOf('b.bogus=x&s.bogus=1') === '')
check('a switch value on a picture category is dropped', picksOf('s.watermark=1') === '')
