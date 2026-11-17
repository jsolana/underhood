import { EdgeView } from './EdgeView'
import { NodeView } from './NodeView'

export interface GraphNode { id: string; label: string; x: number; y: number }
export interface GraphEdge { from: string; to: string }

/** Generic positioned graph. Node ids: `node:<id>`; edge ids: `edge:<from>-<to>`. */
export function GraphView({ nodes, edges, width = 480, height = 280, directed }: { nodes: GraphNode[]; edges: GraphEdge[]; width?: number; height?: number; directed?: boolean }) {
  const by = new Map(nodes.map((n) => [n.id, n]))
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="graph">
      <defs>
        <marker id="edge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)" /></marker>
      </defs>
      {edges.map((e) => {
        const a = by.get(e.from)
        const b = by.get(e.to)
        return a && b ? <EdgeView key={`${e.from}-${e.to}`} id={`edge:${e.from}-${e.to}`} from={a} to={b} directed={directed} /> : null
      })}
      {nodes.map((n) => (
        <NodeView key={n.id} id={`node:${n.id}`} x={n.x} y={n.y}>{n.label}</NodeView>
      ))}
    </svg>
  )
}
