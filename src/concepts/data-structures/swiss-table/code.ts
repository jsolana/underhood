import { parseAnnotatedSource } from '@/utils/annotatedSource'

/** Pseudocode modelled on hashbrown / Abseil (not a literal excerpt). */
export const listing = parseAnnotatedSource(`// Swiss table — W = group width (8 or 16), mask = buckets - 1
// ctrl[i]: FULL = h2 (0..0x7F) · EMPTY = 0x80 · DELETED = 0xFE
// ctrl has buckets + W bytes; the last W mirror the first W.

function probe(key):
  hash = hasher(key)                          // @hash
  h2   = hash & 0x7F                          // @h2
  pos  = (hash >> 7) & mask                   // @start
  stride = 0
  loop:
    group = load(ctrl[pos .. pos + W])        // @load
    for bit in group.matchByte(h2):           // @match
      i = (pos + bit) & mask                  // @candidate
      if slots[i].key == key: return FOUND(i) // @compare
    if group.matchEmpty().any():              // @empty
      return NOT_FOUND                        // @miss
    stride += W                               // @advance
    pos = (pos + stride) & mask               // @advance

function insert(key, value):
  r = probe(key)
  if r.found: slots[r.found].value = value    // @update
  slot = first EMPTY|DELETED seen by probe    // @slot
  if growthLeft == 0 and ctrl[slot] == EMPTY: // @reserve
    reserve_rehash()                          // @reserve
    slot = probe(key).insertSlot
  if ctrl[slot] == EMPTY: growthLeft -= 1     // @write
  ctrl[slot] = h2; slots[slot] = (key, value) // @write

function erase(key):
  i = probe(key).found                        // @erase-find
  before = load(ctrl[(i - W) & mask ..]).matchEmpty()  // @erase-decide
  after  = load(ctrl[i ..]).matchEmpty()      // @erase-decide
  if before.leading_zeros() + after.trailing_zeros() >= W: // @erase-decide
    ctrl[i] = DELETED   // a probe may have walked past i  // @tomb
  else:
    ctrl[i] = EMPTY; growthLeft += 1          // @erase-empty

function reserve_rehash():
  if items + 1 <= capacity / 2:               // @rehash-choice
    rehash in place (drop tombstones)         // @rehash
  else:
    resize to next power of two (7/8 load)    // @grow
  for each live item: reinsert at new place   // @reinsert
`)
export const CODE = listing.source
