import fs from 'node:fs'
fs.writeFileSync(new URL('../../artifacts/forged.txt', import.meta.url), 'ran')
export default {}
