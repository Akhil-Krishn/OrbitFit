# OrbitFit

**Track the effort. Visualize the impact.**

A microgravity exercise and health monitoring companion, built for the NASA International Space Apps Challenge 2026: [Health Monitoring Software](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/).

**Live demo:** [OrbitFit](https://akhil-krishn.github.io/OrbitFit/)

---

## The problem

In microgravity the body no longer carries its normal load. Without gravity, muscles weaken and bone mineral density drops. Astronauts use exercise to counter this, but it is hard to see at a glance whether the exercise is regular, whether every muscle group is covered, and whether early warning signs are showing up.

## The solution

OrbitFit brings exercise logs, muscle coverage, and health checks into one simple app, organised at three monitoring speeds.

| Interval | What is tracked |
|---|---|
| **Daily** | Resting heart rate, SpO₂, fatigue, muscle soreness, calories, protein, body mass, exercise duration and workload |
| **Weekly** | Grip strength, standard leg strength test (5-rep squat), plank hold, exercise performance vs the previous week |
| **Every few weeks** | Muscle ultrasound (quadriceps and calf thickness), bone mineral density if available |

## Features

- **Today view:** weekly adherence, volume, and timer totals at a glance.
- **Anatomical muscle map:** front and back views that show which muscle groups were trained in the last 7 days, or which muscles a chosen exercise works. Click any muscle to see when it was last trained.
- **Workout log:** sets, reps, resistance, and perceived effort, with a date picker so past days can be added.
- **Workout timer:** start, pause, and save session time to today. Time totals appear on the dashboard.
- **Health checks:** daily, weekly, and periodic forms with range validation and a trend chart for any metric.
- **Suggested next workout:** ranks exercises by which muscles were trained least this week, flags exercises that load the bones, and recommends lighter loads when fatigue is high.
- **What needs attention:** rule-based flags (see below).
- **Progress charts:** daily volume, workouts per week, muscle coverage, and a this week vs last week comparison per exercise.
- **CSV export:** workouts, health checks, and timer sessions. Sample rows are marked in a `source` column.
- **Sample data switch:** try the app with three weeks of made-up data, then turn it off without losing your own entries.
- **Light and dark mode:** follows the system setting, and remembers your choice.

## How the rules work

All insights are simple, transparent rules for demonstration. The thresholds are illustrative, not clinical.

| Rule | Trigger |
|---|---|
| Missed training | No workout for 2 or more days |
| Low adherence | Fewer than 4 of 5 target workout days in the last 7 days |
| Coverage gap | A muscle group with no sets in the last 7 days |
| Volume drop | Weekly volume down 25% or more vs the week before |
| Low SpO₂ | Latest reading below 95% |
| Body mass loss | Down 3% or more over 14 days |
| High fatigue | Recent fatigue and soreness average 7 or more |
| Grip strength drop | Down 10% or more since the previous weekly test |
| Muscle thickness drop | Quadriceps down 5% or more since the previous scan |
| Overdue checks | No daily check-in today, weekly tests older than 8 days, scan older than 35 days |

**Workload metric:** `Volume = Sets × Reps × Resistance (kg)`. This is a logging metric, not a validated measure of physiological adaptation.

## Tech stack

React 18, TypeScript, Vite, Tailwind CSS v4, Recharts. Data is stored in the browser's `localStorage`.


## Project structure

```
src/
  App.tsx        Screens: Today, Log workout, Health checks, Progress, Data & export
  lib.ts         Data model, storage, sample data, insights, suggestions, CSV export
  MuscleMap.tsx  SVG anatomical muscle map (right half drawn once, then mirrored)
  index.css      Theme colours for light and dark mode
```

## Limitations and next steps

- Prototype only: sample data, no backend, no hardware integration, one user.
- Exercise list and loads are generic. A real version would use ISS equipment (ARED, T2 treadmill, CEVIS) and crew-specific prescriptions.
- Thresholds are illustrative. A real version would need them set and reviewed by flight surgeons and exercise physiologists.
- Ideas: editable thresholds, wearable heart rate import, editing past check-ins, multi-crew view with privacy controls, offline sync for low-connectivity missions.

## Disclaimer

OrbitFit is an exercise and health activity monitoring prototype. It does not diagnose medical conditions, prescribe exercise programs, or guarantee prevention of muscle atrophy or bone loss. Tips and workout suggestions come from simple rules and are for demonstration purposes only.
