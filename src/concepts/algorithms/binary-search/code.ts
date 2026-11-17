import { parseAnnotatedSource } from '@/utils/annotatedSource'

export const listing = parseAnnotatedSource(`function binarySearch(items, target) {
  let lo = 0, hi = items.length - 1       // @init
  while (lo <= hi) {                      // @loop
    const mid = (lo + hi) >> 1            // @mid
    if (items[mid] === target) return mid // @hit
    if (items[mid] < target) lo = mid + 1 // @right
    else hi = mid - 1                     // @left
  }
  return -1                               // @miss
}`)
export const CODE = listing.source
