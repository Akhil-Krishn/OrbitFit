import { type Group, label } from './lib'

// Right half of the body is drawn once, then mirrored across x=100.
interface M { g: Group | null; d: string }
const NEUTRAL_COMMON: M[] = [
  { g: null, d: 'M100 8 C112 8 119 20 119 32 C119 46 111 56 100 56 Z' },
  { g: null, d: 'M100 52 L113 54 L121 66 L100 62 Z' },
  { g: null, d: 'M100 58 C122 60 140 68 150 84 L152 120 C146 150 138 170 138 196 L100 200 Z' },
  { g: null, d: 'M158 168 C165 174 171 192 175 214 C171 219 164 217 160 209 C153 192 151 178 156 168 Z' },
  { g: null, d: 'M170 216 C177 222 179 236 175 245 C168 247 162 238 160 226 Z' },
  { g: null, d: 'M106 292 C114 299 128 299 135 292 L133 306 C124 311 113 311 108 306 Z' },
  { g: null, d: 'M108 388 C120 386 131 389 133 400 L135 412 L106 412 Z' },
]
const DELT = 'M126 70 C142 64 158 74 160 92 C160 104 156 112 151 118 C147 108 139 98 130 92 Z'
const ARM = 'M148 112 C156 106 165 112 166 126 C167 142 163 156 159 167 C152 165 148 152 146 138 C145 128 146 120 148 112 Z'
const CALF_F = 'M110 304 C120 299 131 305 131 322 C131 350 127 372 123 389 C116 391 112 385 110 372 C106 350 106 322 110 304 Z'
const CALF_B = 'M107 304 C122 297 136 306 134 328 C132 352 127 372 122 388 C115 389 111 380 109 366 C105 346 104 322 107 304 Z'

const FRONT: M[] = [
  ...NEUTRAL_COMMON,
  { g: 'shoulders', d: DELT }, { g: 'chest', d: 'M102 76 C113 71 126 72 133 81 C137 93 133 105 122 109 C112 111 104 107 102 101 Z' },
  { g: 'biceps', d: ARM }, { g: 'core', d: 'M102 113 L125 109 C129 131 127 157 121 177 C114 184 106 184 102 180 Z' },
  { g: 'quadriceps', d: 'M102 194 C117 186 135 191 139 207 C143 241 139 271 133 291 C125 297 112 295 106 289 C102 263 100 223 102 194 Z' },
  { g: 'calves', d: CALF_F },
]
const BACK: M[] = [
  ...NEUTRAL_COMMON,
  { g: 'back', d: 'M100 56 C115 58 131 66 139 76 C135 97 121 108 102 112 Z' },
  { g: 'back', d: 'M102 114 C121 110 135 100 140 98 C141 121 135 151 125 173 L102 177 Z' },
  { g: 'shoulders', d: DELT }, { g: 'triceps', d: ARM },
  { g: 'glutes', d: 'M102 172 C119 168 140 178 141 200 C141 220 129 230 114 228 C106 226 102 220 102 212 Z' },
  { g: 'hamstrings', d: 'M102 232 C117 230 135 238 137 255 C139 277 135 292 131 304 C121 309 110 305 105 297 C101 277 100 254 102 232 Z' },
  { g: 'calves', d: CALF_B },
]
const LINES_F = 'M102 128 L123 125 M102 146 L124 143 M102 163 L122 160 M118 108 C122 120 124 135 123 150 M118 200 C121 230 119 260 116 286 M102 92 C112 96 124 96 133 88'
const LINES_B = 'M102 90 L132 90 M102 130 C112 128 122 122 132 112 M116 236 C118 262 117 282 115 298 M102 205 C112 206 124 210 136 204'

interface Props { intensity: Partial<Record<Group, number>>; onPick?: (g: Group) => void; picked?: Group | null }

function Half({ shapes, lines, intensity, onPick, picked }: Props & { shapes: M[]; lines: string }) {
  return (
    <>
      {shapes.map((s, i) => {
        const v = s.g ? intensity[s.g] ?? 0 : 0, on = !!s.g && picked === s.g
        return (
          <path key={i} d={s.d} className={s.g ? 'region cursor-pointer' : undefined}
            fill={v > 0 ? 'var(--c-accent)' : s.g ? 'var(--c-musc)' : 'var(--c-body)'} fillOpacity={v > 0 ? 0.2 + 0.8 * v : 1}
            stroke={on ? 'var(--c-ink)' : 'var(--c-outline)'} strokeWidth={on ? 2 : 1} strokeLinejoin="round"
            onClick={s.g && onPick ? () => onPick(s.g!) : undefined}>
            {s.g && <title>{label(s.g)}</title>}
          </path>
        )
      })}
      <path d={lines} fill="none" stroke="var(--c-ink)" strokeOpacity={0.3} strokeWidth={0.8} strokeLinecap="round" pointerEvents="none" />
    </>
  )
}

function Body({ title, shapes, lines, ...p }: Props & { title: string; shapes: M[]; lines: string }) {
  return (
    <figure className="min-w-0 flex-1">
      <svg viewBox="0 0 200 420" className="mx-auto h-auto max-h-[480px] w-full" role="img" aria-label={`${title} view of the body`}>
        <g><Half shapes={shapes} lines={lines} {...p} /></g>
        <g transform="translate(200 0) scale(-1 1)"><Half shapes={shapes} lines={lines} {...p} /></g>
      </svg>
      <figcaption className="text-center text-sm font-medium text-muted">{title}</figcaption>
    </figure>
  )
}

export default function MuscleMap(p: Props) {
  return (
    <div className="flex gap-2">
      <Body title="Front" shapes={FRONT} lines={LINES_F} {...p} />
      <Body title="Back" shapes={BACK} lines={LINES_B} {...p} />
    </div>
  )
}
