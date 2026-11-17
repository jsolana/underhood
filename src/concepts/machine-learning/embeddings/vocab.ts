/**
 * ILLUSTRATIVE, hand-authored embeddings (6 dimensions with human-readable meaning).
 * Real embedding models output 384–3072 learned dimensions whose axes have no individual meaning.
 */
export const DIMS = ['royalty', 'gender', 'human', 'animal', 'food', 'vehicle'] as const

export const VOCAB: Readonly<Record<string, readonly number[]>> = {
  king: [0.92, 0.85, 0.88, 0.02, 0.0, 0.0],
  queen: [0.9, -0.86, 0.9, 0.0, 0.02, 0.0],
  prince: [0.7, 0.8, 0.72, 0.0, 0.0, 0.03],
  princess: [0.71, -0.78, 0.74, 0.02, 0.0, 0.0],
  man: [0.08, 0.9, 0.92, 0.04, 0.0, 0.0],
  woman: [0.1, -0.88, 0.9, 0.03, 0.0, 0.02],
  boy: [0.03, 0.75, 0.8, 0.05, 0.0, 0.0],
  girl: [0.05, -0.72, 0.82, 0.04, 0.02, 0.0],
  cat: [0.0, 0.1, 0.05, 0.92, 0.04, 0.0],
  kitten: [0.0, 0.02, 0.04, 0.82, 0.05, 0.0],
  dog: [0.02, 0.12, 0.08, 0.9, 0.03, 0.0],
  puppy: [0.0, 0.05, 0.06, 0.8, 0.05, 0.02],
  apple: [0.0, 0.0, 0.0, 0.02, 0.92, 0.0],
  banana: [0.0, 0.02, 0.0, 0.05, 0.86, 0.0],
  bread: [0.0, 0.0, 0.02, 0.0, 0.8, 0.04],
  car: [0.0, 0.0, 0.02, 0.0, 0.0, 0.92],
  truck: [0.0, 0.05, 0.02, 0.0, 0.03, 0.85],
  bicycle: [0.0, 0.0, 0.1, 0.0, 0.0, 0.75],
}

export const WORDS = Object.keys(VOCAB)
