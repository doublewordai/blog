'use client'

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import styles from './CriuDataPath.module.css'

type Phase = 'all' | 'dump' | 'restore'
type DataPhase = Exclude<Phase, 'all'>
type Route = 'zero' | 'raw' | 'lz4'

type StageId =
  | 'process-memory'
  | 'page-pipe'
  | 'compress-blocks'
  | 'pages-image'
  | 'pagemap-metadata'
  | 'inventory-pagemap'
  | 'validate-layout'
  | 'plan-batch'
  | 'restore-pages-image'
  | 'read-stored'
  | Route
  | 'restored-memory'

type Stage = {
  phase: DataPhase
  title: string
  detail: string
}

type Detail = {
  label: string
  title: string
  copy: string
}

const STAGES: Record<StageId, Stage> = {
  'process-memory': {
    phase: 'dump',
    title: 'Process memory',
    detail:
      'CRIU collects present pages from the target process while preserving the mapping boundaries restore will need later.',
  },
  'page-pipe': {
    phase: 'dump',
    title: 'Page pipe',
    detail:
      'The page pipe carries captured page bytes with their virtual-address ranges. In block-compression mode, CRIU starts a new range at each VMA boundary.',
  },
  'compress-blocks': {
    phase: 'dump',
    title: 'Compress blocks',
    detail:
      'CRIU first checks whether a block contains only zeroes, then runs LZ4 on non-zero blocks. It stores the LZ4 output only when it reduces the block size by more than 12.5%; otherwise, it stores the original bytes.',
  },
  'pages-image': {
    phase: 'dump',
    title: 'pages-*.img',
    detail:
      'The pages image stores raw or LZ4-compressed bytes for each non-zero block. Zero-filled blocks are recorded in the pagemap with no page data.',
  },
  'pagemap-metadata': {
    phase: 'dump',
    title: 'Pagemap metadata',
    detail:
      'Per-block stored sizes and pages-per-block metadata let restore locate variable-length data and distinguish zero, raw, and LZ4 representations.',
  },
  'inventory-pagemap': {
    phase: 'restore',
    title: 'Inventory + pagemap',
    detail:
      "The inventory identifies the image version and compression mode. Each checkpoint's pagemap records its virtual ranges. Entries with compression metadata also include block_sizes[], pages_per_block, and total_payload_size.",
  },
  'validate-layout': {
    phase: 'restore',
    title: 'Validate image metadata',
    detail:
      'Before reading page data, CRIU validates virtual ranges, block counts, each stored size, their total, and that the calculated pages-image offsets do not overflow. Truncation is detected later, when CRIU reads the page data.',
  },
  'plan-batch': {
    phase: 'restore',
    title: 'Build restore batches',
    detail:
      "The page reader uses each block's stored size to choose the zero, raw, or LZ4 restore path. For pagemap entries with compression metadata, CRIU limits each restore batch to 32 MiB of page data after decompression. This keeps input buffers and block descriptions bounded even for very large checkpoints.",
  },
  'restore-pages-image': {
    phase: 'restore',
    title: 'pages-*.img input',
    detail:
      'The pages image contains the stored bytes for each non-zero block. CRIU reads the sum of the block_sizes[] values selected for a batch; zero-filled blocks require no page-data read.',
  },
  'read-stored': {
    phase: 'restore',
    title: 'Read stored bytes',
    detail:
      'For a batch described by block metadata, CRIU copies the selected block_sizes[] values, sums them as total_bytes, and reads exactly that byte count. When its image offset and length are page-aligned, RAW data can be read using direct I/O.',
  },
  zero: {
    phase: 'restore',
    title: 'Zero block: read 0, fill N',
    detail:
      'S = 0 marks an all-zero block. CRIU reads no bytes from pages-*.img and writes N bytes into restored process memory by zero-filling inline or through worker jobs when parallel zero-filling is enabled.',
  },
  raw: {
    phase: 'restore',
    title: 'Raw block: read N, no decompression',
    detail:
      'S = N marks raw fallback. CRIU reads the original N block bytes. When their image offset and length are page-aligned, it can read them using direct I/O. No LZ4 operation runs.',
  },
  lz4: {
    phase: 'restore',
    title: 'LZ4 block: read S, decompress to N',
    detail:
      '0 < S < N marks LZ4-compressed data. The page reader reads S stored bytes and decompresses them into N bytes in the prepared mappings before CRIU hands control to the final restorer. A batch can use the worker pool when it contains enough work for parallel decompression.',
  },
  'restored-memory': {
    phase: 'restore',
    title: 'Restored process memory',
    detail:
      'Every path reconstructs the same N-byte memory block. CRIU either fills it with zeros, reads raw bytes without decompression, or decompresses LZ4 data.',
  },
}

const PHASE_COPY: Record<Phase, Detail> = {
  all: {
    label: 'Reading the full flow',
    title: 'Metadata controls the work; the pages image supplies stored bytes',
    copy:
      'For stored size S and in-memory block size N, restore reads 0 bytes for zero, N for raw, or S for LZ4. Every path writes N bytes into restored process memory.',
  },
  dump: {
    label: 'Checkpoint path',
    title: 'Compress before writing the pages image',
    copy:
      'CRIU stores each block as zero, raw, or LZ4. It writes non-zero block data to pages-*.img and records block sizes and pages per block in the pagemap.',
  },
  restore: {
    label: 'Restore path',
    title: 'Validate and plan before reading page data',
    copy:
      'CRIU validates the image metadata first, then forms bounded batches. Zero bypasses image I/O; raw reads N bytes without decompression; LZ4 reads S stored bytes and produces N bytes after decompression.',
  },
}

const CHECKPOINT_STAGES: StageId[] = [
  'process-memory',
  'page-pipe',
  'compress-blocks',
  'pages-image',
  'pagemap-metadata',
]

const RESTORE_STAGES: StageId[] = [
  'inventory-pagemap',
  'validate-layout',
  'plan-batch',
  'restore-pages-image',
  'read-stored',
  'zero',
  'raw',
  'lz4',
  'restored-memory',
]

const MOBILE_SUMMARY: Record<StageId, string> = {
  'process-memory': 'checkpointed mappings',
  'page-pipe': 'pages + ranges',
  'compress-blocks': 'zero · raw · LZ4',
  'pages-image': 'memory page data',
  'pagemap-metadata': 'sizes + pages/block',
  'inventory-pagemap': 'block metadata',
  'validate-layout': 'counts · sizes · totals · offsets',
  'plan-batch': 'choose zero, raw, or LZ4 path',
  'restore-pages-image': 'memory page data',
  'read-stored': 'total for the planned range',
  zero: 'S = 0 · fill N',
  raw: 'S = N · no decompression',
  lz4: '0 < S < N · decompress N',
  'restored-memory': 'N bytes from every path',
}

function joinClasses(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

function isRoute(value: StageId | null): value is Route {
  return value === 'zero' || value === 'raw' || value === 'lz4'
}

type MotionState = {
  phase: DataPhase
  route: Route | null
  run: number
}

const InteractionContext = createContext(false)
const subscribeToHydration = (onStoreChange: () => void) => {
  const timeout = window.setTimeout(onStoreChange, 0)
  return () => window.clearTimeout(timeout)
}
const getClientHydrationState = () => true
const getServerHydrationState = () => false

type MotionSegment = {
  kind: 'checkpoint' | 'control' | 'read' | 'write'
  path: string
  delay: number
  duration: number
  routes?: Route[]
}

const CHECKPOINT_PATHS = {
  memoryToPipe: 'M 210 139 H 252',
  pipeToCompression: 'M 404 139 H 452',
  compressionToPages: 'M 644 139 H 724',
  compressionToMetadata: 'M 548 177 V 228 H 724',
} as const

const REPRESENTATION_LAYOUT = {
  x: 670,
  width: 176,
  centerX: 758,
  inputBranchX: 646,
  outputBranchX: 856,
} as const

const representationRight = REPRESENTATION_LAYOUT.x + REPRESENTATION_LAYOUT.width

const RESTORE_PATHS = {
  inventoryToValidation: 'M 216 390 H 250',
  validationToPlan: 'M 426 390 H 460',
  planToZero: `M 636 390 H ${REPRESENTATION_LAYOUT.inputBranchX} V 364 H ${REPRESENTATION_LAYOUT.x}`,
  planToStoredData: 'M 548 436 V 486',
  pagesToStoredData: 'M 216 524 H 460',
  storedDataToRaw: `M 636 524 H ${REPRESENTATION_LAYOUT.inputBranchX} V 478 H ${REPRESENTATION_LAYOUT.x}`,
  storedDataToLz4: `M 636 524 H ${REPRESENTATION_LAYOUT.inputBranchX} V 592 H ${REPRESENTATION_LAYOUT.x}`,
  zeroToMemory: `M ${representationRight} 364 H ${REPRESENTATION_LAYOUT.outputBranchX} V 458 H 878`,
  rawToMemory: `M ${representationRight} 478 H ${REPRESENTATION_LAYOUT.outputBranchX} V 488 H 878`,
  lz4ToMemory: `M ${representationRight} 592 H ${REPRESENTATION_LAYOUT.outputBranchX} V 518 H 878`,
} as const

const CHECKPOINT_MOTION: MotionSegment[] = [
  {kind: 'checkpoint', path: CHECKPOINT_PATHS.memoryToPipe, delay: 0, duration: 0.38},
  {kind: 'checkpoint', path: CHECKPOINT_PATHS.pipeToCompression, delay: 0.4, duration: 0.38},
  {kind: 'checkpoint', path: CHECKPOINT_PATHS.compressionToPages, delay: 0.8, duration: 0.48},
  {kind: 'control', path: CHECKPOINT_PATHS.compressionToMetadata, delay: 1.3, duration: 0.52},
]

const RESTORE_MOTION: MotionSegment[] = [
  {kind: 'control', path: RESTORE_PATHS.inventoryToValidation, delay: 0, duration: 0.32, routes: ['zero', 'raw', 'lz4']},
  {kind: 'control', path: RESTORE_PATHS.validationToPlan, delay: 0.33, duration: 0.32, routes: ['zero', 'raw', 'lz4']},
  {kind: 'control', path: RESTORE_PATHS.planToZero, delay: 0.66, duration: 0.4, routes: ['zero']},
  {kind: 'control', path: RESTORE_PATHS.planToStoredData, delay: 0.66, duration: 0.4, routes: ['raw', 'lz4']},
  {kind: 'read', path: RESTORE_PATHS.pagesToStoredData, delay: 0.94, duration: 0.46, routes: ['raw', 'lz4']},
  {kind: 'write', path: RESTORE_PATHS.zeroToMemory, delay: 1.08, duration: 0.46, routes: ['zero']},
  {kind: 'read', path: RESTORE_PATHS.storedDataToRaw, delay: 1.42, duration: 0.4, routes: ['raw']},
  {kind: 'read', path: RESTORE_PATHS.storedDataToLz4, delay: 1.42, duration: 0.4, routes: ['lz4']},
  {kind: 'write', path: RESTORE_PATHS.rawToMemory, delay: 1.84, duration: 0.46, routes: ['raw']},
  {kind: 'write', path: RESTORE_PATHS.lz4ToMemory, delay: 1.84, duration: 0.46, routes: ['lz4']},
]

function MotionParticles({motion}: {motion: MotionState}) {
  const groupRef = useRef<SVGGElement>(null)
  const segments = motion.phase === 'dump' ? CHECKPOINT_MOTION : RESTORE_MOTION
  const visible = motion.route
    ? segments.filter((segment) => !segment.routes || segment.routes.includes(motion.route!))
    : segments

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      groupRef.current
        ?.querySelectorAll<SVGAnimationElement>('animate, animateMotion')
        .forEach((animation) => {
          const delay = Number(animation.dataset.delay ?? 0)
          animation.beginElementAt(delay)
        })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [motion])

  return (
    <g
      ref={groupRef}
      key={`${motion.phase}-${motion.route ?? 'all'}-${motion.run}`}
      className={styles.particles}
      aria-hidden="true"
    >
      {visible.map((segment, index) => (
        <circle
          key={`${segment.path}-${index}`}
          className={joinClasses(styles.particle, styles[`particle${segment.kind[0].toUpperCase()}${segment.kind.slice(1)}`])}
          r={segment.kind === 'control' ? 5 : 6}
          opacity="0"
        >
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.08;0.9;1"
            dur={`${segment.duration}s`}
            begin="indefinite"
            data-delay={segment.delay}
            fill="remove"
          />
          <animateMotion
            path={segment.path}
            dur={`${segment.duration}s`}
            begin="indefinite"
            data-delay={segment.delay}
            fill="remove"
          />
        </circle>
      ))}
    </g>
  )
}

type SvgStageProps = {
  id: StageId
  selected: StageId | null
  onSelect: (id: StageId) => void
  className?: string
  children: ReactNode
}

function SvgStage({id, selected, onSelect, className, children}: SvgStageProps) {
  const interactive = useContext(InteractionContext)
  const stage = STAGES[id]
  const active = selected === id
  const stageClassName = joinClasses(
    styles.node,
    stage.phase === 'dump' ? styles.dumpPhase : styles.restorePhase,
    interactive && styles.interactiveNode,
    className,
    active && styles.selected,
  )

  if (!interactive) {
    return <g className={stageClassName} data-stage={id}>{children}</g>
  }

  return (
    <g
      className={stageClassName}
      data-stage={id}
      role="button"
      tabIndex={0}
      aria-label={`${stage.title}. ${stage.detail}`}
      aria-current={active ? 'step' : undefined}
      onClick={() => onSelect(id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(id)
        }
      }}
    >
      {children}
    </g>
  )
}

type MobileNodeProps = {
  id: StageId
  selected: StageId | null
  detailId: string
  onSelect: (id: StageId) => void
  className?: string
}

function MobileNode({id, selected, detailId, onSelect, className}: MobileNodeProps) {
  const interactive = useContext(InteractionContext)
  const active = selected === id
  const nodeClassName = joinClasses(styles.mobileNode, className, active && styles.mobileNodeSelected)
  const content = (
    <>
      <strong>{STAGES[id].title.replace(/:.*$/, '')}</strong>
      <span>{MOBILE_SUMMARY[id]}</span>
    </>
  )

  if (!interactive) {
    return <div className={nodeClassName}>{content}</div>
  }

  return (
    <button
      type="button"
      className={nodeClassName}
      aria-pressed={active}
      aria-expanded={active}
      aria-controls={active ? detailId : undefined}
      onClick={() => onSelect(id)}
    >
      {content}
    </button>
  )
}

function StageDetail({id, detailId}: {id: StageId; detailId: string}) {
  const stage = STAGES[id]
  return (
    <div id={detailId} className={styles.mobileDetail}>
      <p className={styles.detailLabel}>{stage.phase === 'dump' ? 'Checkpoint stage' : 'Restore stage'}</p>
      <p className={styles.detailTitle}>{stage.title}</p>
      <p className={styles.detailCopy}>{stage.detail}</p>
    </div>
  )
}

export default function CriuDataPath() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationState,
    getServerHydrationState,
  )
  const reactId = useId()
  const idPrefix = `criu-data-path-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const figureTitleId = `${idPrefix}-title`
  const svgTitleId = `${idPrefix}-svg-title`
  const svgDescId = `${idPrefix}-svg-desc`
  const selectId = `${idPrefix}-stage-select`
  const mobileDumpLabelId = `${idPrefix}-mobile-dump-label`
  const mobileRestoreLabelId = `${idPrefix}-mobile-restore-label`
  const dumpMarkerId = `${idPrefix}-dump-arrow`
  const restoreMarkerId = `${idPrefix}-restore-arrow`
  const controlMarkerId = `${idPrefix}-control-arrow`
  const writeMarkerId = `${idPrefix}-write-arrow`

  const [phase, setPhase] = useState<Phase>('all')
  const [selected, setSelected] = useState<StageId | null>(null)
  const [motion, setMotion] = useState<MotionState | null>(null)
  const reducedMotion = useRef(false)
  const figureIsVisible = useRef(true)
  const figureRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => {
      reducedMotion.current = media.matches
      if (media.matches) setMotion(null)
    }
    const stopWhenHidden = () => {
      if (document.hidden) setMotion(null)
    }
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
          figureIsVisible.current = entry.isIntersecting
          if (!entry.isIntersecting) setMotion(null)
        })

    updatePreference()
    if (figureRef.current) observer?.observe(figureRef.current)
    media.addEventListener('change', updatePreference)
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () => {
      media.removeEventListener('change', updatePreference)
      document.removeEventListener('visibilitychange', stopWhenHidden)
      observer?.disconnect()
    }
  }, [])

  const startMotion = (nextPhase: DataPhase, route: Route | null = null) => {
    if (reducedMotion.current || document.hidden || !figureIsVisible.current) {
      setMotion(null)
      return
    }
    setMotion((current) => ({
      phase: nextPhase,
      route,
      run: (current?.run ?? 0) + 1,
    }))
  }

  const choosePhase = (nextPhase: Phase) => {
    setPhase(nextPhase)
    setSelected(null)
    if (nextPhase === 'all') setMotion(null)
    else startMotion(nextPhase)
  }

  const chooseStage = (id: StageId) => {
    const nextPhase = STAGES[id].phase
    setSelected(id)
    setPhase(nextPhase)
    startMotion(nextPhase, isRoute(id) ? id : null)
  }

  const detail: Detail = selected
    ? {
        label: STAGES[selected].phase === 'dump' ? 'Checkpoint stage' : 'Restore stage',
        title: STAGES[selected].title,
        copy: STAGES[selected].detail,
      }
    : PHASE_COPY[phase]

  const activeRoute = isRoute(selected) ? selected : null
  const routeClass = (routes: Route[]) =>
    activeRoute
      ? routes.includes(activeRoute)
        ? styles.routeActive
        : styles.routeMuted
      : undefined
  const mobileDetailId = selected ? `${idPrefix}-mobile-detail-${selected}` : `${idPrefix}-mobile-detail`

  return (
    <InteractionContext.Provider value={hydrated}>
      <figure
        ref={figureRef}
        className={styles.figure}
        data-active-phase={phase}
        data-enhanced={hydrated ? 'true' : 'false'}
        aria-labelledby={figureTitleId}
      >
      <header className={styles.header}>
        <p className={styles.figureTitle} id={figureTitleId}>CRIU Data Path</p>
        <p className={styles.headerCopy}>
          During checkpoint, CRIU stores each memory block as zero, raw, or LZ4-compressed. During restore,
          it reconstructs the block through the corresponding path.
        </p>
      </header>

      {hydrated && (
        <div className={styles.controls} aria-label="Explore the checkpoint image data path">
          <div className={styles.phaseSwitch} role="group" aria-label="Choose a phase">
            {([
              ['all', 'Full flow'],
              ['dump', 'Checkpoint'],
              ['restore', 'Restore'],
            ] as Array<[Phase, string]>).map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={phase === value}
                onClick={() => choosePhase(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className={styles.stageSelect} htmlFor={selectId}>
            <span>Inspect stage</span>
            <select
              id={selectId}
              value={selected ?? ''}
              onChange={(event) => {
                const value = event.target.value as StageId | ''
                if (value) chooseStage(value)
                else choosePhase('all')
              }}
            >
              <option value="">Choose a stage…</option>
              <optgroup label="Checkpoint">
                {CHECKPOINT_STAGES.map((id) => <option value={id} key={id}>{STAGES[id].title}</option>)}
              </optgroup>
              <optgroup label="Restore">
                {RESTORE_STAGES.map((id) => <option value={id} key={id}>{STAGES[id].title}</option>)}
              </optgroup>
            </select>
          </label>
        </div>
      )}

      <div className={styles.canvas}>
        <svg viewBox="0 0 1040 700" role="img" aria-labelledby={`${svgTitleId} ${svgDescId}`}>
          <title id={svgTitleId}>CRIU compressed memory checkpoint and restore pipeline</title>
          <desc id={svgDescId}>
            During checkpoint, process memory passes through the page pipe and compression step. Non-zero
            block bytes go to pages image files while stored sizes and pages-per-block metadata go to the
            pagemap. During restore, CRIU validates the metadata, builds restore batches, and reads only stored
            bytes. A zero block reads no page data, a raw block reads its full in-memory block size, and an LZ4
            block reads fewer stored bytes before decompression. Every path reconstructs the same block size in
            restored process memory.
          </desc>
          <defs>
            <marker id={dumpMarkerId} viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--dump)" />
            </marker>
            <marker id={restoreMarkerId} viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--read)" />
            </marker>
            <marker id={controlMarkerId} viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto">
              <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="var(--control)" strokeWidth="1.5" />
            </marker>
            <marker id={writeMarkerId} viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--write)" />
            </marker>
          </defs>

          <rect className={styles.lane} x="16" y="26" width="1008" height="242" rx="20" />
          <rect className={styles.lane} x="16" y="286" width="1008" height="398" rx="20" />
          <g className={joinClasses(styles.phaseLabel, styles.phaseLabelDump, styles.dumpPhase)}>
            <rect x="38" y="47" width="126" height="30" rx="15" />
            <text x="101" y="67" textAnchor="middle">CHECKPOINT</text>
          </g>
          <g className={joinClasses(styles.phaseLabel, styles.phaseLabelRestore, styles.restorePhase)}>
            <rect x="38" y="307" width="108" height="30" rx="15" />
            <text x="92" y="327" textAnchor="middle">RESTORE</text>
          </g>

          <g className={joinClasses(styles.edges, styles.dumpPhase)}>
            <path className={styles.dumpEdge} markerEnd={`url(#${dumpMarkerId})`} d={CHECKPOINT_PATHS.memoryToPipe} />
            <path className={styles.dumpEdge} markerEnd={`url(#${dumpMarkerId})`} d={CHECKPOINT_PATHS.pipeToCompression} />
            <path className={styles.dumpEdge} markerEnd={`url(#${dumpMarkerId})`} d={CHECKPOINT_PATHS.compressionToPages} />
            <path className={styles.controlEdge} markerEnd={`url(#${controlMarkerId})`} d={CHECKPOINT_PATHS.compressionToMetadata} />
          </g>

          <SvgStage id="process-memory" selected={selected} onSelect={chooseStage}>
            <rect x="46" y="100" width="164" height="78" rx="12" />
            <circle cx="76" cy="104" r="12" /><text className={styles.step} x="76" y="109" textAnchor="middle">1</text>
            <text className={styles.label} x="128" y="140" textAnchor="middle">Process memory</text>
            <text className={styles.meta} x="128" y="162" textAnchor="middle">process mappings</text>
          </SvgStage>
          <SvgStage id="page-pipe" selected={selected} onSelect={chooseStage}>
            <rect x="252" y="100" width="152" height="78" rx="12" />
            <circle cx="276" cy="104" r="12" /><text className={styles.step} x="276" y="109" textAnchor="middle">2</text>
            <text className={styles.label} x="328" y="140" textAnchor="middle">Page pipe</text>
            <text className={styles.meta} x="328" y="162" textAnchor="middle">pages + ranges</text>
          </SvgStage>
          <SvgStage id="compress-blocks" selected={selected} onSelect={chooseStage}>
            <rect x="452" y="100" width="192" height="78" rx="12" />
            <circle cx="476" cy="104" r="12" /><text className={styles.step} x="476" y="109" textAnchor="middle">3</text>
            <text className={styles.label} x="548" y="140" textAnchor="middle">Compress blocks</text>
            <text className={styles.meta} x="548" y="162" textAnchor="middle">zero · raw · LZ4</text>
          </SvgStage>
          <SvgStage id="pages-image" selected={selected} onSelect={chooseStage}>
            <rect x="724" y="100" width="252" height="78" rx="12" />
            <circle cx="748" cy="104" r="12" /><text className={styles.step} x="748" y="109" textAnchor="middle">4</text>
            <text className={joinClasses(styles.label, styles.code)} x="850" y="140" textAnchor="middle">pages-*.img</text>
            <text className={styles.meta} x="850" y="162" textAnchor="middle">memory page data</text>
          </SvgStage>
          <SvgStage id="pagemap-metadata" selected={selected} onSelect={chooseStage} className={styles.metadataNode}>
            <rect x="724" y="196" width="252" height="64" rx="12" />
            <text className={styles.label} x="850" y="221" textAnchor="middle">Pagemap metadata</text>
            <text className={styles.meta} x="850" y="246" textAnchor="middle">sizes + pages/block</text>
          </SvgStage>

          <g className={joinClasses(styles.edges, styles.restorePhase)}>
            <path className={joinClasses(styles.controlEdge, routeClass(['zero']))} markerEnd={`url(#${controlMarkerId})`} d={RESTORE_PATHS.planToZero} />
            <path className={joinClasses(styles.controlEdge, routeClass(['raw', 'lz4']))} markerEnd={`url(#${controlMarkerId})`} d={RESTORE_PATHS.planToStoredData} />
            <path className={joinClasses(styles.controlEdge, routeClass(['zero', 'raw', 'lz4']))} markerEnd={`url(#${controlMarkerId})`} d={RESTORE_PATHS.inventoryToValidation} />
            <path className={joinClasses(styles.controlEdge, routeClass(['zero', 'raw', 'lz4']))} markerEnd={`url(#${controlMarkerId})`} d={RESTORE_PATHS.validationToPlan} />
            <path className={joinClasses(styles.readEdge, routeClass(['raw', 'lz4']))} markerEnd={`url(#${restoreMarkerId})`} d={RESTORE_PATHS.pagesToStoredData} />
            <path className={joinClasses(styles.readEdge, routeClass(['raw']))} markerEnd={`url(#${restoreMarkerId})`} d={RESTORE_PATHS.storedDataToRaw} />
            <path className={joinClasses(styles.readEdge, routeClass(['lz4']))} markerEnd={`url(#${restoreMarkerId})`} d={RESTORE_PATHS.storedDataToLz4} />
            <path className={joinClasses(styles.writeEdge, routeClass(['zero']))} markerEnd={`url(#${writeMarkerId})`} d={RESTORE_PATHS.zeroToMemory} />
            <path className={joinClasses(styles.writeEdge, routeClass(['raw']))} markerEnd={`url(#${writeMarkerId})`} d={RESTORE_PATHS.rawToMemory} />
            <path className={joinClasses(styles.writeEdge, routeClass(['lz4']))} markerEnd={`url(#${writeMarkerId})`} d={RESTORE_PATHS.lz4ToMemory} />
            <text className={joinClasses(styles.edgeLabel, styles.edgeLabelRead, routeClass(['raw', 'lz4']))} x="338" y="514" textAnchor="middle">total stored bytes</text>
            <text className={joinClasses(styles.edgeLabel, styles.edgeLabelRead, routeClass(['raw']))} x="638" y="466" textAnchor="end">read N</text>
            <text className={joinClasses(styles.edgeLabel, styles.edgeLabelRead, routeClass(['lz4']))} x="638" y="580" textAnchor="end">read S</text>
          </g>

          <SvgStage id="inventory-pagemap" selected={selected} onSelect={chooseStage} className={styles.metadataNode}>
            <rect x="44" y="344" width="172" height="92" rx="12" />
            <circle cx="68" cy="348" r="12" /><text className={styles.step} x="68" y="354" textAnchor="middle">1</text>
            <text className={styles.label} x="130" y="377" textAnchor="middle">
              <tspan x="130">Inventory +</tspan><tspan x="130" dy="20">pagemap</tspan>
            </text>
            <text className={styles.meta} x="130" y="422" textAnchor="middle">block metadata</text>
          </SvgStage>
          <SvgStage id="validate-layout" selected={selected} onSelect={chooseStage} className={styles.metadataNode}>
            <rect x="250" y="344" width="176" height="92" rx="12" />
            <circle cx="274" cy="348" r="12" /><text className={styles.step} x="274" y="354" textAnchor="middle">2</text>
            <text className={styles.label} x="338" y="377" textAnchor="middle">
              <tspan x="338">Validate</tspan><tspan x="338" dy="20">metadata</tspan>
            </text>
            <text className={styles.meta} x="338" y="422" textAnchor="middle">counts · sizes · offsets</text>
          </SvgStage>
          <SvgStage id="plan-batch" selected={selected} onSelect={chooseStage}>
            <rect x="460" y="344" width="176" height="92" rx="12" />
            <circle cx="484" cy="348" r="12" /><text className={styles.step} x="484" y="354" textAnchor="middle">3</text>
            <text className={styles.label} x="548" y="377" textAnchor="middle">
              <tspan x="548">Build restore</tspan><tspan x="548" dy="20">batches</tspan>
            </text>
            <text className={styles.meta} x="548" y="422" textAnchor="middle">zero · raw · LZ4 paths</text>
          </SvgStage>
          <SvgStage id="restore-pages-image" selected={selected} onSelect={chooseStage} className={styles.storageNode}>
            <rect x="44" y="486" width="172" height="76" rx="12" />
            <text className={joinClasses(styles.label, styles.code)} x="130" y="520" textAnchor="middle">pages-*.img</text>
            <text className={styles.meta} x="130" y="542" textAnchor="middle">memory page data</text>
          </SvgStage>
          <SvgStage id="read-stored" selected={selected} onSelect={chooseStage}>
            <rect x="460" y="486" width="176" height="76" rx="12" />
            <circle cx="484" cy="490" r="12" /><text className={styles.step} x="484" y="495" textAnchor="middle">4</text>
            <text className={styles.label} x="548" y="522" textAnchor="middle">Read stored bytes</text>
            <text className={joinClasses(styles.meta, styles.equation, styles.compactEquation)} x="548" y="544" textAnchor="middle">sum(block_sizes)</text>
          </SvgStage>
          <SvgStage id="zero" selected={selected} onSelect={chooseStage} className={joinClasses(styles.representationNode, styles.zeroNode)}>
            <rect x={REPRESENTATION_LAYOUT.x} y="322" width={REPRESENTATION_LAYOUT.width} height="84" rx="18" />
            <text className={styles.label} x={REPRESENTATION_LAYOUT.centerX} y="348" textAnchor="middle">ZERO</text>
            <text className={joinClasses(styles.meta, styles.equation)} x={REPRESENTATION_LAYOUT.centerX} y="371" textAnchor="middle">S = 0</text>
            <text className={styles.operation} x={REPRESENTATION_LAYOUT.centerX} y="395" textAnchor="middle">fill N</text>
          </SvgStage>
          <SvgStage id="raw" selected={selected} onSelect={chooseStage} className={joinClasses(styles.representationNode, styles.rawNode)}>
            <rect x={REPRESENTATION_LAYOUT.x} y="436" width={REPRESENTATION_LAYOUT.width} height="84" rx="18" />
            <text className={styles.label} x={REPRESENTATION_LAYOUT.centerX} y="462" textAnchor="middle">RAW</text>
            <text className={joinClasses(styles.meta, styles.equation)} x={REPRESENTATION_LAYOUT.centerX} y="485" textAnchor="middle">S = N</text>
            <text className={styles.operation} x={REPRESENTATION_LAYOUT.centerX} y="509" textAnchor="middle">no decompression</text>
          </SvgStage>
          <SvgStage id="lz4" selected={selected} onSelect={chooseStage} className={joinClasses(styles.representationNode, styles.lz4Node)}>
            <rect x={REPRESENTATION_LAYOUT.x} y="550" width={REPRESENTATION_LAYOUT.width} height="84" rx="18" />
            <text className={styles.label} x={REPRESENTATION_LAYOUT.centerX} y="576" textAnchor="middle">LZ4</text>
            <text className={joinClasses(styles.meta, styles.equation)} x={REPRESENTATION_LAYOUT.centerX} y="599" textAnchor="middle">0 &lt; S &lt; N</text>
            <text className={styles.operation} x={REPRESENTATION_LAYOUT.centerX} y="623" textAnchor="middle">decompress N</text>
          </SvgStage>
          <SvgStage id="restored-memory" selected={selected} onSelect={chooseStage}>
            <rect x="878" y="440" width="130" height="96" rx="12" />
            <circle cx="902" cy="444" r="12" /><text className={styles.step} x="902" y="449" textAnchor="middle">5</text>
            <text className={styles.label} x="943" y="479" textAnchor="middle">Restored</text>
            <text className={styles.label} x="943" y="498" textAnchor="middle">memory</text>
            <text className={styles.meta} x="943" y="520" textAnchor="middle">N-byte block</text>
          </SvgStage>

          <g className={joinClasses(styles.legend, styles.restorePhase)}>
            <path className={styles.controlEdge} d="M 44 660 H 74" />
            <text x="84" y="665">metadata / control</text>
            <path className={styles.readEdge} d="M 300 660 H 330" />
            <text x="340" y="665">image read</text>
            <path className={styles.writeEdge} d="M 500 660 H 530" />
            <text x="540" y="665">memory write</text>
          </g>

          {motion && <MotionParticles motion={motion} />}
        </svg>
      </div>

      <div className={styles.mobile} aria-label="CRIU compressed memory pipeline">
        <section className={styles.mobileDump} aria-labelledby={mobileDumpLabelId}>
          <p className={styles.mobilePhaseLabel} id={mobileDumpLabelId}>Checkpoint</p>
          <ol>
            {(['process-memory', 'page-pipe', 'compress-blocks'] as StageId[]).map((id) => (
              <li key={id}>
                <MobileNode id={id} selected={selected} detailId={mobileDetailId} onSelect={chooseStage} />
                {selected === id && <StageDetail id={id} detailId={mobileDetailId} />}
              </li>
            ))}
            <li className={styles.mobileDestinations}>
              <div className={styles.mobileBranchGrid}>
                <MobileNode id="pages-image" selected={selected} detailId={mobileDetailId} onSelect={chooseStage} />
                <MobileNode id="pagemap-metadata" selected={selected} detailId={mobileDetailId} onSelect={chooseStage} className={styles.mobileMetadata} />
              </div>
              {(selected === 'pages-image' || selected === 'pagemap-metadata') && <StageDetail id={selected} detailId={mobileDetailId} />}
            </li>
          </ol>
        </section>

        <section className={styles.mobileRestore} aria-labelledby={mobileRestoreLabelId}>
          <p className={styles.mobilePhaseLabel} id={mobileRestoreLabelId}>Restore</p>
          <ol>
            {(['inventory-pagemap', 'validate-layout', 'plan-batch'] as StageId[]).map((id) => (
              <li key={id}>
                <MobileNode id={id} selected={selected} detailId={mobileDetailId} onSelect={chooseStage} />
                {selected === id && <StageDetail id={id} detailId={mobileDetailId} />}
              </li>
            ))}
            <li className={styles.mobileRestorePaths}>
              <div className={styles.mobilePathColumn}>
                <p>No page data read</p>
                <MobileNode id="zero" selected={selected} detailId={mobileDetailId} onSelect={chooseStage} className={styles.mobileZero} />
              </div>
              <div className={styles.mobilePathColumn}>
                <p>Page data read</p>
                <MobileNode id="restore-pages-image" selected={selected} detailId={mobileDetailId} onSelect={chooseStage} />
                <MobileNode id="read-stored" selected={selected} detailId={mobileDetailId} onSelect={chooseStage} />
                <div className={styles.mobileBranchGrid}>
                  <MobileNode id="raw" selected={selected} detailId={mobileDetailId} onSelect={chooseStage} className={styles.mobileRaw} />
                  <MobileNode id="lz4" selected={selected} detailId={mobileDetailId} onSelect={chooseStage} className={styles.mobileLz4} />
                </div>
              </div>
              {selected && ['zero', 'restore-pages-image', 'read-stored', 'raw', 'lz4'].includes(selected) && (
                <StageDetail id={selected} detailId={mobileDetailId} />
              )}
            </li>
            <li>
              <MobileNode id="restored-memory" selected={selected} detailId={mobileDetailId} onSelect={chooseStage} />
              {selected === 'restored-memory' && <StageDetail id="restored-memory" detailId={mobileDetailId} />}
            </li>
          </ol>
        </section>
      </div>

      <div className={styles.detail} aria-live="polite" aria-atomic="true">
        <p className={styles.detailLabel}>{detail.label}</p>
        <p className={styles.detailTitle}>{detail.title}</p>
        <p className={styles.detailCopy}>{detail.copy}</p>
      </div>

      <figcaption className={styles.caption}>
        <p>
          Dashed arrows show metadata and control. Solid arrows show reads from the pages image and writes into
          restored process memory. For each block, <code>S</code> is the stored byte count and <code>N</code> is
          the number of bytes written to restored process memory.
        </p>
        {hydrated && (
          <p className={styles.interactionNote}>
            Select Checkpoint or Restore to trace a complete phase. Select ZERO, RAW, or LZ4 to follow one restore
            path. Motion shows operation order, not duration, throughput, or data volume.
          </p>
        )}
        <p>
          The checkpoint path follows a non-zero block, whose data CRIU writes before recording the corresponding
          pagemap entry. Zero-filled blocks add no data to the pages image. If every block in an entry is stored
          raw, CRIU can omit the block metadata and use the standard uncompressed page-image format.
        </p>
      </figcaption>
      </figure>
    </InteractionContext.Provider>
  )
}
