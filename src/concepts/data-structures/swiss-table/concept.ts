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
    'Explain why Go 1.24 splits a map into several small Swiss tables (max 1024 entries each) and how its iterator stays correct while the map grows.',
  ],
  sections: [
    {
      id: 'introduction',
      title: 'Introduction',
      body: [
        'A Swiss table is an open-addressing hash table designed around two facts: memory access dominates CPU cost, and modern CPUs can compare 16 bytes in one instruction.',
        'Instead of probing slot by slot and comparing keys, it keeps a separate array of one-byte metadata per bucket and compares a whole group of them at once.',
        'Swiss tables were presented at Google in 2017 (Benzaquen, Evlogimenos, Kulukundis, Perepelitsa) and open-sourced in Abseil (C++) in 2018. Go 1.24 ships a built-in map based on the same design.',
        'An open-addressed table is a single backing array of slots. A key’s target slot is its hash reduced to the table size (e.g. hash(key) % 16). If that slot is taken, the table probes other slots; with linear probing it simply checks the next ones until it finds a free slot. A lookup follows exactly the same path.',
        'When the array fills, the table usually doubles it and reinserts every entry. It must grow before it is completely full, because probe length rises with load: with a single free slot left, a probe can take O(n) steps.',
        'The load factor (used slots / total slots) is capped by a maximum, typically 70–90%. Swiss tables’ cheaper probing lets implementations (Abseil and Go) raise that maximum compared with earlier maps, lowering the average memory footprint.',
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
      title: 'Practical applications and Go 1.24’s adaptation',
      body: [
        'Abseil’s absl::flat_hash_map / node_hash_map, Rust’s std::collections::HashMap (via the hashbrown crate), Go’s map implementation (since Go 1.24) and many in-memory indexes.',
        'Layout (per the Go blog): the backing array is split into groups of 8 slots, each with a 64-bit control word holding one byte per slot (empty, deleted, or in use). A used byte stores h2, the lower 7 bits of the hash; h1, the upper 57 bits, picks the first group (h1 % number of groups). Within a group all 8 slots are equally eligible; if none is empty the probe continues in the next group. A lookup stops as soon as it finds an empty slot, because an insert would have used it.',
        'Group matching compares h2 against all 8 control bytes at once with a byte-wise equality test. Non-matching bytes are skipped; a match is only a candidate (a 7-bit collision has probability 1/128) and the full key is still compared. This performs 8 probe steps in parallel. Go uses SIMD where available (8-byte SIMD on amd64 in Go 1.24) and a portable version with ordinary arithmetic and bitwise operations elsewhere.',
        'Incremental growth: a classic table grows all at once (doubling a 1 GB map copies about 1 GB in a single insert), which is unacceptable for latency-sensitive Go servers. Abseil’s design assumes all-at-once growth because its probe sequence depends on the total group count. Go instead makes a map one or more independent Swiss tables, each covering a subset of the key space and holding at most 1024 entries. A variable number of upper hash bits selects the table (extendible hashing: the number of bits grows as the number of tables grows). When one table grows it does so all at once without affecting the others, so a single insert copies at most 1024 entries.',
        'Iteration during modification: Abseil forbids modifying a table while iterating, but the Go spec allows it: entries deleted before being reached are not produced, entries updated before being reached produce the updated value, and new entries may or may not be produced. Walking the array in memory order would break this when growth reshuffles memory. So the iterator keeps a reference to the table it started on; if that table grows, it keeps using the old table only to decide the order of keys, and before returning each entry it consults the grown table to check the entry still exists and to read its latest value. This is the most complex part of Go’s map implementation, and the blog notes there are further edge cases it does not cover.',
        'Results reported by the blog: microbenchmarks of map operations up to 60% faster than Go 1.23 (some edge cases regress) and about 1.5% geometric-mean CPU-time improvement across full application benchmarks. Future work mentioned: better locality for maps that do not fit in CPU cache, extending the SIMD control-word comparison to more architectures, and 16-slot groups with 16-byte SIMD to compare 16 hashes in parallel and further reduce average probes.',
        'The interactive simulation models the Abseil/hashbrown single-table design; multi-table growth and iteration are described here but not simulated.',
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
    'Iteration, key hashing seeds, and element destructors are out of scope in the simulation (Go’s iteration semantics are only described in text).',
    'Go’s extendible-hashing layer (independent tables of at most 1024 entries, incremental growth) is described but not simulated: the simulation has a single table that grows all at once.',
    'The simulation probes unaligned windows with triangular strides (hashbrown/Abseil). The Go blog describes probing group by group starting at group h1 % groups, and does not state the stride, the control-byte encodings, the deletion algorithm or the exact maximum load factor of Go’s tables, so none of those are claimed for Go.',
    'Group width 8 corresponds to Go’s 8-slot groups with a 64-bit control word; width 16 corresponds to SSE2 (Abseil/hashbrown) and to the 16-slot groups the Go blog lists as future work.',
  ],
  references: [
    { title: 'Faster Go maps with Swiss Tables (M. Pratt, Go Blog, 26 Feb 2025)', url: 'https://go.dev/blog/swisstable', kind: 'docs', supports: 'open-addressing background, h1/h2 split, 8-slot groups with 64-bit control word, parallel h2 match, incremental growth with ≤1024-entry tables, iteration semantics, benchmarks, future work' },
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
