interface GraphNode {
  id: number;
  slug: string;
  title: string;
  cx: number;
  cy: number;
}

const NODES: GraphNode[] = [
  { id: 1, slug: 'numpy', title: 'numpy', cx: 90, cy: 240 },
  { id: 2, slug: 'pandas', title: 'pandas', cx: 260, cy: 120 },
  { id: 4, slug: 'deep-learning-basics', title: 'DL基礎', cx: 260, cy: 360 },
  { id: 3, slug: 'scikit-learn', title: 'scikit-learn', cx: 430, cy: 120 },
  { id: 5, slug: 'learning-techniques', title: '学習手法', cx: 600, cy: 240 },
  { id: 6, slug: 'cnn', title: 'CNN', cx: 770, cy: 60 },
  { id: 7, slug: 'rnn', title: 'RNN', cx: 770, cy: 150 },
  { id: 8, slug: 'vae', title: 'VAE', cx: 770, cy: 240 },
  { id: 9, slug: 'gan', title: 'GAN', cx: 770, cy: 330 },
  { id: 10, slug: 'reinforcement-learning', title: '強化学習', cx: 770, cy: 420 },
  { id: 11, slug: 'transfer-learning', title: '転移学習', cx: 920, cy: 60 },
];

const EDGES: Array<[number, number]> = [
  [1, 2],
  [1, 4],
  [2, 3],
  [3, 5],
  [4, 5],
  [5, 6],
  [5, 7],
  [5, 8],
  [5, 9],
  [5, 10],
  [6, 11],
];

const NODE_W = 130;
const NODE_H = 44;

function edgePath(from: GraphNode, to: GraphNode): string {
  const x1 = from.cx + NODE_W / 2;
  const y1 = from.cy;
  const x2 = to.cx - NODE_W / 2;
  const y2 = to.cy;
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

export function ChapterGraph() {
  const nodesById = new Map(NODES.map((n) => [n.id, n]));

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <svg
        viewBox="0 0 1010 480"
        className="w-full min-w-[680px] h-auto"
        role="img"
        aria-label="章間の前提関係グラフ"
      >
        <defs>
          <marker
            id="chapter-graph-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#a1a1aa" />
          </marker>
        </defs>

        <g>
          {EDGES.map(([from, to]) => {
            const f = nodesById.get(from)!;
            const t = nodesById.get(to)!;
            return (
              <path
                key={`${from}-${to}`}
                d={edgePath(f, t)}
                fill="none"
                stroke="#d4d4d8"
                strokeWidth="1.5"
                markerEnd="url(#chapter-graph-arrow)"
              />
            );
          })}
        </g>

        <g>
          {NODES.map((n) => (
            <a
              key={n.id}
              href={`/learn#chapter-${n.id}`}
              className="group"
              aria-label={`第${n.id}章 ${n.title} へ移動`}
            >
              <rect
                x={n.cx - NODE_W / 2}
                y={n.cy - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={12}
                className="fill-white stroke-zinc-200 group-hover:stroke-zinc-700 group-hover:fill-zinc-50 transition-colors"
                strokeWidth="1.5"
              />
              <text
                x={n.cx}
                y={n.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="13"
                className="fill-zinc-900 select-none pointer-events-none"
              >
                <tspan className="fill-zinc-400" fontWeight="600">
                  {n.id}.
                </tspan>
                <tspan dx="4" fontWeight="500">
                  {n.title}
                </tspan>
              </text>
            </a>
          ))}
        </g>
      </svg>
    </div>
  );
}
