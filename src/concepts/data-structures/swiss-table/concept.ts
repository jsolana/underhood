import { defineConcept } from '@/engine/simulation/concept'
import { CODE } from './code'
import { SwissInputEditor } from './InputEditor'
import { presets } from './presets'
import { swissSimulation, type SwissInput, type SwissState } from './simulation'
import { SwissView } from './View'

export default defineConcept<SwissState, SwissInput>({
  meta: {
    id: 'swiss-tables',
    title: 'Swiss Tables',
    summary: 'The open-addressing hash table behind Abseil flat_hash_map and Rust’s HashMap: one control byte per bucket, probed a whole group at a time with SIMD.',
    category: ['Data Structures', 'Hash Tables'],
    difficulty: 'advanced',
    prerequisites: [],
    related: ['embeddings'],
    tags: ['hash', 'hashmap', 'simd', 'abseil', 'hashbrown', 'open addressing'],
  },
  objectives: [
    'Explain how one hash is split into H1 (where to probe) and H2 (a 7-bit fingerprint).',
    'Read control bytes: FULL (H2), EMPTY (0x80), DELETED (0xFE).',
    'Follow a group-wise probe: load W bytes, compare all lanes with H2, verify candidates, stop at an EMPTY byte.',
    'Predict when erase writes a tombstone instead of EMPTY, and why.',
    'Explain growth vs. in-place rehash and the 7/8 load factor.',
  ],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction',
      body: [
        'A Swiss table is an open-addressing hash table designed around two facts: memory access dominates CPU cost, and modern CPUs can compare 16 bytes in one instruction.',
        'Instead of probing slot by slot and comparing keys, it keeps a separate array of one-byte metadata per bucket and compares a whole group of them at once.',
      ],
    },
    {
      id: 'mental-model',
      title: 'Mental model',
      body: [
        'Think of the control bytes as a tiny index of fingerprints. A lookup asks: “in these 16 buckets, which ones might hold my key?” One vector compare answers that, and only the (rare) fingerprint matches cost a real key comparison.',
        'An EMPTY byte is a stop sign: a key could never have been placed past a byte that was never used. DELETED bytes are “keep going” signs.',
      ],
    },
    {
      id: 'architecture',
      title: 'Internal architecture',
      body: [
        'Control bytes: 0x00–0x7F = FULL with the key’s 7-bit H2; 0x80 = EMPTY; 0xFE = DELETED. Their top bit tells “free or not” and a single compare against H2 can never accidentally match EMPTY or DELETED.',
        'The control array is W bytes longer than the table: the last W bytes mirror the first W, so loading a group starting near the end never has to wrap.',
        'Probing loads an unaligned window at pos = H1 & mask, then advances by a triangular stride (W, 2W, 3W, …). With a power-of-two bucket count this visits every window.',
        'The slots (keys and values) live in a separate array, only touched on a fingerprint match or when writing.',
      ],
    },
    {
      id: 'edge-cases',
      title: 'Edge cases',
      body: [
        'H2 false positives (probability ≈ 1/128 per FULL lane): the key comparison resolves them. See the “H2 false positive” example.',
        'Tombstones: erase writes DELETED unless no probe window could have crossed the slot. Tombstones eat load budget; when they dominate, an insert triggers an in-place rehash instead of growth.',
        'Wrap-around: windows starting in the last W−1 buckets read the mirrored bytes.',
      ],
    },
    {
      id: 'complexity',
      title: 'Complexity',
      body: [
        'Expected O(1) for find/insert/erase at ≤ 7/8 load; resize/rehash is O(n) but amortised O(1) per insert.',
        'Expected probe length stays small because a window checks W buckets per step and strides grow quadratically (no primary clustering).',
      ],
    },
    {
      id: 'applications',
      title: 'Practical applications',
      body: [
        'Abseil’s absl::flat_hash_map / node_hash_map, Rust’s std::collections::HashMap (via the hashbrown crate), Go’s map implementation (since Go 1.24) and many in-memory indexes.',
      ],
    },
  ],
  assumptions: [
    'The hash function is a deterministic stand-in (FNV-1a + a murmur3 finalizer on 32 bits), not the one Abseil or Rust use. Inputs can pin exact hash values to craft collisions.',
    'Layout follows hashbrown: power-of-two bucket counts (Abseil uses 2^k − 1) with W mirrored control bytes. The mirroring and unaligned windows are modelled faithfully.',
    'The minimum table here has W buckets, so tiny-table special cases in hashbrown (fewer buckets than the group width) are not shown. Bucket-count selection (capacity_to_buckets) follows the classic 7/8 rule; current hashbrown adds extra minimum-size adjustments for small tables.',
    'SIMD is emulated with loops that produce the same lane bitmask. Real implementations use SSE2 (16 lanes) or a u64 SWAR trick (8 lanes) and iterate set bits of the mask.',
    'Rehash-in-place reinserts live items into a cleared table of the same size; the real implementation permutes items in place using DELETED as a marker. The resulting table is equivalent but slot choices can differ.',
    'Abseil hashes 64-bit values and takes H2 from the low 7 bits (as here); hashbrown takes H2 from the top 7 bits. Behaviour is otherwise identical.',
    'Iteration, key hashing seeds, and element destructors are out of scope.',
  ],
  references: [
    { title: 'Abseil: Swiss Tables design notes', url: 'https://abseil.io/about/design/swisstables', kind: 'docs', supports: 'control bytes, H1/H2, group probing, tombstone rule' },
    { title: 'Abseil: raw_hash_set.h (implementation)', url: 'https://github.com/abseil/abseil-cpp/blob/master/absl/container/internal/raw_hash_set.h', kind: 'source', supports: 'EMPTY/DELETED encoding, growth_left, mirrored control bytes' },
    { title: 'hashbrown: src/raw.rs', url: 'https://github.com/rust-lang/hashbrown/blob/master/src/raw.rs', kind: 'source', supports: 'erase tombstone test, reserve_rehash, capacity_to_buckets' },
    { title: 'CppCon 2017: Designing a Fast, Efficient, Cache-friendly Hash Table, Step by Step (M. Kulukundis)', url: 'https://www.youtube.com/watch?v=ncHmEUmJZf4', kind: 'talk', supports: 'design rationale and benchmarks' },
  ],
  simulation: swissSimulation,
  presets,
  code: { language: 'pseudocode', source: CODE },
  View: SwissView,
  InputEditor: SwissInputEditor,
  validateInput(input) {
    if (input.ops.length === 0) return 'Add at least one operation.'
    if (input.ops.length > 60) return 'Too many operations (max 60).'
    return null
  },
})
