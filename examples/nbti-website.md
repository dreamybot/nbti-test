# NBTI Website — Case Study

This is the reference implementation built using the **NBTI Creator Skill**.

## Live Demo

**https://nbtitiyanban.netlify.app/**

## What Was Built

- **27 original workplace personality types** with internet-flavored Chinese names
- **30 scenario-based questions** across 15 psychology dimensions
- **15-dimension radar chart** for visual profiling
- **Manhattan distance matching** with extreme conflict weighting
- **3 AI coaching Agents** (resume optimization, mock interview, job analysis)
- **Mobile-first, dark-mode UI**

## Architecture

```
Frontend: HTML + CSS + Vanilla JS → Netlify (static hosting)
Backend:  Node.js + Express       → Railway (API proxy)
AI:       DeepSeek API            → Server-side (key not exposed)
```

## Key Metrics

- 27 personality types with unique 15-char patterns (min distance ≥3)
- 30 questions, 15 dimensions, 3 score levels (L/M/H)
- 5 random simulation tests: 100% match success rate
- 15 extreme edge-case tests: all pass with no logical contradictions

## Files

This skill's methodology is documented in `SKILL.md` at the root of this repository.
The reusable algorithm code is in `algorithm/matching-algorithm.js`.
