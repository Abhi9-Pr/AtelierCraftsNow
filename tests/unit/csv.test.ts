import { check } from '../helpers/check.ts'
import { csvCell, toCsv } from '../../functions/_lib/csv.ts'
check('plain text is quoted', csvCell('Asha') === '"Asha"')
check('null is an empty cell, not ""', csvCell(null) === '')
check('a number is written as digits', csvCell(1001) === '"1001"' && csvCell(0) === '"0"')
check('a quote is doubled', csvCell('say "hi"') === '"say ""hi"""')
for (const start of ['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx']) check(`"${JSON.stringify(start)}" gets a leading apostrophe`, csvCell(start) === `"'${start}"`)
check('an equals sign in the middle is left alone', csvCell('a=b') === '"a=b"')
check('a negative number typed as text is protected too', csvCell('-5') === '"\'-5"')
check('an empty string is an empty quoted cell', csvCell('') === '""')
check('rows join with commas and CRLF, with a byte order mark and a final break', toCsv([['a', 1], ['b', null]]) === '\uFEFF"a","1"\r\n"b",\r\n')
check('a comma and a line break inside a cell stay inside it', csvCell('a,b\nc') === '"a,b\nc"')
