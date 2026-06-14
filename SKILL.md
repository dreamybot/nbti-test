---
name: nbti-creator
description: >-
  Design and build internet-flavored personality tests with 15-dimension psychology models,
  Manhattan distance matching algorithms, and multi-Agent career coaching systems.
  Created for the 智聘未来·智联招聘首届全国AI创新大赛.
metadata:
  type: methodology
  version: "1.0.0"
  author: NBTI Team
---

# NBTI Creator Skill

Build your own **internet-flavored personality test** with a 15-dimension psychology model, L/M/H scoring system, Manhattan distance matching, and AI-powered career coaching Agents.

---

## Overview

This skill documents the complete methodology used to build **NBTI (Naive Behavioral Type Indicator)** — a workplace personality test that combines:

1. **30 situation-based questions** across 15 psychology dimensions
2. **Custom personality type system** (designed by you, for your audience)
3. **Manhattan distance matching algorithm** with extreme-conflict weighting
4. **15-dimension radar chart** for visual personality profiling
5. **Multi-Agent AI coaching system** (resume optimization, mock interview, job analysis)

---

## How to Use This Skill

```
1. Define your dimensions        → Section 1
2. Design your questions          → Section 2
3. Create your personality types  → Section 3
4. Implement the algorithm        → Section 4
5. Build the frontend             → Section 5
6. Add AI Agents (optional)       → Section 6
```

---

## Section 1: Define Your Dimensions

The test uses a **multi-model × multi-dimension** structure. NBTI uses 5 models × 3 dimensions = 15 dimensions.

### Recommended Model Structure

| Model | Focus | Example Dimensions |
|-------|-------|-------------------|
| Self Model | Self-evaluation, identity, motivation | Self-esteem, Self-clarity, Core value |
| Emotion Model | Emotional patterns in relationships | Attachment security, Emotional investment, Boundaries |
| Attitude Model | Worldview and rule-following | Trust tendency, Rule flexibility, Meaning in life |
| Action Drive Model | Decision and execution style | Risk preference, Decision speed, Execution mode |
| Social Model | Interpersonal style | Social initiative, Interpersonal boundaries, Expression strategy |

### Dimension Definition Format

Each dimension must define **3 levels** (L/M/H):

```javascript
const DIMENSIONS = {
  DimID: {
    id: 'DimID',
    model: '模型名称',
    name: '维度中文名',
    desc: '维度说明',
    L: { label: '低值标签', desc: '低值描述', icon: '🤔' },
    M: { label: '中值标签', desc: '中值描述', icon: '🔄' },
    H: { label: '高值标签', desc: '高值描述', icon: '💪' }
  }
};
```

---

## Section 2: Design Your Questions

### Question Rules

- **Total**: 30 questions (2 per dimension)
- **Options**: 3 per question (A/B/C)
- **Scoring**: A→1, B→2, C→3 (L/M/H mapping)
- **Time**: ~5 minutes to complete

### Question Types

Mix of these for best results:

1. **Scenario-based**: "What would you do when...?"
2. **Self-reflection**: "How would you describe your...?"
3. **Preference**: "Which approach do you prefer?"
4. **Situation**: "In this situation, your reaction is...?"
5. **Abstract/fun** (1-2 max): "No question — pick blindly"

### Scoring Template

```
Option A → score 1 → maps to L (Low)
Option B → score 2 → maps to M (Medium)
Option C → score 3 → maps to H (High)

Dimension total = sum of 2 questions (range: 2-6)
  total 2-3 → L
  total 4   → M
  total 5-6 → H
```

### Branch Question (Optional)

Add a hobby/interest question after Q30 to trigger a special personality type:

```javascript
const HOBBY_QUESTION = {
  id: 31,
  text: 'Your hobby question here?',
  options: [
    { text: 'Option A', value: 'A' },
    { text: 'Option B', value: 'B' },
    { text: 'Option C (triggers hidden)', value: 'C' },
    { text: 'Option D', value: 'D' }
  ]
};

// If option C is selected, show a hidden follow-up:
const HIDDEN_QUESTION = {
  id: 32,
  text: 'Your follow-up question?',
  options: [
    { text: 'Normal answer', value: 'A' },
    { text: 'Trigger special type', value: 'B' }
  ]
};
```

---

## Section 3: Create Your Personality Types

Each type is defined by a **15-character pattern string** (one character per dimension).

### Pattern Format

```
Position:  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14
Dimension: S1 S2 S3 E1 E2 E3 A1 A2 A3 Ac1 Ac2 Ac3 So1 So2 So3
Value:     H  H  M  H  M  L  H  H  M  M  L  H  H  M  H
           ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑  ↑
           H=High (score 5-6), M=Medium (score 4), L=Low (score 2-3)
```

### Personality Type Data Structure

```javascript
const TYPE_TEMPLATE = {
  code: 'XXXX',           // 4-5 letter code (e.g. 'PLAY', 'BOSS')
  name: '中文名',          // Chinese name (2-4 chars recommended)
  emoji: '🎯',            // Single emoji identifier
  tagline: '一句话梗',      // One-line hook
  pattern: 'HHHHHHHHHHHHHHH',  // 15-character L/M/H pattern
  desc: '人格描述...',      // Long description
  jobs: ['岗位1', '岗位2', '岗位3', '岗位4', '岗位5']  // 5 recommended jobs
};
```

### Pattern Design Tips

- **Diversity**: Ensure at least some L/M/H distribution. Avoid all-H or all-L (they cause false matches).
- **Uniqueness**: Minimum Manhattan distance between any two types should be ≥3 (out of 30 max).
- **Balance**: Aim for a variety across the spectrum — some high-energy types, some low-key, some balanced.
- **Number**: 20-30 types gives good coverage without overwhelming the matching algorithm.

### Distance Check Tool

```javascript
function checkPatternDistance(patternA, patternB) {
  let distance = 0;
  for (let i = 0; i < 15; i++) {
    const va = patternA[i] === 'H' ? 3 : patternA[i] === 'M' ? 2 : 1;
    const vb = patternB[i] === 'H' ? 3 : patternB[i] === 'M' ? 2 : 1;
    distance += Math.abs(va - vb);
  }
  return distance; // Should be ≥ 3
}
```

---

## Section 4: Implement the Matching Algorithm

### Step 1: Compute Dimension Scores

```javascript
function computeScores(answers, questionMap) {
  const scores = {};
  const dims = Object.keys(DIMENSIONS);

  dims.forEach(dim => {
    const qIds = questionMap[dim];            // 2 questions per dim
    const total = qIds.reduce((sum, id) => sum + (answers[id] || 0), 0);

    let level;
    if (total <= 3) level = 'L';
    else if (total === 4) level = 'M';
    else level = 'H';

    const value = level === 'L' ? 1 : level === 'M' ? 2 : 3;
    scores[dim] = { total, level, value };
  });

  return scores;
}
```

### Step 2: Match via Manhattan Distance (with Extreme Conflict Weighting)

```javascript
function matchPersonality(userVector, personalityTypes) {
  // userVector: [3,2,1,3,2,2,1,3,3,2,1,2,3,2,1] — 15 numbers (1=L, 2=M, 3=H)

  const matches = personalityTypes.map(type => {
    const patternVec = type.pattern
      .split('')
      .map(ch => ch === 'H' ? 3 : ch === 'M' ? 2 : 1);

    let distance = 0;
    let exact = 0;
    let severe = 0;  // H vs L extreme conflicts

    for (let i = 0; i < 15; i++) {
      const diff = Math.abs(userVector[i] - patternVec[i]);
      distance += diff;
      if (diff === 0) exact++;
      if (diff === 2) severe++;  // H vs L conflict
    }

    // ★ KEY INNOVATION: Weight extreme conflicts
    // Each HvsL conflict adds 2 extra penalty points
    distance += severe * 2;

    const similarity = Math.max(0, Math.round((1 - distance / 30) * 100));
    return { type, distance, exact, severe, similarity };
  });

  // Sort: distance ASC → severe ASC → exact DESC → similarity DESC
  matches.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.severe !== b.severe) return a.severe - b.severe;
    if (b.exact !== a.exact) return b.exact - a.exact;
    return b.similarity - a.similarity;
  });

  // Fallback: if best match similarity < 60%, return "unclassifiable"
  if (matches[0].similarity < 60) {
    return { type: FALLBACK_TYPE, similarity: matches[0].similarity };
  }

  return matches[0];
}
```

### Step 3: 15-Dimension Radar Chart (Canvas)

```javascript
function drawRadarChart(dimensionScores) {
  // Draws a 15-axis spider/radar chart showing L/M/H levels
  // Each axis = one dimension, 3 concentric circles = L/M/H
  // Fills user's data polygon with accent color

  const canvas = document.getElementById('radar-chart');
  const ctx = canvas.getContext('2d');
  const n = 15;  // 15 dimensions
  const levels = 3;  // L=1, M=2, H=3

  // 1. Draw concentric grid circles
  // 2. Draw axis lines from center to each dimension label
  // 3. Plot user data points at their L/M/H radius
  // 4. Fill the data polygon
  // 5. Draw dimension labels at the outer edge

  // See full implementation in the NBTI project codebase
}
```

---

## Section 5: Build the Frontend

### Recommended Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Hosting | Netlify / Cloudflare Pages | Free, global CDN, instant deploy |
| Styling | Vanilla CSS + CSS Variables | No framework needed, mobile-first |
| Rendering | Vanilla JavaScript | Zero dependencies, fast load |
| Radar Chart | Canvas API | Native browser support, no libraries |
| Storage | localStorage | No backend needed for basic use |

### Page Structure

```
index.html         → Landing + test questions + results
guide-landing.html → Career coaching system landing (optional)
guide.html         → AI Agent system (optional)
```

### Key UX Patterns

- **Staggered option entry**: Options animate in with cascading delays (50ms each)
- **Double-click lock**: Prevents multiple submissions during transition animation
- **Progress indicator**: Always show answered/total at the top
- **Mobile-first**: Touch targets ≥ 44px, content max-width 560px
- **Dark mode**: Use `prefers-color-scheme: dark` media query
- **Reduced motion**: Honor `prefers-reduced-motion: reduce`

---

## Section 6: Add AI Coaching Agents (Optional)

### Architecture

```
Frontend → Your Backend Proxy → LLM API (DeepSeek / OpenAI)
           (keeps API key secure)
```

### Agent Design Patterns

#### Resume Optimization Agent
```
System: You are a resume optimization expert...
User:  Target job: {jobInterest}\nJD: {jd}\nResume: {resume}
Expect: JD analysis → match score → gaps → optimization suggestions
```

#### Mock Interview Agent
```
System: You are a senior interviewer for {jobInterest} positions...
User:  Generate 5 interview questions based on this JD: {jd}
Expect: AI-generated questions → user answers → AI scoring + feedback
```

#### Job Intelligence Agent
```
System: You are an industry analyst for {jobInterest}...
User:  Analyze this JD and provide career insights: {jd}
Expect: Skills breakdown → interview focus → career path
```

---

## Example Output

See the live NBTI project at: **https://nbtitiyanban.netlify.app/**

This project was built using this skill methodology:
- 15 dimensions across 5 models
- 30 scenario-based questions
- 27 internet-flavored personality types
- Manhattan distance matching with extreme conflict weighting
- Three AI coaching Agents (resume, interview, job analysis)
- Mobile-first dark theme UI
- Frontend on Netlify, backend proxy on Railway

---

## License

MIT License — feel free to use this methodology to build your own personality test.

**Note**: The specific 27 personality types, 30 questions, and 15-dimension definitions in the NBTI project are original creative works of the NBTI team. This skill provides the **methodology** — you create your own content.
