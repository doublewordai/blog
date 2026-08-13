import {SIM_CSS} from './gpuread-shared'

// The route map: the load's path drawn as a horizontal chain of stations,
// repeated through the post as a progress strip. `at` names the current
// station; everything behind it is tinted (the load has been there),
// everything ahead is gray. `at="back"` draws the return leg: every station
// tinted, arrows reversed. The sub-label, where present, is the measured
// round-trip cost of a load served at that station; stations without one
// are pass-through — nothing is served there.
const STATIONS = [
  {key: 'warp', label: 'warp', sub: ''},
  {key: 'coalescer', label: 'coalescer', sub: ''},
  {key: 'l1', label: 'L1', sub: '15 ns'},
  {key: 'tlb', label: 'TLB', sub: ''},
  {key: 'xbar', label: 'crossbar', sub: ''},
  {key: 'l2', label: 'L2', sub: '127 ns'},
  {key: 'mc', label: 'controller', sub: ''},
  {key: 'dram', label: 'DRAM', sub: '255 ns'},
] as const

const STNMAP_CSS = `
.stnmap { margin: 1.5rem 0; }
.stnmap .stn-scroll { overflow-x: auto; overflow-y: hidden; }
.stnmap .stn-grid { display: grid; grid-template-columns: repeat(8, 1fr);
	column-gap: 18px; row-gap: 5px; min-width: 540px; padding: 2px; }
.stnmap .stn { position: relative; border-radius: 5px; padding: 5px 2px 4px;
	text-align: center; background: var(--tile); }
.stnmap .stn .nm { font-size: 11.5px; line-height: 1.3; color: var(--muted);
	white-space: nowrap; }
.stnmap .stn .sub { font-family: var(--font-mono); font-size: 8.5px;
	line-height: 1.4; color: var(--faint); white-space: nowrap; }
.stnmap .stn.past { background: var(--accent-wash); }
.stnmap .stn.past .nm { color: var(--ink); }
.stnmap .stn.past .sub { color: var(--muted); }
.stnmap .stn.here { background: var(--accent-wash);
	box-shadow: 0 0 0 1.5px var(--accent); }
.stnmap .stn.here .nm { color: var(--accent); }
.stnmap .stn.here .sub { color: var(--accent); opacity: 0.75; }
.stnmap .stn.ahead .nm { color: var(--faint); }
.stnmap .arr { position: absolute; right: -16px; top: 50%;
	transform: translateY(-50%); width: 14px; height: 8px; color: var(--faint); }
.stnmap .arr line { stroke: currentColor; stroke-width: 1.5; }
.stnmap .arr path { fill: currentColor; }
.stnmap .arr.gone { color: var(--accent); }
.stnmap .arr.rev { transform: translateY(-50%) scaleX(-1); }
.stnmap .br { display: flex; flex-direction: column; }
.stnmap .tick { height: 4px; border: 1px solid var(--faint); border-top: none;
	border-radius: 0 0 3px 3px; opacity: 0.6; }
.stnmap .brlbl { text-align: center; font-size: 9.5px; color: var(--faint);
	margin-top: 2px; }
`

export default function GpuStationMap({at = 'warp'}: {at?: string}) {
  const back = at === 'back'
  const idx = back ? STATIONS.length : STATIONS.findIndex((s) => s.key === at)

  const cls = (i: number) => (back || i < idx ? 'past' : i === idx ? 'here' : 'ahead')
  const names = STATIONS.map((s) => s.label).join(', ')
  const aria = back
    ? `The load's route — ${names} — with every station visited and the arrows reversed: the data is on its way back.`
    : `The load's route drawn as eight stations: ${names}. The first four sit inside the SM, the next three on the die, the DRAM on the board. Under the stations that can serve the load, the measured round-trip cost of a hit there: L1 15 nanoseconds, L2 127, DRAM 255. Currently at ${STATIONS[idx]?.label}; earlier stations are tinted, later ones gray.`

  return (
    <div className="gsim stnmap" role="img" aria-label={aria}>
      <style dangerouslySetInnerHTML={{__html: SIM_CSS + STNMAP_CSS}} />
      <div className="stn-scroll">
        <div className="stn-grid">
          {STATIONS.map((s, i) => (
            <div className={'stn ' + cls(i)} key={i}>
              <div className="nm">{s.label}</div>
              <div className="sub mono">{s.sub || ' '}</div>
              {i < STATIONS.length - 1 && (
                <svg
                  className={'arr' + (back || i < idx ? ' gone' : '') + (back ? ' rev' : '')}
                  viewBox="0 0 14 8"
                  aria-hidden="true"
                >
                  <line x1="0" y1="4" x2="9" y2="4"></line>
                  <path d="M8 0.5 L13.5 4 L8 7.5 z"></path>
                </svg>
              )}
            </div>
          ))}
          <div className="br" style={{gridColumn: '1 / span 4'}}>
            <div className="tick"></div>
            <div className="brlbl">SM</div>
          </div>
          <div className="br" style={{gridColumn: '5 / span 3'}}>
            <div className="tick"></div>
            <div className="brlbl">die</div>
          </div>
          <div className="br" style={{gridColumn: '8'}}>
            <div className="tick"></div>
            <div className="brlbl">board</div>
          </div>
        </div>
      </div>
    </div>
  )
}
