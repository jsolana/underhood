import { GraphView, type GraphEdge, type GraphNode } from '../graphs/GraphView'

export interface TreeData { id: string; label: string; children?: TreeData[] }

/** Tidy layered tree layout on top of GraphView (leaves get equal width). */
export function layoutTree(root: TreeData, width = 480, levelHeight = 64): { nodes: GraphNode[]; edges: GraphEdge[]; height: number } {
  const leaves = (t: TreeData): number => (t.children?.length ? t.children.reduce((n, c) => n + leaves(c), 0) : 1)
  const total = leaves(root)
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  let depthMax = 0
  const walk = (t: TreeData, depth: number, offset: number) => {
    const span = leaves(t)
    nodes.push({ id: t.id, label: t.label, x: ((offset + span / 2) / total) * width, y: 28 + depth * levelHeight })
    depthMax = Math.max(depthMax, depth)
    let o = offset
    for (const c of t.children ?? []) {
      edges.push({ from: t.id, to: c.id })
      walk(c, depth + 1, o)
      o += leaves(c)
    }
  }
  walk(root, 0, 0)
  return { nodes, edges, height: 56 + depthMax * levelHeight }
}

export function TreeView({ root, width = 480 }: { root: TreeData; width?: number }) {
  const { nodes, edges, height } = layoutTree(root, width)
  return <GraphView nodes={nodes} edges={edges} width={width} height={height} />
}
