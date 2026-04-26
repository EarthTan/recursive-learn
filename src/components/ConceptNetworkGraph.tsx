"use client";

import type { ConceptGraph } from "@/domain/concept-network";

const W = 520;
const H = 360;

const labelShort: Record<string, string> = {
  related: "rel",
  part_of: "part",
  uses: "uses",
  used_by: "by"
};

export function ConceptNetworkGraph({ graph }: { graph: ConceptGraph }) {
  const n = graph.nodes.length;
  if (n === 0) {
    return <p className="network-empty">No concepts yet. Ask questions from a node to add concepts.</p>;
  }

  const pos = new Map<string, { x: number; y: number }>();
  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(W, H) * 0.32;
  graph.nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    pos.set(node.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  });

  return (
    <svg
      className="concept-network-graph"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="360"
      role="img"
      aria-label="Concept network graph"
    >
      {graph.edges.map((e) => {
        const a = pos.get(e.source);
        const b = pos.get(e.target);
        if (!a || !b) return null;
        return (
          <g key={e.id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="concept-network-graph__edge" />
            <text
              x={(a.x + b.x) / 2}
              y={(a.y + b.y) / 2}
              className="concept-network-graph__edge-label"
            >
              {labelShort[e.label] ?? e.label}
            </text>
          </g>
        );
      })}
      {graph.nodes.map((node) => {
        const p = pos.get(node.id);
        if (!p) return null;
        return (
          <g key={node.id} transform={`translate(${p.x},${p.y})`}>
            <circle r="14" className="concept-network-graph__node" />
            <text y="4" textAnchor="middle" className="concept-network-graph__node-label">
              {node.label.length > 10 ? `${node.label.slice(0, 8)}…` : node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
