import { parseAnnotatedSource } from '@/utils/annotatedSource'

export const listing = parseAnnotatedSource(`# Embeddings — similarity & projection (numpy-style pseudocode)
import numpy as np

a, b = E[query], E[other]                       # @vector
dims = a.shape[0]            # 6 here, 768-3072 in real models   # @numbers

dot = np.dot(a, b)                              # @dot
norm_a = np.linalg.norm(a)                      # @norm
norm_b = np.linalg.norm(b)                      # @norm
cosine = dot / (norm_a * norm_b)                # @cosine
angle  = np.degrees(np.arccos(cosine))          # @cosine

euclid = np.linalg.norm(a - b)                  # @euclid

# scale invariance: cosine(a, k*b) == cosine(a, b) but euclid changes
cosine(a, 3 * b), euclid_dist(a, 3 * b)         # @scale

ranked = sorted(E, key=lambda w: -cosine(a, E[w]))   # @rank

target = E["king"] - E["man"] + E["woman"]      # @analogy
nearest = argmax_w cosine(target, E[w])         # @analogy

X = E_matrix - E_matrix.mean(axis=0)            # @center
C = X.T @ X / (n - 1)                           # @cov
vals, vecs = top_eigenvectors(C, k)             # @eig
Y = X @ vecs                                    # @project
`)
export const CODE = listing.source
