// Checkpoint-image anatomy figure for the cuda-checkpoint post, ported from
// the personal blog's checkpoint/AnatomyFig.astro. Static SVG, desktop +
// mobile variants swapped by media query.
export default function AnatomyFig() {
  return (
    <div className="ck-fig">
      <style>{`
        .ck-fig .ck-desktop {display: block;}
        .ck-fig .ck-mobile {display: none;}
        .ck-fig svg {display: block; width: 100%; height: auto; max-width: 880px; margin: 0 auto; font-family: var(--font-mono), ui-monospace, monospace;}
        @media (max-width: 640px) {
          .ck-fig .ck-desktop {display: none;}
          .ck-fig .ck-mobile {display: block;}
          .ck-fig .ck-mobile svg {max-width: 360px;}
        }
        .ck-svg .tag {font-size:11px; fill:#666;}
        .ck-svg .rl {font-size:12.5px; fill:#2a2a2a;}
        .ck-svg .box {stroke:#444; stroke-width:1.4;}
        .ck-svg .seg {stroke:#444; stroke-width:1;}
        .ck-svg .div {stroke:#bbb; stroke-width:1; stroke-dasharray:4 3; fill:none;}
        .ck-svg .brk {stroke:#999; stroke-width:1.2; fill:none;}
        .ck-svg .aln {stroke:#666; stroke-width:1.2; fill:none;}
        .ck-svg .mk {fill:#666;}
        html[data-theme="dark"] .ck-svg .tag {fill:#aaa;}
        html[data-theme="dark"] .ck-svg .rl {fill:#ddd;}
        html[data-theme="dark"] .ck-svg .div {stroke:#666;}
        html[data-theme="dark"] .ck-svg .box {stroke:#999;}
        html[data-theme="dark"] .ck-svg .aln {stroke:#aaa;}
        html[data-theme="dark"] .ck-svg .mk {fill:#aaa;}
      `}</style>
      <div className="ck-desktop">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 880 170"
          className="ck-svg"
          role="img"
          aria-label="The counter demo's 398 MiB checkpoint image as a horizontal memory map, zero runs compressed. User allocations are packed from the front, roughly newest first — a thin highlighted sliver near the start is the counter. Most of the bar is zeros. Near the tail sits a block of driver state, about 10 MiB. An arrow under the front of the bar reads: the process's device allocations, roughly newest first."
        >
          <defs>
            <marker id="ck-ar" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="strokeWidth">
              <path className="mk" d="M0 0 L8 4.5 L0 9 z" />
            </marker>
          </defs>
          <rect className="seg" x="96" y="64" width="20" height="48" fill="#f4d6c0" />
          <rect className="seg" x="560" y="64" width="140" height="48" fill="#cee2f5" />
          <rect className="box" x="48" y="64" width="752" height="48" rx="6" fill="none" />
          <path className="brk" d="M 320 98 L 330 78 M 326 98 L 336 78" />
          <path className="brk" d="M 744 98 L 754 78 M 750 98 L 760 78" />
          <text className="rl" x="106" y="34" textAnchor="middle">the counter</text>
          <line className="div" x1="106" y1="40" x2="106" y2="62" />
          <text className="rl" x="630" y="34" textAnchor="middle">driver state · ~10 MiB</text>
          <line className="div" x1="630" y1="40" x2="630" y2="62" />
          <text className="tag" x="440" y="92" textAnchor="middle">zeros</text>
          <path className="aln" d="M 96 130 L 250 130" markerEnd="url(#ck-ar)" />
          <text className="tag" x="262" y="134" textAnchor="start">the process&apos;s device allocations, roughly newest first</text>
          <text className="tag" x="800" y="134" textAnchor="end">398 MiB</text>
        </svg>
      </div>
      <div className="ck-mobile">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 360 420"
          className="ck-svg"
          role="img"
          aria-label="The same memory map stacked vertically for mobile: the counter near the top where allocations are packed roughly newest first, a long run of zeros, and about 10 MiB of driver state near the bottom, in a 398 MiB image."
        >
          <defs>
            <marker id="ck-arm" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="strokeWidth">
              <path className="mk" d="M0 0 L8 4.5 L0 9 z" />
            </marker>
          </defs>
          <rect className="seg" x="28" y="58" width="88" height="18" fill="#f4d6c0" />
          <rect className="seg" x="28" y="252" width="88" height="70" fill="#cee2f5" />
          <rect className="box" x="28" y="32" width="88" height="352" rx="6" fill="none" />
          <path className="brk" d="M 62 152 L 82 162 M 62 160 L 82 170" />
          <path className="brk" d="M 62 348 L 82 358 M 62 356 L 82 366" />
          <text className="rl" x="132" y="72">the counter</text>
          <path className="aln" d="M 132 90 L 132 170" markerEnd="url(#ck-arm)" />
          <text className="tag" x="144" y="118">device allocations,</text>
          <text className="tag" x="144" y="134">roughly newest first</text>
          <text className="tag" x="72" y="215" textAnchor="middle">zeros</text>
          <text className="rl" x="132" y="282">driver state</text>
          <text className="tag" x="132" y="298">~10 MiB</text>
          <text className="tag" x="28" y="404">398 MiB</text>
        </svg>
      </div>
    </div>
  )
}
