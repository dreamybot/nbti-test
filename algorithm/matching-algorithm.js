/**
 * NBTI Matching Algorithm — Reusable Implementation
 * =================================================
 *
 * This is the core algorithm from the NBTI project, provided as a reusable template.
 * Use it to build your OWN personality test by plugging in your dimensions,
 * questions, and personality types.
 *
 * Usage:
 *   1. Define your DIMENSIONS (15 dimensions across 5 models)
 *   2. Define your QUESTIONS (30 questions, 2 per dimension)
 *   3. Define your PERSONALITY_TYPES (20-30 types with 15-char L/M/H patterns)
 *   4. Call computeScores() → matchPersonality() to get results
 */

// ====================== DIMENSION DEFINITION TEMPLATE ======================

/**
 * Each dimension has 3 levels: L (Low), M (Medium), H (High)
 * Each level needs: label, description, icon
 */
const DIMENSION_TEMPLATE = {
  DimID: {
    id: 'DimID',
    model: 'Model Name',     // e.g. '自我模型', '情感模型'
    name: 'Dimension Name',   // Display name
    desc: 'Dimension description',
    L: { label: 'Low label', desc: 'Low description', icon: '😐' },
    M: { label: 'Mid label', desc: 'Mid description', icon: '😊' },
    H: { label: 'High label', desc: 'High description', icon: '😄' }
  }
};


// ====================== QUESTION TEMPLATE ======================

/**
 * Each question maps to one dimension
 * 3 options with scores: A=1, B=2, C=3
 * Minimum 30 questions (2 per dimension)
 */
const QUESTION_TEMPLATE = {
  id: 1,
  dim: 'DimID',           // Must match a DIMENSION key
  text: 'Your question text here?',
  options: [
    { text: 'Option A (~L)', score: 1 },
    { text: 'Option B (~M)', score: 2 },
    { text: 'Option C (~H)', score: 3 }
  ]
};


// ====================== PERSONALITY TYPE TEMPLATE ======================

/**
 * Each personality type has a 15-character pattern string
 * Characters: L, M, or H — one per dimension
 * Order must match the DIMENSIONS keys order
 */
const PERSONALITY_TYPE_TEMPLATE = {
  code: 'XXXX',                    // 4-5 letter code
  name: 'Type Name',               // Display name
  emoji: '🎯',                     // Identifier emoji
  tagline: 'One-line hook phrase',
  pattern: 'HHHHHHHHHHHHHHH',      // 15 chars: L/M/H
  desc: 'Long personality description...',
  jobs: ['Job1', 'Job2', 'Job3', 'Job4', 'Job5']
};


// ====================== SCORING ENGINE ======================

/**
 * Compute 15-dimension scores from user answers
 *
 * @param {Object} answers - { questionId: score } e.g. {1: 3, 2: 1, ...}
 * @param {Object} questionMap - { dimId: [qId1, qId2] } dimension-to-questions mapping
 * @param {Object} dimensions - The DIMENSIONS object
 * @returns {Object} { scores: {dim: {total, level, value}}, userVector: [15 numbers] }
 */
function computeScores(answers, questionMap, dimensions) {
  const dims = Object.keys(dimensions);
  const scores = {};

  dims.forEach(dim => {
    const qIds = questionMap[dim];
    const total = qIds.reduce((sum, qId) => sum + (answers[qId] || 0), 0);

    // Map total to level: 2-3→L, 4→M, 5-6→H
    const level = total <= 3 ? 'L' : total === 4 ? 'M' : 'H';

    // Convert to numeric: L=1, M=2, H=3
    const value = level === 'L' ? 1 : level === 'M' ? 2 : 3;

    scores[dim] = { total, level, value };
  });

  const userVector = dims.map(d => scores[d].value);

  return { scores, userVector };
}


// ====================== MATCHING ENGINE ======================

/**
 * Match user's 15-dimension vector against personality type templates
 * Uses Manhattan distance with extreme-conflict weighting
 *
 * @param {number[]} userVector - 15-element array [1,2,3,...]
 * @param {Object[]} personalityTypes - Array of type objects with .pattern
 * @param {Object} fallbackType - Type to return when similarity < 60%
 * @returns {Object} { type, distance, severe, similarity }
 */
function matchPersonality(userVector, personalityTypes, fallbackType) {
  // Distance calculation dimensions
  const DIM_COUNT = 15;
  const MAX_DISTANCE = DIM_COUNT * 2;  // 30

  const matches = personalityTypes.map(type => {
    const patternVec = type.pattern.split('')
      .map(ch => ch === 'H' ? 3 : ch === 'M' ? 2 : 1);

    let distance = 0;
    let exact = 0;
    let severe = 0;  // H vs L extreme conflicts

    for (let i = 0; i < DIM_COUNT; i++) {
      const diff = Math.abs(userVector[i] - patternVec[i]);
      distance += diff;
      if (diff === 0) exact++;       // Perfect match on this dimension
      if (diff === 2) severe++;      // H vs L — extreme opposite
    }

    // ★ KEY: Weight extreme conflicts
    // Without this, a type matching 14/15 dimensions with 1 opposite
    // would rank higher than a type matching 12/15 with no conflicts
    distance += severe * 2;

    // Convert to 0-100% similarity
    const similarity = Math.max(0, Math.round((1 - distance / MAX_DISTANCE) * 100));

    return { type, distance, exact, severe, similarity };
  });

  // ★ Multilevel sort (more nuanced than single-distance sorting)
  matches.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.severe !== b.severe) return a.severe - b.severe;  // Prefer fewer conflicts
    if (b.exact !== a.exact) return b.exact - a.exact;       // Prefer more exact matches
    return b.similarity - a.similarity;
  });

  const best = matches[0];

  // Fallback: if confidence is too low, return the "unclassifiable" type
  if (best.similarity < 60 && fallbackType) {
    return {
      type: fallbackType,
      similarity: best.similarity,
      isFallback: true
    };
  }

  return {
    type: best.type,
    distance: best.distance,
    severe: best.severe,
    similarity: best.similarity,
    isFallback: false
  };
}


// ====================== RADAR CHART (Canvas) ======================

/**
 * Draw a 15-axis radar chart using HTML Canvas
 *
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {Object} scores - { dimId: { value: 1|2|3 } }
 * @param {Object} dimensions - DIMENSIONS object with dimension names
 * @param {boolean} isDark - Whether to use dark theme colors
 */
function drawRadarChart(canvas, scores, dimensions, isDark) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.parentElement.clientWidth - 32;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const dims = Object.keys(dimensions);
  const n = dims.length;
  const cx = size / 2, cy = size / 2;
  const radius = size * 0.38;
  const levels = 3;
  const accent = isDark ? '#F07B66' : '#EB6B55';
  const gridColor = isDark ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
  const labelColor = isDark ? '#E4E3E0' : '#262524';

  ctx.clearRect(0, 0, size, size);

  // Draw concentric grid circles (3 levels = L/M/H)
  for (let l = 1; l <= levels; l++) {
    const r = (radius / levels) * l;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = gridColor + (l === levels ? '0.12)' : '0.06)');
    ctx.stroke();
  }

  // Draw axis lines
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    ctx.strokeStyle = gridColor + '0.08)';
    ctx.stroke();
  }

  // Plot user data
  const dataPoints = dims.map((dim, i) => {
    const value = scores[dim].value;
    const r = (radius / levels) * value;
    const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  });

  // Fill data area
  ctx.beginPath();
  dataPoints.forEach((p, i) => {
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = accent + '22';  // 13% opacity
  ctx.fill();
  ctx.strokeStyle = accent + '99';  // 60% opacity
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw data points
  dataPoints.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
  });

  // Draw dimension labels
  ctx.fillStyle = labelColor;
  ctx.font = '600 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  dataPoints.forEach((p, i) => {
    const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
    const lx = cx + (radius + 18) * Math.cos(angle);
    const ly = cy + (radius + 18) * Math.sin(angle);
    ctx.fillText(dimensions[dims[i]].name, lx, ly);
  });
}


// ====================== PATTERN VALIDATION TOOLS ======================

/**
 * Validate all patterns — check for uniqueness and minimum distance
 *
 * @param {Object[]} types - Array of personality type objects
 * @returns {Object} { valid, minDistance, duplicates, closePairs }
 */
function validatePatterns(types) {
  const patterns = types.map(t => t.pattern);
  const results = { valid: true, minDistance: 30, duplicates: [], closePairs: [] };

  // Check for duplicate patterns
  const seen = {};
  patterns.forEach((p, i) => {
    if (seen[p]) {
      results.duplicates.push([seen[p], types[i].name]);
      results.valid = false;
    }
    seen[p] = types[i].name;
  });

  // Check minimum distance between all pairs
  for (let i = 0; i < types.length; i++) {
    for (let j = i + 1; j < types.length; j++) {
      let dist = 0;
      for (let k = 0; k < 15; k++) {
        const va = types[i].pattern[k] === 'H' ? 3 : types[i].pattern[k] === 'M' ? 2 : 1;
        const vb = types[j].pattern[k] === 'H' ? 3 : types[j].pattern[k] === 'M' ? 2 : 1;
        dist += Math.abs(va - vb);
      }
      if (dist < results.minDistance) results.minDistance = dist;
      if (dist < 3) {
        results.closePairs.push([types[i].name, types[j].name, dist]);
        results.valid = false;
      }
    }
  }

  return results;
}


module.exports = {
  computeScores,
  matchPersonality,
  drawRadarChart,
  validatePatterns
};
