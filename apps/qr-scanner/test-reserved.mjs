// Check which cells the test marks as reserved
const size = 21
const reserved = new Array(size * size).fill(false)
const set = (x, y, v, isRes = false) => {
  if (isRes) reserved[y * size + x] = true
}
const finder = (ox, oy) => {
  for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
    const x = ox + c, y = oy + r
    if (x < 0 || y < 0 || x >= size || y >= size) continue
    set(x, y, true, true)
  }
}
finder(0, 0)
finder(size - 7, 0)
finder(0, size - 7)
for (let i = 0; i < size; i++) {
  set(6, i, true, true)
  set(i, 6, true, true)
}
const alignment = (cx, cy) => {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
    set(cx + dx, cy + dy, true, true)
}
alignment(size - 7, size - 7)

// print reserved grid
for (let y = 0; y < size; y++) {
  let row = ''
  for (let x = 0; x < size; x++) row += reserved[y * size + x] ? 'R' : '.'
  console.log(row)
}
console.log('Total reserved:', reserved.filter(Boolean).length)
