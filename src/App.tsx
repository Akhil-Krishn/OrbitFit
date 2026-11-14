import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import MuscleMap from './MuscleMap'
import { EXERCISES, GROUPS, TIERS, WEEKLY_TARGET, type Group, type Tier, coverage, download, exById, fmtDay, fmtDur, fmtTime, fromISO, inWindow, insights, label, series, sessionDays, short, suggest, sum, toISO, today, useStore, volume } from './lib'

type Tab = 'today' | 'log' | 'health' | 'progress' | 'data'
const TABS: [Tab, string][] = [['today', 'Today'], ['log', 'Log workout'], ['health', 'Health checks'], ['progress', 'Progress'], ['data', 'Data & export']]
const card = 'border border-line bg-surface rounded-md p-5'
const btn = 'rounded-md px-4 py-2 text-sm font-semibold transition-colors'
const primary = `${btn} bg-accent text-white hover:brightness-90 disabled:opacity-40`
const ghost = `${btn} border border-line bg-surface hover:border-ink disabled:opacity-40`
const field = 'mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm'
const tip = { background: 'var(--c-surface)', border: '1px solid var(--c-line)', borderRadius: 6 }
const ax = { stroke: 'var(--c-muted)', fontSize: 12, tickLine: false, axisLine: false } as const
const grid = <CartesianGrid stroke="var(--c-grid)" vertical={false} />

function useTheme() {
  const [t, setT] = useState<'light' | 'dark'>(() => {
    try { const v = localStorage.getItem('orbitfit-theme'); if (v === 'light' || v === 'dark') return v } catch { /* ignore */ }
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => { document.documentElement.dataset.theme = t; try { localStorage.setItem('orbitfit-theme', t) } catch { /* ignore */ } }, [t])
  return [t, () => setT(x => (x === 'dark' ? 'light' : 'dark'))] as const
}

function useTimer() {
  const [acc, setAcc] = useState(0), [t0, setT0] = useState<number | null>(null), [now, setNow] = useState(Date.now())
  useEffect(() => { if (t0 === null) return; const i = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(i) }, [t0])
  const elapsed = acc + (t0 !== null ? Math.floor((now - t0) / 1000) : 0)
  return {
    elapsed, running: t0 !== null,
    start: () => { setNow(Date.now()); setT0(Date.now()) },
    pause: () => { if (t0 !== null) { setAcc(elapsed); setT0(null) } },
    reset: () => { setAcc(0); setT0(null) },
  }
}

type S = ReturnType<typeof useStore>
type P = { s: S['s']; setS: S['setS']; timer: ReturnType<typeof useTimer>; go: (t: Tab) => void }

export default function App() {
  const { s, setS, setSample, clearAll } = useStore()
  const [tab, setTab] = useState<Tab>('today')
  const [theme, toggle] = useTheme()
  const timer = useTimer()
  const props = { s, setS, timer, go: setTab }
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4">
          <span className="py-3 text-lg font-extrabold tracking-tight">OrbitFit</span>
          <nav className="flex flex-1 flex-wrap" aria-label="Sections">
            {TABS.map(([id, name]) => (
              <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
                className={`border-b-[3px] px-3 py-3.5 text-sm font-medium ${tab === id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}>{name}</button>
            ))}
          </nav>
          <div className="flex items-center gap-3 py-2 text-sm text-muted">
            {timer.elapsed > 0 && <button onClick={() => setTab('today')} className="font-semibold text-accent">{timer.running ? '● ' : '❚❚ '}{fmtTime(timer.elapsed)}</button>}
            {s.sample && <button onClick={() => setTab('data')} className="rounded bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">Sample data on</button>}
            <button onClick={toggle} className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink hover:border-ink">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === 'today' && <Today {...props} />}
        {tab === 'log' && <LogView {...props} />}
        {tab === 'health' && <Health {...props} />}
        {tab === 'progress' && <Progress {...props} />}
        {tab === 'data' && <Data {...props} setSample={setSample} clearAll={clearAll} />}
      </main>
    </div>
  )
}

function Timer({ setS, timer }: P) {
  const save = () => { setS(p => ({ ...p, sessions: [...p.sessions, { id: crypto.randomUUID(), day: today(), sec: timer.elapsed }] })); timer.reset() }
  return (
    <section className={card}>
      <h2 className="font-bold">Workout timer</h2>
      <p className="mt-3 text-5xl font-extrabold">{fmtTime(timer.elapsed)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {timer.running ? <button className={primary} onClick={timer.pause}>Pause</button> : <button className={primary} onClick={timer.start}>{timer.elapsed ? 'Resume' : 'Start'}</button>}
        <button className={ghost} onClick={timer.reset} disabled={!timer.elapsed}>Reset</button>
        <button className={ghost} onClick={save} disabled={!timer.elapsed || timer.running}>Save to today</button>
      </div>
      <p className="mt-3 text-xs text-muted">Pause before saving. An unsaved timer is lost if you close the page.</p>
    </section>
  )
}

function Today(p: P) {
  const { s, go } = p, t = today()
  const [mode, setMode] = useState<'week' | 'exercise'>('week'), [ex, setEx] = useState(EXERCISES[0].id), [pick, setPick] = useState<Group | null>(null)
  const cov = useMemo(() => coverage(s.logs, t), [s.logs, t])
  const week = inWindow(s.logs, t - 6, t), sess = sessionDays(week)
  const tips = insights(s, t).slice(0, 5), next = suggest(s.logs, s.checks, t)
  const intensity: Partial<Record<Group, number>> = {}
  if (mode === 'exercise') exById(ex).groups.forEach(g => (intensity[g] = 1))
  else GROUPS.forEach(g => (intensity[g] = Math.min(1, cov[g].sets / 9)))
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-muted">{fmtDay(t, true)}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">{s.logs.length ? `${sess} of ${WEEKLY_TARGET} workouts done this week` : 'No workouts logged yet'}</h1>
        <p className="mt-2 max-w-xl text-muted">{s.logs.length ? 'Based on the last 7 days. The map shows which muscles you have trained.' : 'Log a workout, or turn on sample data under Data & export to see how it looks.'}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`${card} flex flex-col lg:col-span-2`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex overflow-hidden rounded-md border border-line text-sm font-medium" role="group" aria-label="Map mode">
              {([['week', 'Trained this week'], ['exercise', 'Pick an exercise']] as const).map(([m, n]) => (
                <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)} className={`px-3 py-1.5 ${mode === m ? 'bg-ink text-bg' : 'bg-surface text-muted hover:text-ink'}`}>{n}</button>
              ))}
            </div>
            {mode === 'exercise' && <select aria-label="Exercise" className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm" value={ex} onChange={e => setEx(e.target.value)}>{EXERCISES.map(x => <option key={x.id} value={x.id}>{short(x.name)}</option>)}</select>}
          </div>
          <div className="flex flex-1 items-center justify-center py-2"><div className="w-full max-w-xl"><MuscleMap intensity={intensity} picked={pick} onPick={setPick} /></div></div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="min-h-5">{pick ? <><b>{label(pick)}</b>: {cov[pick].sets} sets in the last 7 days, last trained {cov[pick].last ? fmtDay(cov[pick].last!) : 'never'}.</> : <span className="text-muted">Click a muscle to see when it was last trained.</span>}</p>
            {mode === 'week' && <div className="flex items-center gap-2 text-xs text-muted">0 sets<span className="h-2.5 w-28 rounded-sm" style={{ background: 'linear-gradient(90deg,var(--c-musc),var(--c-accent))' }} />9+ sets</div>}
          </div>
        </section>
        <div className="space-y-6">
          <Timer {...p} />
          <section className={card}>
            <h2 className="font-bold">Suggested next workout</h2>
            <p className="mt-1 text-xs text-muted">Picks exercises for the muscles you have trained least this week.{next.tired ? ' Fatigue is high, so use lighter loads.' : ''}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {next.ranked.map(({ e, gaps }) => (
                <li key={e.id} className="flex justify-between gap-2"><span className="font-semibold">{short(e.name)}</span><span className="text-right text-muted">{(gaps.length ? gaps : e.groups).map(label).join(', ')}{e.bone ? ' · loads bones' : ''}</span></li>
              ))}
            </ul>
            <button className={`${primary} mt-4`} onClick={() => go('log')}>Log a workout</button>
          </section>
          <section className={card}>
            <h2 className="font-bold">What needs attention</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {tips.length ? tips.map((x, i) => <li key={i} className={`border-l-4 pl-3 ${x.level === 'warn' ? 'border-accent' : x.level === 'ok' ? 'border-[#2f8f5b]' : 'border-line'}`}>{x.text}</li>) : <li className="border-l-4 border-[#2f8f5b] pl-3">All on track. Nothing to flag.</li>}
            </ul>
            <button className={`${ghost} mt-4`} onClick={() => go('health')}>Open health checks</button>
          </section>
        </div>
      </div>
      <div className="grid grid-cols-1 divide-y divide-line border border-line bg-surface md:grid-cols-3 md:divide-x md:divide-y-0">
        {[
          [`${Math.min(100, Math.round((sess / WEEKLY_TARGET) * 100))}%`, `Adherence: ${sess} workout days out of a ${WEEKLY_TARGET}-day weekly target`],
          [`${sum(week.map(volume)).toLocaleString()} kg`, 'Volume this week (sets × reps × kg)'],
          [fmtDur(sum(inWindow(s.sessions, t - 6, t).map(x => x.sec))), 'Time on the workout timer this week'],
        ].map(([big, small]) => <div key={small} className="p-5"><p className="text-2xl font-extrabold">{big}</p><p className="mt-1 text-sm text-muted">{small}</p></div>)}
      </div>
    </div>
  )
}

function LogView({ s, setS }: P) {
  const [ex, setEx] = useState(EXERCISES[0].id), [date, setDate] = useState(toISO(today()))
  const [f, setF] = useState({ sets: 3, reps: 10, res: 40, rpe: 7 })
  const d = exById(ex), day = fromISO(date) || today()
  const pickEx = (id: string) => { const x = exById(id); setEx(id); setF(v => ({ ...v, sets: x.sets, reps: x.reps, res: x.res })) }
  const num = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Math.max(0, Number(e.target.value)) })
  const list = s.logs.filter(l => l.day === day)
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={card}>
        <h1 className="text-2xl font-extrabold">Log an exercise</h1>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium">Date<input className={field} type="date" max={toISO(today())} value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className="block text-sm font-medium">Exercise
            <select className={field} value={ex} onChange={e => pickEx(e.target.value)}>{EXERCISES.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          </label>
          <p className="text-sm text-muted">Works: {d.groups.map(label).join(', ')}</p>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-sm font-medium">Sets<input className={field} type="number" min={1} value={f.sets} onChange={num('sets')} /></label>
            <label className="text-sm font-medium">Reps per set<input className={field} type="number" min={1} value={f.reps} onChange={num('reps')} /></label>
            <label className="text-sm font-medium">Resistance (kg)<input className={field} type="number" min={0} step={2.5} value={f.res} onChange={num('res')} /></label>
          </div>
          <label className="block text-sm font-medium">How hard was it? <span className="text-accent">{f.rpe}/10</span>
            <input className="mt-2 w-full accent-[#e8470f]" type="range" min={1} max={10} value={f.rpe} onChange={e => setF({ ...f, rpe: Number(e.target.value) })} />
            <span className="flex justify-between text-xs font-normal text-muted"><span>Easy</span><span>Maximum effort</span></span>
          </label>
          <p className="text-sm text-muted">Volume for this entry: <b className="text-ink">{(f.sets * f.reps * f.res).toLocaleString()} kg</b></p>
          <button className={primary} disabled={f.sets < 1 || f.reps < 1} onClick={() => setS(p => ({ ...p, logs: [...p.logs, { id: crypto.randomUUID(), day, ex, ...f }] }))}>Add exercise</button>
        </div>
      </section>
      <section className={card}>
        <h2 className="text-xl font-bold">{fmtDay(day, true)}</h2>
        {list.length === 0 ? <p className="mt-3 text-sm text-muted">Nothing logged for this date yet. Fill in the form to add an exercise.</p> : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {list.map(l => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                <div><p className="font-semibold">{short(exById(l.ex).name)}</p><p className="text-muted">{l.sets} × {l.reps} at {l.res} kg · effort {l.rpe}/10 · {volume(l).toLocaleString()} kg</p></div>
                <button className="text-sm text-muted underline hover:text-accent" onClick={() => setS(p => ({ ...p, logs: p.logs.filter(x => x.id !== l.id) }))}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function TierCard({ tier, s, setS }: { tier: Tier } & Pick<P, 's' | 'setS'>) {
  const cfg = TIERS[tier]
  const [date, setDate] = useState(toISO(today())), [vals, setVals] = useState<Record<string, string>>({}), [m, setM] = useState(cfg.fields[0].k), [saved, setSaved] = useState(false)
  const v: Record<string, number> = {}
  cfg.fields.forEach(f => { const raw = vals[f.k]; if (raw) { const n = Number(raw); if (n >= f.min && n <= f.max) v[f.k] = n } })
  const bad = cfg.fields.filter(f => vals[f.k] && !(Number(vals[f.k]) >= f.min && Number(vals[f.k]) <= f.max))
  const f = cfg.fields.find(x => x.k === m)!, data = series(s.checks, tier, m)
  const save = () => { setS(p => ({ ...p, checks: [...p.checks, { id: crypto.randomUUID(), day: fromISO(date) || today(), tier, v }] })); setVals({}); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  return (
    <section className={`${card} grid gap-6 md:grid-cols-2`}>
      <div>
        <h2 className="text-xl font-extrabold">{cfg.title}</h2>
        <p className="mt-1 text-sm text-muted">{cfg.sub}</p>
        <label className="mt-4 block text-sm font-medium">Date<input className={field} type="date" max={toISO(today())} value={date} onChange={e => setDate(e.target.value)} /></label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {cfg.fields.map(x => (
            <label key={x.k} className="text-sm font-medium">{x.label} <span className="font-normal text-muted">({x.unit})</span>
              <input className={field} type="number" inputMode="decimal" step={x.step} min={x.min} max={x.max} value={vals[x.k] ?? ''} onChange={e => setVals({ ...vals, [x.k]: e.target.value })} />
            </label>
          ))}
        </div>
        {bad.length > 0 && <p className="mt-3 text-sm text-accent">Check: {bad.map(b => `${b.label} should be ${b.min}–${b.max}`).join('; ')}.</p>}
        <div className="mt-4 flex items-center gap-3"><button className={primary} disabled={!Object.keys(v).length} onClick={save}>Save check-in</button>{saved && <span className="text-sm font-medium text-[#2f8f5b]">Saved</span>}</div>
      </div>
      <div>
        <label className="text-sm font-medium">Trend for<select className={field} value={m} onChange={e => setM(e.target.value)}>{cfg.fields.map(x => <option key={x.k} value={x.k}>{x.label}</option>)}</select></label>
        {data.length < 2 ? <p className="mt-4 text-sm text-muted">{data.length ? `Latest: ${data[0].value} ${f.unit}. ` : ''}Save at least two entries to see a trend.</p> : (
          <>
            <p className="mt-3 text-sm text-muted">Latest: <b className="text-ink">{data[data.length - 1].value} {f.unit}</b> on {data[data.length - 1].label}</p>
            <ResponsiveContainer width="100%" height={200}><LineChart data={data}>{grid}<XAxis dataKey="label" {...ax} /><YAxis domain={['auto', 'auto']} width={40} {...ax} /><Tooltip contentStyle={tip} /><Line dataKey="value" name={f.unit} stroke="var(--c-accent)" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
          </>
        )}
      </div>
    </section>
  )
}

function Health({ s, setS }: P) {
  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight">Health checks</h1>
        <p className="mt-2 text-muted">In microgravity, muscles and bones lose the load they normally carry. These check-ins track the early signs, at three speeds: daily, weekly and every few weeks.</p>
      </div>
      {(['daily', 'weekly', 'scan'] as Tier[]).map(t => <TierCard key={t} tier={t} s={s} setS={setS} />)}
    </div>
  )
}

function Progress({ s }: P) {
  const t = today()
  const daily = Array.from({ length: 14 }, (_, i) => t - 13 + i).map(d => ({ day: fmtDay(d), volume: sum(s.logs.filter(l => l.day === d).map(volume)) }))
  const n = s.logs.length ? Math.max(1, Math.min(6, Math.ceil((t - Math.min(...s.logs.map(l => l.day)) + 1) / 7))) : 1
  const weeks = Array.from({ length: n }, (_, i) => { const to = t - 7 * (n - 1 - i); return { week: `${fmtDay(to - 6)}–${fmtDay(to)}`, workouts: sessionDays(inWindow(s.logs, to - 6, to)) } })
  const cov = coverage(s.logs, t), bars = GROUPS.map(g => ({ group: label(g), sets: cov[g].sets }))
  const cmp = EXERCISES.map(e => { const a = sum(inWindow(s.logs, t - 6, t).filter(l => l.ex === e.id).map(volume)), b = sum(inWindow(s.logs, t - 13, t - 7).filter(l => l.ex === e.id).map(volume)); return { e, a, b } }).filter(r => r.a || r.b)
  const Chart = ({ title, note, children, wide }: { title: string; note: string; children: React.ReactElement; wide?: boolean }) => (
    <section className={`${card} ${wide ? 'lg:col-span-2' : ''}`}><h2 className="font-bold">{title}</h2><p className="mb-4 text-sm text-muted">{note}</p><ResponsiveContainer width="100%" height={wide ? 300 : 240}>{children}</ResponsiveContainer></section>
  )
  if (!s.logs.length) return <p className={card}>No workouts to chart yet. Log one first.</p>
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Chart title="Volume per day" note="Total kg lifted (sets × reps × kg), last 14 days.">
        <BarChart data={daily}>{grid}<XAxis dataKey="day" interval={1} {...ax} /><YAxis {...ax} /><Tooltip contentStyle={tip} /><Bar dataKey="volume" name="Volume (kg)" fill="var(--c-accent)" radius={[3, 3, 0, 0]} /></BarChart>
      </Chart>
      <Chart title="Workouts per week" note={`Days with at least one exercise logged. Target is ${WEEKLY_TARGET}.`}>
        <LineChart data={weeks}>{grid}<XAxis dataKey="week" {...ax} /><YAxis domain={[0, 7]} allowDecimals={false} {...ax} /><Tooltip contentStyle={tip} /><Line dataKey="workouts" stroke="var(--c-navy)" strokeWidth={3} dot={{ r: 4 }} /></LineChart>
      </Chart>
      <Chart wide title="Muscle coverage" note="Sets per muscle group in the last 7 days. Short bars mean undertrained areas.">
        <BarChart data={bars} layout="vertical" margin={{ left: 20 }}><CartesianGrid stroke="var(--c-grid)" horizontal={false} /><XAxis type="number" allowDecimals={false} {...ax} /><YAxis type="category" dataKey="group" width={90} {...ax} /><Tooltip contentStyle={tip} /><Bar dataKey="sets" fill="var(--c-navy)" radius={[0, 3, 3, 0]} /></BarChart>
      </Chart>
      <section className={`${card} lg:col-span-2`}>
        <h2 className="font-bold">Exercise performance: this week vs last week</h2>
        <p className="mb-3 text-sm text-muted">Volume in kg for each exercise over the last 7 days compared with the 7 days before.</p>
        <table className="w-full text-sm"><thead className="text-left text-muted"><tr><th className="py-2 font-medium">Exercise</th><th className="font-medium">This week</th><th className="font-medium">Last week</th><th className="font-medium">Change</th></tr></thead>
          <tbody className="divide-y divide-line">{cmp.map(({ e, a, b }) => <tr key={e.id}><td className="py-2 font-semibold">{short(e.name)}</td><td>{a.toLocaleString()}</td><td>{b.toLocaleString()}</td><td className={b && a < b ? 'text-accent' : ''}>{b ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%` : 'new'}</td></tr>)}</tbody></table>
      </section>
    </div>
  )
}

function Data({ s, setSample, clearAll }: P & { setSample: (b: boolean) => void; clearAll: () => void }) {
  const src = (d?: boolean) => (d ? 'sample' : 'user')
  const exportLogs = () => download('orbitfit-workouts.csv', [['date', 'exercise', 'muscle_groups', 'sets', 'reps', 'resistance_kg', 'volume_kg', 'effort_rpe', 'source'],
    ...[...s.logs].sort((a, b) => a.day - b.day).map(l => [toISO(l.day), short(exById(l.ex).name), exById(l.ex).groups.join('; '), l.sets, l.reps, l.res, volume(l), l.rpe, src(l.demo)])])
  const exportTime = () => download('orbitfit-timer-sessions.csv', [['date', 'duration_seconds', 'duration_minutes', 'source'],
    ...[...s.sessions].sort((a, b) => a.day - b.day).map(x => [toISO(x.day), x.sec, (x.sec / 60).toFixed(1), src(x.demo)])])
  const exportHealth = () => download('orbitfit-health-checks.csv', [['date', 'check_type', 'metric', 'value', 'unit', 'source'],
    ...[...s.checks].sort((a, b) => a.day - b.day).flatMap(c => TIERS[c.tier].fields.filter(f => c.v[f.k] !== undefined).map(f => [toISO(c.day), c.tier, f.label, c.v[f.k], f.unit, src(c.demo)]))])
  return (
    <div className="grid max-w-3xl gap-6">
      <section className={card}>
        <div className="flex items-start justify-between gap-4">
          <div><h1 className="text-xl font-extrabold">Sample data</h1><p className="mt-1 text-sm text-muted">Three weeks of made-up workouts and health checks so you can try the app. Turning it off removes only the sample entries; your own stay.</p></div>
          <button role="switch" aria-checked={s.sample} aria-label="Sample data" onClick={() => setSample(!s.sample)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${s.sample ? 'bg-accent' : 'bg-line'}`}>
            <span className={`absolute top-1 size-5 rounded-full bg-[#fff] transition-all ${s.sample ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </section>
      <section className={card}>
        <h2 className="font-bold">Export CSV</h2>
        <p className="mt-1 text-sm text-muted">{s.logs.length} exercise entries, {s.sessions.length} timer sessions, {s.checks.length} health check-ins. Sample rows are marked in the source column.</p>
        <div className="mt-4 flex flex-wrap gap-3"><button className={ghost} onClick={exportLogs} disabled={!s.logs.length}>Workouts</button><button className={ghost} onClick={exportHealth} disabled={!s.checks.length}>Health checks</button><button className={ghost} onClick={exportTime} disabled={!s.sessions.length}>Timer sessions</button></div>
      </section>
      <section className={card}>
        <h2 className="font-bold">Delete everything</h2>
        <p className="mt-1 text-sm text-muted">Removes all entries, including your own. This cannot be undone.</p>
        <button className={`${ghost} mt-4`} onClick={() => confirm('Delete all logs, check-ins and timer sessions?') && clearAll()}>Delete all data</button>
      </section>
      <p className="text-xs text-muted">OrbitFit is an exercise and health activity monitoring prototype. It does not diagnose conditions, prescribe exercise, or guarantee prevention of muscle atrophy or bone loss. Tips and workout suggestions come from simple rules for demonstration only; thresholds are illustrative, not clinical. Volume is a logging metric, not a validated measure of adaptation.</p>
    </div>
  )
}
