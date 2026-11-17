import { useRef, useState, type PointerEvent } from 'react'
import { ROLE_COLOR, useHighlight } from '../annotations/highlightContext'

export interface CSPoint {
  /** Highlight id is `pt:<id>`. */
  id: string
  label: string
  /** 2 or 3 components. */
  pos: readonly number[]
  color?: string
}

export interface CoordinateSystemProps {
  points: readonly CSPoint[]
  mode: '2d' | '3d'
  /** Visible half-extent along every axis. */
  extent?: number
  /** Draw arrows from the origin (vectors) rather than just dots. */
  arrows?: boolean
  /** 2D only: called while dragging a point. */
  onMove?: (id: string, pos: [number, number]) => void
  size?: number
}

const rotate = (p: readonly number[], yaw: number, pitch: number): [number, number, number] => {
  const [x = 0, y = 0, z = 0] = p
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
  const x1 = cy * x + sy * z
  const z1 = -sy * x + cy * z
  const y1 = cp * y - sp * z1
  const z2 = sp * y + cp * z1
  return [x1, y1, z2]
}

/** 2D plane or drag-rotatable 3D projection (pure SVG, no WebGL). */
export function CoordinateSystem({ points, mode, extent = 1.2, arrows = true, onMove, size = 360 }: CoordinateSystemProps) {
  const [view, setView] = useState({ yaw: 0.6, pitch: 0.35 })
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{ kind: 'rotate'; x: number; y: number } | { kind: 'point'; id: string } | null>(null)
  const half = size / 2
  const scale = (half - 24) / extent

  const project = (p: readonly number[]) => {
    if (mode === '2d') return { x: half + (p[0] ?? 0) * scale, y: half - (p[1] ?? 0) * scale, depth: 0 }
    const [x, y, z] = rotate(p, view.yaw, view.pitch)
    const persp = 1 / (1 - z * 0.12)
    return { x: half + x * scale * persp, y: half - y * scale * persp, depth: z }
  }
  const origin = project([0, 0, 0])

  const toWorld = (e: PointerEvent): [number, number] => {
    const r = svg.current!.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * size
    const py = ((e.clientY - r.top) / r.height) * size
    return [(px - half) / scale, (half - py) / scale]
  }

  const axes: { to: number[]; label: string }[] =
    mode === '2d'
      ? [{ to: [extent, 0], label: 'x' }, { to: [0, extent], label: 'y' }]
      : [{ to: [extent, 0, 0], label: 'x' }, { to: [0, extent, 0], label: 'y' }, { to: [0, 0, extent], label: 'z' }]

  const sorted = [...points].sort((a, b) => project(a.pos).depth - project(b.pos).depth)

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[420px] touch-none select-none rounded-lg border border-line bg-panel"
      role="img"
      aria-label={`${mode.toUpperCase()} coordinate system with ${points.length} points`}
      onPointerDown={(e) => {
        if (mode === '3d') {
          drag.current = { kind: 'rotate', x: e.clientX, y: e.clientY }
          e.currentTarget.setPointerCapture(e.pointerId)
        }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        if (d.kind === 'rotate') {
          setView((v) => ({ yaw: v.yaw + (e.clientX - d.x) * 0.01, pitch: Math.max(-1.4, Math.min(1.4, v.pitch + (e.clientY - d.y) * 0.01)) }))
          drag.current = { kind: 'rotate', x: e.clientX, y: e.clientY }
        } else if (onMove) {
          const [wx, wy] = toWorld(e)
          onMove(d.id, [Math.max(-extent, Math.min(extent, wx)), Math.max(-extent, Math.min(extent, wy))])
        }
      }}
      onPointerUp={() => (drag.current = null)}
    >
      {mode === '2d' && [-1, -0.5, 0.5, 1].map((g) => (
        <g key={g} stroke="var(--line)" strokeWidth={0.5}>
          <line x1={project([g, -extent]).x} y1={0} x2={project([g, extent]).x} y2={size} />
          <line x1={0} y1={project([-extent, g]).y} x2={size} y2={project([extent, g]).y} />
        </g>
      ))}
      {axes.map((a) => {
        const p = project(a.to)
        return (
          <g key={a.label}>
            <line x1={origin.x} y1={origin.y} x2={p.x} y2={p.y} stroke="var(--muted)" strokeWidth={1} />
            <text x={p.x + 4} y={p.y - 4} fontSize={10} fill="var(--muted)">{a.label}</text>
          </g>
        )
      })}
      {sorted.map((pt) => (
        <PointMark key={pt.id} pt={pt} p={project(pt.pos)} origin={origin} arrows={arrows} draggable={mode === '2d' && !!onMove} onGrab={() => (drag.current = { kind: 'point', id: pt.id })} />
      ))}
    </svg>
  )
}

function PointMark({ pt, p, origin, arrows, draggable, onGrab }: { pt: CSPoint; p: { x: number; y: number }; origin: { x: number; y: number }; arrows: boolean; draggable: boolean; onGrab: () => void }) {
  const h = useHighlight(`pt:${pt.id}`)
  const color = h ? ROLE_COLOR[h.role] : (pt.color ?? 'var(--accent)')
  return (
    <g data-highlight-id={`pt:${pt.id}`} data-role={h?.role} style={{ opacity: h?.role === 'dim' ? 0.35 : 1 }}>
      {arrows && <line x1={origin.x} y1={origin.y} x2={p.x} y2={p.y} stroke={color} strokeWidth={h ? 2 : 1.25} opacity={0.8} />}
      <circle
        cx={p.x}
        cy={p.y}
        r={h ? 6 : 4.5}
        fill={color}
        style={{ cursor: draggable ? 'grab' : 'default' }}
        onPointerDown={(e) => {
          if (!draggable) return
          e.stopPropagation()
          e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId)
          onGrab()
        }}
      />
      <text x={p.x + 8} y={p.y - 6} fontSize={11} fill="var(--fg)">{pt.label}</text>
    </g>
  )
}
