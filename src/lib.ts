import { useEffect, useState } from 'react'

// Dates are stored as whole-day numbers (days since 1970-01-01, local calendar).
export const dayNum = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 864e5)
export const today = () => dayNum()
export const toISO = (n: number) => new Date(n * 864e5).toISOString().slice(0, 10)
export const fromISO = (s: string) => Math.round(Date.parse(s + 'T00:00:00Z') / 864e5)
export const fmtDay = (n: number, long = false) => new Date(n * 864e5).toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(long ? { weekday: 'short' } : {}), timeZone: 'UTC' })

export type Group = 'chest' | 'shoulders' | 'biceps' | 'triceps' | 'back' | 'core' | 'glutes' | 'quadriceps' | 'hamstrings' | 'calves'
export const GROUPS: Group[] = ['chest', 'shoulders', 'biceps', 'triceps', 'back', 'core', 'glutes', 'quadriceps', 'hamstrings', 'calves']
export interface Exercise { id: string; name: string; groups: Group[]; sets: number; reps: number; res: number; bone: boolean }
export const EXERCISES: Exercise[] = [
  { id: 'squat', name: 'Squats', groups: ['quadriceps', 'glutes'], sets: 3, reps: 10, res: 40, bone: true },
  { id: 'row', name: 'Resistance Rows', groups: ['back', 'biceps'], sets: 3, reps: 12, res: 25, bone: false },
  { id: 'chest', name: 'Chest Press', groups: ['chest', 'triceps'], sets: 3, reps: 10, res: 30, bone: false },
  { id: 'calf', name: 'Calf Raises', groups: ['calves'], sets: 4, reps: 15, res: 30, bone: true },
  { id: 'plank', name: 'Planks (1 rep = 10 s hold)', groups: ['core'], sets: 3, reps: 6, res: 5, bone: false },
  { id: 'ohp', name: 'Overhead Press', groups: ['shoulders', 'triceps'], sets: 3, reps: 10, res: 20, bone: false },
  { id: 'rdl', name: 'Romanian Deadlift', groups: ['hamstrings', 'glutes', 'back'], sets: 3, reps: 8, res: 45, bone: true },
]
export const exById = (id: string) => EXERCISES.find(e => e.id === id)!
export const short = (n: string) => n.split(' (')[0]
export const label = (g: string) => g.charAt(0).toUpperCase() + g.slice(1)

export type Tier = 'daily' | 'weekly' | 'scan'
export interface Field { k: string; label: string; unit: string; step: number; min: number; max: number }
export const TIERS: Record<Tier, { title: string; sub: string; fields: Field[] }> = {
  daily: { title: 'Daily check-in', sub: 'Once a day. Fill in what you have; blanks are fine.', fields: [
    { k: 'hr', label: 'Resting heart rate', unit: 'bpm', step: 1, min: 30, max: 200 },
    { k: 'spo2', label: 'Blood oxygen (SpO₂)', unit: '%', step: 1, min: 70, max: 100 },
    { k: 'fatigue', label: 'Fatigue (1 none – 10 extreme)', unit: '/10', step: 1, min: 1, max: 10 },
    { k: 'soreness', label: 'Muscle soreness (1 – 10)', unit: '/10', step: 1, min: 1, max: 10 },
    { k: 'kcal', label: 'Calories eaten', unit: 'kcal', step: 50, min: 0, max: 8000 },
    { k: 'protein', label: 'Protein eaten', unit: 'g', step: 5, min: 0, max: 400 },
    { k: 'mass', label: 'Body mass', unit: 'kg', step: 0.1, min: 20, max: 250 }] },
  weekly: { title: 'Weekly strength tests', sub: 'Once a week, done the same way each time so results can be compared.', fields: [
    { k: 'grip', label: 'Grip strength (best of 3)', unit: 'kg', step: 0.5, min: 1, max: 120 },
    { k: 'legTest', label: 'Leg test: heaviest 5-rep squat', unit: 'kg', step: 2.5, min: 1, max: 400 },
    { k: 'plank', label: 'Plank hold, longest', unit: 's', step: 5, min: 1, max: 900 }] },
  scan: { title: 'Muscle & bone scan', sub: 'Every few weeks. Enter ultrasound or bone results when you have them.', fields: [
    { k: 'quad', label: 'Quadriceps thickness (ultrasound)', unit: 'mm', step: 0.1, min: 5, max: 70 },
    { k: 'calf', label: 'Calf thickness (ultrasound)', unit: 'mm', step: 0.1, min: 5, max: 70 },
    { k: 'bmd', label: 'Bone mineral density (if available)', unit: 'g/cm²', step: 0.01, min: 0.3, max: 2 }] },
}

export interface Log { id: string; day: number; ex: string; sets: number; reps: number; res: number; rpe: number; demo?: boolean }
export interface Session { id: string; day: number; sec: number; demo?: boolean }
export interface Check { id: string; day: number; tier: Tier; v: Record<string, number>; demo?: boolean }
export interface State { sample: boolean; logs: Log[]; sessions: Session[]; checks: Check[] }
export const volume = (l: Log) => l.sets * l.reps * l.res
export const WEEKLY_TARGET = 5

function demoData() {
  const t = today(), plans = [['squat', 'calf', 'plank'], ['chest', 'ohp'], ['row', 'rdl'], ['squat', 'plank', 'calf']]
  const logs: Log[] = [], sessions: Session[] = [], checks: Check[] = []
  for (let i = 1; i <= 21; i++) {
    const day = t - 24 + i
    if (i % 7 !== 0) {
      for (const id of plans[i % 4]) {
        const x = exById(id === 'row' && i > 16 ? 'chest' : id === 'rdl' && i > 16 ? 'squat' : id)
        logs.push({ id: `demo-${i}-${x.id}`, day, ex: x.id, sets: x.sets, reps: x.reps, res: x.res + Math.floor(i / 6) * 2.5, rpe: 6 + ((i * 7) % 4), demo: true })
      }
      sessions.push({ id: `demo-s${i}`, day, sec: 2100 + ((i * 37) % 1500), demo: true })
    }
    if (i % 6 !== 0) checks.push({ id: `demo-d${i}`, day, tier: 'daily', demo: true, v: { hr: 58 + ((i * 3) % 7), spo2: 96 + (i % 3), fatigue: 3 + ((i * 5) % 5), soreness: 2 + ((i * 3) % 5), kcal: 2400 + ((i * 90) % 400), protein: 90 + ((i * 7) % 30), mass: +(74.2 - i * 0.03).toFixed(1) } })
  }
  const W = [[3, 41, 50, 70], [10, 40, 52, 75], [17, 36.5, 52.5, 72]], S = [[2, 24.5, 21, 1.12], [19, 23.1, 20.4, 1.11]]
  W.forEach(([i, grip, legTest, plank]) => checks.push({ id: `demo-w${i}`, day: t - 24 + i, tier: 'weekly', demo: true, v: { grip, legTest, plank } }))
  S.forEach(([i, quad, calf, bmd]) => checks.push({ id: `demo-c${i}`, day: t - 24 + i, tier: 'scan', demo: true, v: { quad, calf, bmd } }))
  return { logs, sessions, checks }
}

const KEY = 'orbitfit-v3'
export function useStore() {
  const [s, setS] = useState<State>(() => {
    try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r) as State } catch { /* ignore */ }
    return { sample: true, ...demoData() }
  })
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ } }, [s])
  const setSample = (on: boolean) => setS(p => {
    if (on === p.sample) return p
    if (on) { const d = demoData(); return { sample: true, logs: [...d.logs, ...p.logs], sessions: [...d.sessions, ...p.sessions], checks: [...d.checks, ...p.checks] } }
    return { sample: false, logs: p.logs.filter(x => !x.demo), sessions: p.sessions.filter(x => !x.demo), checks: p.checks.filter(x => !x.demo) }
  })
  const clearAll = () => setS({ sample: false, logs: [], sessions: [], checks: [] })
  return { s, setS, setSample, clearAll }
}

export const inWindow = <T extends { day: number }>(a: T[], from: number, to: number) => a.filter(l => l.day >= from && l.day <= to)
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
export const sessionDays = (logs: Log[]) => new Set(logs.map(l => l.day)).size
export const fmtTime = (sec: number) => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return `${h ? h + ':' + String(m).padStart(2, '0') : m}:${String(s).padStart(2, '0')}` }
export const fmtDur = (sec: number) => `${Math.floor(sec / 3600)}h ${Math.round((sec % 3600) / 60)}m`

export const series = (checks: Check[], tier: Tier, k: string) =>
  checks.filter(c => c.tier === tier && c.v[k] !== undefined).sort((a, b) => a.day - b.day).map(c => ({ day: c.day, label: fmtDay(c.day), value: c.v[k] }))

export function coverage(logs: Log[], t: number) {
  const w = inWindow(logs, t - 6, t)
  const out = {} as Record<Group, { sets: number; last: number | null }>
  for (const g of GROUPS) {
    const hits = logs.filter(l => exById(l.ex).groups.includes(g))
    out[g] = { sets: sum(w.filter(l => exById(l.ex).groups.includes(g)).map(l => l.sets)), last: hits.length ? Math.max(...hits.map(l => l.day)) : null }
  }
  return out
}

export function suggest(logs: Log[], checks: Check[], t: number) {
  const cov = coverage(logs, t)
  const need = (g: Group) => Math.max(0, 9 - cov[g].sets) + (cov[g].last === null ? 4 : Math.min(7, t - cov[g].last))
  const ranked = EXERCISES.map(e => ({ e, score: sum(e.groups.map(need)), gaps: e.groups.filter(g => cov[g].sets < 3) })).sort((a, b) => b.score - a.score).slice(0, 3)
  const f = series(checks, 'daily', 'fatigue').slice(-2)
  return { ranked, tired: f.length > 0 && sum(f.map(x => x.value)) / f.length >= 7 }
}

export interface Insight { level: 'warn' | 'info' | 'ok'; text: string }
export function insights(s: State, t: number): Insight[] {
  const { logs, checks } = s
  if (!logs.length && !checks.length) return [{ level: 'info', text: 'Log a workout or a daily check-in and tips will show up here.' }]
  const out: Insight[] = []
  if (logs.length) {
    const last = Math.max(...logs.map(l => l.day))
    if (t - last >= 2) out.push({ level: 'warn', text: `No workout logged for ${t - last} days (last: ${fmtDay(last)}).` })
    const week = inWindow(logs, t - 6, t), sess = sessionDays(week)
    if (sess < WEEKLY_TARGET - 1) out.push({ level: 'warn', text: `Only ${sess} of ${WEEKLY_TARGET} target workout days in the last 7 days.` })
    const cov = coverage(logs, t), gaps = GROUPS.filter(g => cov[g].sets === 0).map(label)
    if (gaps.length) out.push({ level: 'warn', text: `Not trained this week: ${gaps.join(', ')}.` })
    const v1 = sum(week.map(volume)), v0 = sum(inWindow(logs, t - 13, t - 7).map(volume))
    if (v0 > 0 && v1 < v0 * 0.75) out.push({ level: 'info', text: `Volume is down ${Math.round((1 - v1 / v0) * 100)}% compared with the week before.` })
  }
  const sp = series(checks, 'daily', 'spo2').pop()
  if (sp && sp.value < 95) out.push({ level: 'warn', text: `Last SpO₂ reading was ${sp.value}% (${sp.label}). Re-measure and tell your care team if it stays low.` })
  const mass = series(checks, 'daily', 'mass'), mLast = mass[mass.length - 1]
  if (mLast) { const ref = Math.max(...mass.filter(m => m.day >= mLast.day - 14).map(m => m.value)); if (mLast.value <= ref * 0.97) out.push({ level: 'warn', text: `Body mass is down ${((1 - mLast.value / ref) * 100).toFixed(1)}% over the last two weeks.` }) }
  const fs = [...series(checks, 'daily', 'fatigue').slice(-3), ...series(checks, 'daily', 'soreness').slice(-3)]
  if (fs.length >= 4 && sum(fs.map(x => x.value)) / fs.length >= 7) out.push({ level: 'info', text: 'Fatigue and soreness have been high lately. Consider lighter sessions.' })
  const grip = series(checks, 'weekly', 'grip')
  if (grip.length > 1 && grip[grip.length - 1].value <= grip[grip.length - 2].value * 0.9) out.push({ level: 'warn', text: 'Grip strength dropped 10% or more since the previous weekly test.' })
  const q = series(checks, 'scan', 'quad')
  if (q.length > 1 && q[q.length - 1].value <= q[q.length - 2].value * 0.95) out.push({ level: 'warn', text: 'Quadriceps thickness is down 5% or more since the previous scan.' })
  const lastOf = (tier: Tier) => Math.max(0, ...checks.filter(c => c.tier === tier).map(c => c.day))
  if (!checks.some(c => c.tier === 'daily' && c.day === t)) out.push({ level: 'info', text: 'No daily check-in yet today.' })
  if (t - lastOf('weekly') > 8) out.push({ level: 'info', text: 'Weekly strength tests are due.' })
  if (t - lastOf('scan') > 35) out.push({ level: 'info', text: 'A muscle and bone scan is due (every few weeks).' })
  return out.sort((a, b) => +(b.level === 'warn') - +(a.level === 'warn'))
}

export function download(name: string, rows: (string | number)[][]) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const blob = new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
