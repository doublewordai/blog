import {SIM_CSS} from './gpuread-shared'

// The DRAM chip's internal map, drawn as a repeated zoom: chip → one bank →
// one row → four columns. Each level's highlighted element opens into the
// next panel through a dashed cone, so the figure reads as magnifying the
// same spot over and over. The bank and channel we highlight are
// illustrative — those address bits weren't recovered — but the
// row-and-four-columns shape is the measured one.

// bank tiles: two channels, 8×2 tiles each
const TILE_W = 34
const TILE_STRIDE = 38.5
const CH_X = [14, 346]
const TILE_ROW_Y = [40, 58]
// the highlighted bank: channel 0, second row, third tile
const OUR_BANK = {x: CH_X[0] + 8 + 2 * TILE_STRIDE, y: TILE_ROW_Y[1]}
// bank panel rows: five strips, an ellipsis, five strips; ours is deep in the
// bottom group so the second cone crosses almost nothing
const ROWS_TOP = [150, 163, 176]
const ROWS_BOT = [204, 217, 230]
const OUR_ROW_Y = 216
// row panel columns
const COL_W = 18.4
const COL_STRIDE = 20.4
const OUR_COLS = [12, 13, 14, 15]

const DRAMMAP_CSS = `
.drammap { margin: 1.75rem 0; }
.drammap .cm-head { display: flex; justify-content: space-between; margin-bottom: 6px; }
.drammap .cm-code { font-family: var(--font-mono); font-size: 11px; color: var(--muted);
	letter-spacing: 0.06em; }
.drammap svg { display: block; width: 100%; height: auto; }
.drammap .box { fill: none; stroke: var(--faint); stroke-width: 1; }
.drammap .box.paper { fill: var(--page); }
.drammap .wire { stroke: var(--faint); stroke-width: 1; opacity: 0.7; }
.drammap .tile { fill: var(--tile-hover); }
.drammap .tile.ours { fill: var(--accent-wash); stroke: var(--accent); stroke-width: 1.5; }
.drammap .tile.full { fill: var(--accent); }
.drammap .cone { fill: var(--accent); opacity: 0.05; }
.drammap .coneline { stroke: var(--accent); stroke-width: 1; opacity: 0.35;
	stroke-dasharray: 3 3; }
.drammap .lbl { font-family: var(--font-sans); font-size: 10px; fill: var(--muted); }
.drammap .sub { font-family: var(--font-sans); font-size: 9.5px; fill: var(--faint); }
`

export default function GpuDramMap() {
  const aria =
    'The internal map of one GDDR6X chip, drawn as a repeated zoom. The 2 ' +
    'gigabyte chip splits into two channels of 1 gigabyte, each with its own ' +
    'bus leaving the chip for the memory controller — a wide data bundle and a ' +
    'narrower command bundle — and 16 banks of 64 megabytes. One bank tile ' +
    'opens into a panel of its 65,536 rows of 1 kilobyte; one row opens again ' +
    'into its 32 columns of 32 bytes, with four adjacent columns highlighted — ' +
    'our four sectors. Which bank and channel are highlighted is illustrative; ' +
    'the row-and-columns shape is measured.'

  return (
    <div className="gsim drammap" role="img" aria-label={aria}>
      <style dangerouslySetInnerHTML={{__html: SIM_CSS + DRAMMAP_CSS}} />
      <div className="cm-head">
        <span className="cm-code">GDDR6X</span>
      </div>
      <svg viewBox="0 -26 680 384" xmlns="http://www.w3.org/2000/svg">
        {/* each channel's bus, out of the chip toward the memory controller:
             a wide bundle (16 data pins) and a narrow one (~10 command/address) */}
        {[174, 506].map((cx, ci) => (
          <g key={ci}>
            {Array.from({length: 16}, (_, i) => cx - 62.5 + i * 5).map((x) => (
              <line className="wire" x1={x} y1="16" x2={x} y2="-20" key={x} />
            ))}
            {Array.from({length: 10}, (_, i) => cx + 26.5 + i * 4).map((x) => (
              <line className="wire" x1={x} y1="16" x2={x} y2="-20" key={x} />
            ))}
          </g>
        ))}

        {/* zoom cones, drawn before the panels so panels sit on their wide ends */}
        <polygon
          className="cone"
          points={`${OUR_BANK.x},72 ${OUR_BANK.x + TILE_W},72 676,124 4,124`}
        ></polygon>
        <line className="coneline" x1={OUR_BANK.x} y1="72" x2="4" y2="124"></line>
        <line className="coneline" x1={OUR_BANK.x + TILE_W} y1="72" x2="676" y2="124"></line>

        {/* the chip */}
        <rect className="box" x="4" y="6" width="672" height="84" rx="10"></rect>
        {CH_X.map((chx, ch) => (
          <g key={ch}>
            <rect className="box" x={chx} y="16" width="320" height="64" rx="6" />
            <text className="lbl" x={chx + 8} y="32">
              channel {ch} · 1 GiB
            </text>
            {TILE_ROW_Y.map((ty) =>
              Array.from({length: 8}).map((_, i) => (
                <rect
                  className={
                    'tile' +
                    (ch === 0 && ty === OUR_BANK.y && chx + 8 + i * TILE_STRIDE === OUR_BANK.x
                      ? ' ours'
                      : '')
                  }
                  x={chx + 8 + i * TILE_STRIDE}
                  y={ty}
                  width={TILE_W}
                  height="14"
                  rx="2"
                  key={`${ty}-${i}`}
                />
              ))
            )}
          </g>
        ))}

        {/* one bank */}
        <rect className="box paper" x="4" y="124" width="672" height="126" rx="8"></rect>
        <text className="lbl" x="14" y="142">
          one bank · 65,536 rows of 1 KiB
        </text>
        {ROWS_TOP.map((y) => (
          <rect className="tile" x="90" y={y} width="500" height="9" rx="1.5" key={y} />
        ))}
        <text className="sub" x="340" y="197" textAnchor="middle">
          ⋯
        </text>
        {ROWS_BOT.map((y) =>
          y === 217 ? (
            <rect className="tile ours" x="90" y={OUR_ROW_Y} width="500" height="10" rx="1.5" key={y} />
          ) : (
            <rect className="tile" x="90" y={y} width="500" height="9" rx="1.5" key={y} />
          )
        )}

        {/* the second cone sits over the bank panel so its dashes attach to
             the row itself, under the row panel below */}
        <polygon className="cone" points="90,226 590,226 676,280 4,280"></polygon>
        <line className="coneline" x1="90" y1="226" x2="4" y2="280"></line>
        <line className="coneline" x1="590" y1="226" x2="676" y2="280"></line>

        {/* one row */}
        <rect className="box paper" x="4" y="280" width="672" height="72" rx="8"></rect>
        <text className="lbl" x="14" y="298">
          one row · 1 KiB · 32 columns of 32 B
        </text>
        {Array.from({length: 32}).map((_, i) => (
          <rect
            className={'tile' + (OUR_COLS.includes(i) ? ' full' : '')}
            x={14 + i * COL_STRIDE}
            y="306"
            width={COL_W}
            height="26"
            rx="2"
            key={i}
          />
        ))}
      </svg>
    </div>
  )
}
