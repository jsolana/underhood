#!/usr/bin/env node
/** Generates the pixel-art logo (docs/assets/logo.svg, public/logo.svg). Run: node scripts/make-logo.mjs */
import { writeFileSync } from 'node:fs'

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
}

// Purple-tentacle-style sprite (SCUMM-era nod). . = empty, p = purple, d = dark purple, w = white, k = black, g = green
const SPRITE = [
  '......pppp......',
  '....pppppppp....',
  '...pppppppppp...',
  '..ppwwwppwwwpp..',
  '..ppwkwppwkwpp..',
  '..pppwwppwwppp..',
  '...pppppppppp...',
  '...dpppppppd....',
  '....dddppdd.....',
  '.....ppppp......',
  '....ppppp.......',
  '...ppppp........',
  '...pppp.........',
  '....ppppp.......',
  '.....ppppp......',
  '......ppppp.....',
  '.......pppppp...',
  '.........ppppp..',
  '...........pppp.',
  '............ppp.',
]
const COLORS = { p: '#b44dff', d: '#6a1fa8', w: '#ffffff', k: '#12081f', g: '#5cff6e' }

const W = 960, H = 280
const out = []
let run = null
const flush = () => { if (run) out.push(`<path fill="${run.fill}"${run.op ? ` opacity="${run.op}"` : ''} d="${run.d}"/>`); run = null }
// consecutive rects of the same fill are merged into one <path> to keep the file small
const rect = (x, y, w, h, fill, extra = '') => {
  const op = (extra.match(/opacity="([\d.]+)"/) || [])[1] || ''
  if (!run || run.fill !== fill || run.op !== op) { flush(); run = { fill, op, d: '' } }
  run.d += `M${x} ${y}h${w}v${h}h${-w}z`
}

function text(str, x, y, px, gap, fill, shadow, outline) {
  let cx = x
  for (const ch of str) {
    if (ch === ' ') { cx += (5 + 3) * px; continue }
    const g = FONT[ch]
    if (!g) throw new Error(`missing glyph ${ch}`)
    g.forEach((row, r) => [...row].forEach((c, k) => {
      if (c !== '1') return
      const gx = cx + k * px, gy = y + r * px
      if (outline && false) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) rect(gx + dx * px / 2, gy + dy * px / 2, px, px, outline)
      if (shadow) rect(gx + px / 2, gy + px / 2 + px / 4, px, px, shadow)
    }))
    g.forEach((row, r) => [...row].forEach((c, k) => { if (c === '1') rect(cx + k * px, y + r * px, px, px, fill) }))
    cx += (5 + gap) * px
  }
  return cx
}

flush()
out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges" role="img" aria-label="Underhood — Make the invisible visible">`)
out.push('<title>Underhood — Make the invisible visible</title>')
rect(0, 0, W, H, '#12081f')
// dithered dusk gradient bands
const bands = ['#1b0c2e', '#241040', '#2e1452']
bands.forEach((c, i) => rect(0, H - 90 + i * 30, W, 30, c))
for (let x = 0; x < W; x += 8) for (let b = 0; b < 2; b++) if ((x / 8 + b) % 2 === 0) rect(x, H - 90 + b * 30 + 24, 8, 6, bands[b + 1])
// stars (deterministic)
let s = 7
const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32)
for (let i = 0; i < 46; i++) rect(Math.floor(rnd() * (W / 4)) * 4, Math.floor(rnd() * 150 / 4) * 4, 4, 4, i % 5 === 0 ? '#ffd23f' : '#6b4aa0')
// ground / floor line
rect(0, H - 24, W, 24, '#0b0516')
for (let x = 0; x < W; x += 32) rect(x, H - 24, 16, 4, '#2e1452')

// sprite
const sp = 8
SPRITE.forEach((row, r) => [...row].forEach((c, k) => { if (COLORS[c]) rect(48 + k * sp, 34 + r * sp, sp, sp, COLORS[c]) }))
rect(48 + 3 * sp, 34 + 20 * sp, 12 * sp, 4, '#000000', ' opacity="0.45"')

// title
const px = 10
text('UNDERHOOD', 232, 52, px, 1, '#5cff6e', '#0a5a1f', '#12081f')
// tagline
text('MAKE THE INVISIBLE VISIBLE', 236, 172, 4, 1, '#ffd23f', '#7a4d00', null)
// SCUMM-style verb bar
const verbs = ['STEP', 'PLAY', 'REWIND', 'INSPECT']
let vx = 236
verbs.forEach((v) => {
  const w = v.length * 24 + 24
  rect(vx, 214, w, 28, '#2e1452'); rect(vx + 3, 217, w - 6, 22, '#12081f')
  text(v, vx + 12, 222, 3, 1, '#5cff6e', null, null)
  vx += w + 12
})
// scanlines
for (let y = 0; y < H; y += 4) rect(0, y, W, 1, '#000000', ' opacity="0.18"')
flush()
out.push('</svg>')
const svg = out.join('\n') + '\n'
writeFileSync(new URL('../docs/assets/logo.svg', import.meta.url), svg)
writeFileSync(new URL('../public/logo.svg', import.meta.url), svg)
console.log('logo written, bytes:', svg.length)
