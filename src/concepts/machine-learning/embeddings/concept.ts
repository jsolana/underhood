import { defineConcept, type Preset } from '@/engine/simulation/concept'
import { CODE } from './code'
import { EmbeddingsInputEditor } from './InputEditor'
import { embeddingsSimulation, type EmbeddingsInput, type EmbeddingsState } from './simulation'
import { EmbeddingsView } from './View'

const base: EmbeddingsInput = {
  query: 'cat', other: 'dog', metric: 'cosine', scale: 3, analogy: ['man', 'king', 'woman'],
  toy: { u: [0.9, 0.3], v: [0.4, 0.8] }, projection: 2,
}

const presets: Preset<EmbeddingsInput>[] = [
  { id: 'cat-dog', label: 'cat vs dog', description: 'Two related animals: high cosine, small distance.', input: base },
  { id: 'cat-car', label: 'cat vs car', description: 'Unrelated concepts: nearly perpendicular vectors.', input: { ...base, other: 'car' } },
  { id: 'king-queen', label: 'king vs queen · 3D', description: 'Same roles, opposite gender component. Includes a 3-D projection.', input: { ...base, query: 'king', other: 'queen', projection: 3 } },
  { id: 'euclid-vs-cos', label: 'Magnitude: cosine vs Euclidean', description: 'Stretching a vector changes distance but not angle.', edgeCase: true, input: { ...base, query: 'apple', other: 'banana', scale: 5, metric: 'euclidean' } },
  { id: 'man-woman', label: 'man vs woman', description: 'Same “human” component, opposite gender: the cosine is close to zero.', input: { ...base, query: 'man', other: 'woman' } },
]

export default defineConcept<EmbeddingsState, EmbeddingsInput>({
  meta: {
    id: 'embeddings',
    title: 'Embeddings',
    summary: 'How text, images or other things become vectors whose geometry encodes meaning — and how similarity, distance and projections work on them.',
    category: ['Machine Learning'],
    difficulty: 'beginner',
    prerequisites: [],
    related: ['swiss-tables'],
    tags: ['vector', 'similarity', 'cosine', 'pca', 'semantic search', 'word2vec'],
  },
  objectives: [
    'Describe an embedding as a point/arrow in a vector space whose geometry reflects meaning.',
    'Compute and interpret dot product, norm, cosine similarity and Euclidean distance.',
    'Explain when cosine and Euclidean distance disagree (magnitude).',
    'Use nearest-neighbour search and vector arithmetic (analogies) on embeddings.',
    'Understand why and how PCA reduces dimensions for visualisation, and what it distorts.',
    'Distinguish this lab’s illustrative 6-D vectors from real 768–3072-D learned embeddings.',
  ],
  sections: [
    { id: 'introduction', title: 'Introduction', body: ['An embedding maps an item (a word, sentence, image, user…) to a fixed-length list of numbers. A model is trained so that items with similar meaning or behaviour end up with nearby vectors.', 'Everything downstream — semantic search, clustering, recommendations, retrieval for LLMs — is then geometry on those vectors.'] },
    { id: 'mental-model', title: 'Mental model', body: ['Picture a map where every concept has coordinates. Instead of 2 coordinates there are hundreds, but the idea is the same: closeness on the map means similarity in meaning.', 'Direction often matters more than length, which is why cosine similarity compares angles.'] },
    { id: 'architecture', title: 'Internal architecture', body: ['In practice a neural network (a transformer or a shallow word2vec-style model) produces the vector. Training objectives (predicting context, contrastive pairs) shape the space.', 'This lab skips training: it uses hand-authored vectors so every number can be inspected.', 'Search at scale uses approximate nearest-neighbour indexes (HNSW, IVF) instead of the exhaustive ranking shown here.'] },
    { id: 'edge-cases', title: 'Edge cases', body: ['Zero vectors have no direction: cosine is undefined (this lab returns 0).', 'Unnormalised vectors: Euclidean distance and cosine can rank neighbours differently. Many models output unit-length vectors, which makes them agree.', 'Analogies are approximate and fail for many relations in real models.'] },
    { id: 'complexity', title: 'Complexity', body: ['Dot product, norm, cosine and Euclidean distance are O(d). Brute-force nearest neighbours are O(n·d); PCA via a covariance matrix is O(n·d² + d³).'] },
    { id: 'applications', title: 'Practical applications', body: ['Semantic search, deduplication, recommendation, clustering, anomaly detection, and retrieval-augmented generation.'] },
  ],
  assumptions: [
    'ILLUSTRATIVE DATA: the 18 words use hand-authored 6-D vectors with named axes (royalty, gender, human, animal, food, vehicle). They are not outputs of a trained model.',
    'Real embedding models use hundreds to thousands of learned dimensions whose individual axes are not interpretable.',
    'PCA is computed by power iteration with deflation (deterministic); 2-D/3-D plots distort true distances. t-SNE and UMAP are not implemented.',
    'The 2-D toy vectors in the first steps are independent of the vocabulary and exist only to build geometric intuition.',
  ],
  references: [
    { title: 'Efficient Estimation of Word Representations in Vector Space (Mikolov et al., 2013)', url: 'https://arxiv.org/abs/1301.3781', kind: 'paper', supports: 'word vectors and vector-offset analogies' },
    { title: 'GloVe: Global Vectors for Word Representation (Pennington et al., 2014)', url: 'https://aclanthology.org/D14-1162/', kind: 'paper', supports: 'learned dense word vectors' },
    { title: 'Sentence-BERT (Reimers & Gurevych, 2019)', url: 'https://arxiv.org/abs/1908.10084', kind: 'paper', supports: 'sentence embeddings compared with cosine similarity' },
    { title: 'Visualizing Data using t-SNE (van der Maaten & Hinton, 2008)', url: 'https://jmlr.org/papers/v9/vandermaaten08a.html', kind: 'paper', supports: 'non-linear dimensionality reduction (not implemented here)' },
  ],
  simulation: embeddingsSimulation,
  presets,
  code: { language: 'python', source: CODE },
  View: EmbeddingsView,
  InputEditor: EmbeddingsInputEditor,
  validateInput(i) {
    return i.query === i.other ? 'Pick two different words.' : null
  },
})
