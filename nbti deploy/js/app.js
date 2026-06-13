/**
 * NBTI - 职场版人格测试
 * 应用主逻辑：状态管理、视图切换、计分算法、雷达图、本地存储
 */

// ==================== 应用状态 ====================
const AppState = {
  currentView: 'landing',
  currentQuestion: 0,
  answers: {},           // { questionId: score }
  userInfo: {},          // { major, education, jobInterest, experience }
  hobbyAnswer: null,     // Q31 选择的 value
  hiddenAnswer: null,    // Q32 选择的 value
  dimensionScores: {},   // { dimId: { total, level, value } }
  userVector: [],        // [1,2,3,...] 15 elements
  matchedType: null,     // matched personality type
  similarity: 0,
  isSpecialType: false,  // CHSN or FREE
  testHistory: [],       // from localStorage
};

// ==================== 初始化 ====================
function init() {
  loadHistory();
  showView('landing');
}

function loadHistory() {
  try {
    const stored = localStorage.getItem('nbti_history');
    AppState.testHistory = stored ? JSON.parse(stored) : [];
  } catch (e) {
    AppState.testHistory = [];
  }
}

function saveToHistory(result) {
  const entry = {
    date: new Date().toISOString(),
    type: result.type,
    similarity: result.similarity,
    summary: result.vectorSummary,
  };
  AppState.testHistory.unshift(entry);
  if (AppState.testHistory.length > 20) AppState.testHistory.pop();
  try {
    localStorage.setItem('nbti_history', JSON.stringify(AppState.testHistory));
  } catch (e) { /* quota exceeded, ignore */ }
}

// ==================== 视图管理 ====================
function showView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) {
    target.classList.add('active');
    AppState.currentView = viewName;
    target.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  // 特殊初始化
  if (viewName === 'questions') startQuestions();
  if (viewName === 'results') renderResults();
}

// ==================== Landing Page ====================
function openGuideSystem() {
  // 保存当前人格数据到sessionStorage，供guide系统使用
  sessionStorage.setItem('nbti_result', JSON.stringify({
    code: AppState.matchedType?.code || '',
    name: AppState.matchedType?.name || '',
    emoji: AppState.matchedType?.emoji || '',
    tagline: AppState.matchedType?.tagline || '',
    similarity: AppState.similarity,
    dimensionScores: AppState.dimensionScores
  }));
  window.location.href = 'guide.html';
}

// ==================== 题目流程 ====================
function startQuestions() {
  AppState.currentQuestion = 0;
  AppState.answers = {};
  AppState.hobbyAnswer = null;
  AppState.hiddenAnswer = null;
  AppState._questionLocked = false; // 防连点锁
  renderQuestion();
  updateProgress();
}

function renderQuestion() {
  const container = document.getElementById('question-container');
  if (!container) return;
  const totalQuestions = QUESTIONS.length; // 30

  // 解锁（新题目渲染时允许点击）
  AppState._questionLocked = false;

  if (AppState.currentQuestion < totalQuestions) {
    renderRegularQuestion(container, AppState.currentQuestion);
  } else if (AppState.currentQuestion === totalQuestions) {
    renderHobbyQuestion(container);
  } else if (AppState.currentQuestion === totalQuestions + 1) {
    renderHiddenQuestion(container);
  } else {
    // 兜底：任何溢出状态直接进结果
    calculateAndShowResults();
  }
}

function renderRegularQuestion(container, index) {
  const q = QUESTIONS[index];
  const progress = ((index + 1) / 32) * 100;

  container.innerHTML = `
    <div class="q-card fade-in" id="q-card-${q.id}">
      <div class="q-number">第 ${index + 1} / ${QUESTIONS.length} 题</div>
      <div class="q-progress-bar"><div class="q-progress-fill" style="width:${progress}%"></div></div>
      <div class="q-text">${q.text}</div>
      <div class="q-options">
        ${q.options.map((opt, i) => `
          <button class="q-option" data-score="${opt.score}" data-index="${i}">
            <span class="q-option-letter">${String.fromCharCode(65 + i)}</span>
            <span class="q-option-text">${opt.text}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.q-option').forEach(btn => {
    btn.addEventListener('click', () => selectOption(q, btn));
  });

  updateProgress();
}

function renderHobbyQuestion(container) {
  container.innerHTML = `
    <div class="q-card fade-in">
      <div class="q-number q-special">🎯 趣味附加题（最后一题！）</div>
      <div class="q-progress-bar"><div class="q-progress-fill" style="width:97%"></div></div>
      <div class="q-text">${HOBBY_QUESTION.text}</div>
      <div class="q-options">
        ${HOBBY_QUESTION.options.map((opt, i) => `
          <button class="q-option hobby-opt" data-value="${opt.value}" data-index="${i}">
            <span class="q-option-letter">${String.fromCharCode(65 + i)}</span>
            <span class="q-option-text">${opt.text}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.q-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (AppState._questionLocked) return;
      AppState._questionLocked = true;
      const value = btn.dataset.value;
      AppState.hobbyAnswer = value;
      btn.classList.add('selected');
      if (value === 'C') {
        AppState.currentQuestion++;
        renderQuestion();
      } else {
        calculateAndShowResults();
      }
    });
  });
}

function renderHiddenQuestion(container) {
  container.innerHTML = `
    <div class="q-card fade-in q-card-hidden">
      <div class="q-number q-special">🔮 隐藏题解锁！</div>
      <div class="q-text">${HIDDEN_QUESTION.text}</div>
      <div class="q-options">
        ${HIDDEN_QUESTION.options.map((opt, i) => `
          <button class="q-option hidden-opt" data-value="${opt.value}" data-index="${i}">
            <span class="q-option-letter">${String.fromCharCode(65 + i)}</span>
            <span class="q-option-text">${opt.text}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.q-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (AppState._questionLocked) return;
      AppState._questionLocked = true;
      AppState.hiddenAnswer = btn.dataset.value;
      btn.classList.add('selected');
      calculateAndShowResults();
    });
  });
}

function selectOption(question, btn) {
  // 防连点锁
  if (AppState._questionLocked) return;
  AppState._questionLocked = true;

  const score = parseInt(btn.dataset.score);
  const actualScore = question.reverse ? (4 - score) : score;
  AppState.answers[question.id] = actualScore;

  // 高亮选中
  btn.parentElement.querySelectorAll('.q-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  // 延迟进入下一题
  setTimeout(() => {
    AppState.currentQuestion++;
    if (AppState.currentQuestion < QUESTIONS.length) {
      renderQuestion();
    } else if (AppState.currentQuestion === QUESTIONS.length) {
      renderQuestion(); // 由 renderQuestion 内部路由到 hobby/hidden/results
    } else {
      // 溢出兜底：直接进结果
      calculateAndShowResults();
    }
  }, 300);
}

function updateProgress() {
  const bar = document.getElementById('progress-bar');
  const text = document.getElementById('progress-text');
  if (bar && text) {
    const answered = Object.keys(AppState.answers).length;
    const pct = Math.round((answered / 30) * 100);
    bar.style.width = `${pct}%`;
    text.textContent = `${answered}/30`;
  }
}

// ==================== 计分 & 匹配算法 ====================
function calculateAndShowResults() {
  try {
    if (Object.keys(AppState.answers).length === 0) {
      showFallbackError('未检测到任何答题记录，请重新开始测试。');
      return;
    }
    computeScores();
    computeMatch();
    if (!AppState.matchedType) {
      showFallbackError('人格匹配失败，请重试。');
      return;
    }
    showView('results');
  } catch (e) {
    console.error('Results error:', e);
    showFallbackError('结果生成出错：' + e.message);
  }
}

function showFallbackError(msg) {
  const container = document.getElementById('question-container');
  if (container) {
    container.innerHTML = `
      <div class="q-card" style="text-align:center;padding:40px 20px;">
        <div style="font-size:3rem;margin-bottom:16px;">😵</div>
        <h3 style="margin-bottom:12px;">出错了</h3>
        <p style="color:var(--text-light);margin-bottom:20px;">${msg}</p>
        <button class="btn-start" onclick="location.reload()" style="font-size:1rem;padding:12px 40px;">
          🔄 重新开始
        </button>
      </div>
    `;
  } else {
    alert('出错了：' + msg + '\n请刷新页面重试。');
  }
}

function computeScores() {
  const scores = {};
  const dims = Object.keys(DIMENSIONS);

  dims.forEach(dim => {
    const qIds = DIM_QUESTION_MAP[dim];
    const total = qIds.reduce((sum, qId) => sum + (AppState.answers[qId] || 0), 0);

    let level;
    if (total <= 3) level = 'L';
    else if (total === 4) level = 'M';
    else level = 'H';

    const value = level === 'L' ? 1 : level === 'M' ? 2 : 3;

    scores[dim] = { total, level, value };
  });

  AppState.dimensionScores = scores;
  AppState.userVector = dims.map(d => scores[d].value);
}

function computeMatch() {
  // 特殊分支：CHSN 天选打工人
  if (AppState.hobbyAnswer === 'C' && AppState.hiddenAnswer === 'B') {
    const burnType = PERSONALITY_TYPES.find(t => t.code === 'CHSN');
    AppState.matchedType = burnType;
    AppState.similarity = 100;
    AppState.isSpecialType = true;
    saveToHistory({ type: burnType.code, similarity: 100, vectorSummary: 'SPECIAL:CHSN' });
    return;
  }

  // 计算与所有人格模板的曼哈顿距离
  const userVec = AppState.userVector;
  const matches = PERSONALITY_TYPES
    .filter(t => t.code !== 'FREE' && t.code !== 'CHSN')
    .map(type => {
      const patternVec = type.pattern.split('').map(ch => ch === 'H' ? 3 : ch === 'M' ? 2 : 1);
      let distance = 0;
      let exact = 0;
      let severe = 0;
      for (let i = 0; i < 15; i++) {
        const d = Math.abs(userVec[i] - patternVec[i]);
        distance += d;
        if (d === 0) exact++;
        if (d === 2) severe++;
      }
      distance += severe * 2;
      const similarity = Math.max(0, Math.round((1 - distance / 30) * 100));
      return { type, distance, exact, severe, similarity };
    });

  // 排序：距离升→严重冲突少→精度降→相似度降
  matches.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.severe !== b.severe) return a.severe - b.severe;
    if (b.exact !== a.exact) return b.exact - a.exact;
    return b.similarity - a.similarity;
  });

  const best = matches[0];

  // 兜底：最高相似度 < 60%
  if (best.similarity < 60) {
    const fallback = PERSONALITY_TYPES.find(t => t.code === 'FREE');
    AppState.matchedType = fallback;
    AppState.similarity = Math.max(best.similarity, 30);
    AppState.isSpecialType = true;
    saveToHistory({ type: fallback.code, similarity: AppState.similarity, vectorSummary: 'FALLBACK:FREE' });
    return;
  }

  AppState.matchedType = best.type;
  AppState.similarity = best.similarity;
  AppState.isSpecialType = false;
  saveToHistory({
    type: best.type.code,
    similarity: best.similarity,
    vectorSummary: AppState.userVector.map(v => ['L','M','H'][v-1]).join(''),
  });
}

// ==================== 结果页渲染 ====================
function renderResults() {
  const type = AppState.matchedType;
  if (!type) return;

  // 主结果
  document.getElementById('result-code').textContent = type.code;
  document.getElementById('result-name').textContent = type.name;
  document.getElementById('result-emoji').innerHTML = `<img src="${type.emoji}" alt="${type.name}" class="result-type-img">`;
  document.getElementById('result-tagline').textContent = type.tagline;
  document.getElementById('result-similarity').textContent = `${AppState.similarity}%`;
  // 人格解读只显示desc中策略部分之前的内容，避免与下方重复
  const descClean = type.desc ? type.desc.split('\n\n职场策略：')[0] : type.desc;
  document.getElementById('result-desc').textContent = descClean;
  document.getElementById('result-jobs').innerHTML = type.jobs.map(j => `<span class="job-tag">${j}</span>`).join('');

  // 用户信息整合
  renderPersonalizedAdvice(type);

  // 维度解释
  renderDimensionBreakdown();

  // 职场策略
  renderInterviewStrategy(type);

  // 雷达图
  setTimeout(() => drawRadarChart(), 300);

  // 相似度条
  document.getElementById('similarity-bar-fill').style.width = `${AppState.similarity}%`;



  // 历史
  renderHistory();

  // 分享按钮
  initShareButtons(type);

  // 免责声明
  document.getElementById('disclaimer-short').textContent = DISCLAIMER.short;
}

function renderPersonalizedAdvice(type) {
  const container = document.getElementById('personalized-advice');
  const scores = AppState.dimensionScores;
  const highs = Object.entries(scores).filter(([_,v])=>v.level==='H').map(([d])=>DIMENSIONS[d]);
  const lows = Object.entries(scores).filter(([_,v])=>v.level==='L').map(([d])=>DIMENSIONS[d]);
  const highNames = highs.map(d=>d.name);
  const lowNames = lows.map(d=>d.name);
  const typeJobs = type.jobs || [];

  let h = '<div class="advice-card"><div class="advice-icon">🧠</div><div class="advice-content">';
  h += '<h4>' + type.name + ' 型职场策略参考</h4>';

  if (highs.length >= 3) h += '<p>⭐ 核心优势：「' + highNames.slice(0,3).join('」「') + '」。</p>';
  else if (highs.length >= 1) h += '<p>⭐ 核心优势：「' + highNames[0] + '」。</p>';
  else h += '<p>⭐ 维度分布均衡，适应面广。</p>';

  if (lows.length >= 3) h += '<p>🌱 成长空间：「' + lowNames.slice(0,3).join('」「') + '」。</p>';
  else if (lows.length >= 1) h += '<p>🌱 成长空间：「' + lowNames[0] + '」。</p>';
  else h += '<p>🌱 无明显短板。</p>';

  h += '<p>💼 适合方向：' + typeJobs.slice(0,4).join('、') + '。</p>';

  const tips = [];
  if (highs.some(d => d.id === 'S1' || d.id === 'S3')) tips.push('自信展示成就');
  if (highs.some(d => d.id === 'Ac3')) tips.push('行动力是你的标签');
  if (highs.some(d => d.id === 'So1')) tips.push('社交能量是破冰武器');
  if (lows.some(d => d.id === 'S1')) tips.push('自信度偏保守');
  if (lows.some(d => d.id === 'So1')) tips.push('社交偏慢热');
  if (lows.some(d => d.id === 'Ac2')) tips.push('决策偏审慎');

  const uniq = tips.filter((t,i,a)=>a.indexOf(t)===i).slice(0,3);
  if (uniq.length > 0) {
    h += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-light);"><h5 style="font-size:0.85rem;margin-bottom:8px;">🎯 面试提示</h5>';
    uniq.forEach(t => { h += '<p style="font-size:0.83rem;margin-bottom:6px;padding-left:12px;border-left:2px solid var(--primary);">' + t + '</p>'; });
    h += '</div>';
  }
  h += '</div></div>';
  container.innerHTML = h;
}
function renderDimensionBreakdown() {
  const container = document.getElementById('dim-breakdown');
  if (!container) return;
  const dims = Object.keys(DIMENSIONS);
  const models = {};
  dims.forEach(d => {
    const model = DIMENSIONS[d].model;
    if (!models[model]) models[model] = [];
    models[model].push(d);
  });

  let html = '';
  for (const [model, dimList] of Object.entries(models)) {
    html += `<div class="model-group"><h4 class="model-title">${model}</h4>`;
    dimList.forEach(d => {
      const dim = DIMENSIONS[d];
      const score = AppState.dimensionScores[d];
      const levelLabel = dim[score.level].label;
      const levelIcon = dim[score.level].icon;
      const levelText = score.level === 'L' ? '偏低' : score.level === 'M' ? '中等' : '偏高';
      html += `
        <div class="dim-block dim-level-${score.level.toLowerCase()}">
          <div class="dim-block-row">
            <span class="dim-icon">${levelIcon}</span>
            <span class="dim-name">${dim.name}</span>
            <span class="dim-bar-wrap">
              <span class="dim-bar"><span class="dim-bar-fill level-${score.level.toLowerCase()}" style="animation: barFill 0.8s var(--ease-out) both;width:${(score.value / 3) * 100}%"></span></span>
            </span>
            <span class="dim-label">${levelLabel}</span>
            <span class="dim-level-tag level-${score.level.toLowerCase()}">${levelText}</span>
          </div>
          <p class="dim-block-desc">${dim[score.level].desc}</p>
        </div>
      `;
    });
    html += '</div>';
  }
  container.innerHTML = html;
}

function renderInterviewStrategy(type) {
  const container = document.getElementById('interview-strategy');
  const scores = AppState.dimensionScores;

  let tips = [];

  // 基于人格类型
  if (type.desc && type.desc.includes('职场策略')) {
    const parts = type.desc.split('职场策略：');
    if (parts.length > 1) {
      tips.push({ icon: '🎯', text: parts[1].split('\n\n')[0] });
    }
  }

  // 基于维度补充
  if (scores['S1'] && scores['S1'].level === 'L') {
    tips.push({ icon: '💪', text: INTERVIEW_STRATEGY_TEMPLATES.lowSelfEsteem.tip });
  }
  if (scores['S1'] && scores['S1'].level === 'H') {
    tips.push({ icon: '💪', text: INTERVIEW_STRATEGY_TEMPLATES.highSelfEsteem.tip });
  }
  if (scores['So1'] && scores['So1'].level === 'L') {
    tips.push({ icon: '🤝', text: INTERVIEW_STRATEGY_TEMPLATES.lowSocial.tip });
  }
  if (scores['So1'] && scores['So1'].level === 'H') {
    tips.push({ icon: '🤝', text: INTERVIEW_STRATEGY_TEMPLATES.highSocial.tip });
  }
  if (scores['Ac2'] && scores['Ac2'].level === 'L') {
    tips.push({ icon: '⏰', text: INTERVIEW_STRATEGY_TEMPLATES.lowDecision.tip });
  }
  if (scores['Ac2'] && scores['Ac2'].level === 'H') {
    tips.push({ icon: '⚡', text: INTERVIEW_STRATEGY_TEMPLATES.highDecision.tip });
  }

  // 基于用户信息
  const { jobInterest } = AppState.userInfo;
  if (jobInterest) {
    tips.push({
      icon: '🔍',
      text: `针对「${jobInterest}」方向的面试，建议提前研究该岗位在目标公司的核心能力模型，将你的测试结果作为"自我认知基线"来准备面试话术。`
    });
  }

  // 去重
  const seen = new Set();
  tips = tips.filter(t => {
    const key = t.text.slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  container.innerHTML = tips.map(t => `
    <div class="strategy-item">
      <span class="strategy-icon">${t.icon}</span>
      <p>${t.text}</p>
    </div>
  `).join('');
}

// ==================== 雷达图 (Canvas) ====================
function drawRadarChart() {
  const canvas = document.getElementById('radar-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(canvas.parentElement.clientWidth - 32, 400);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  // 检测颜色主题
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const primaryRgb = isDark ? '240, 123, 102' : '235, 107, 85';
  const primaryHex = isDark ? '#F07B66' : '#EB6B55';
  const gridColor = isDark ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
  const labelColor = isDark ? '#E4E3E0' : '#262524';

  const dims = Object.keys(DIMENSIONS);
  const n = dims.length; // 15
  const cx = size / 2, cy = size / 2;
  const radius = size * 0.38;
  const levels = 3;

  ctx.clearRect(0, 0, size, size);

  // 画网格
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
    ctx.strokeStyle = l === levels ? gridColor + '0.12)' : gridColor + '0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (l === 2) {
      ctx.fillStyle = `rgba(${primaryRgb}, 0.04)`;
      ctx.fill();
    }
  }

  // 画轴线
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    ctx.strokeStyle = gridColor + '0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 画数据区域
  const dataPoints = [];
  for (let i = 0; i < n; i++) {
    const dim = dims[i];
    const value = AppState.dimensionScores[dim].value;
    const r = (radius / levels) * value;
    const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    dataPoints.push({ x, y, dim, value });
  }

  ctx.beginPath();
  dataPoints.forEach((p, i) => {
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = `rgba(${primaryRgb}, 0.15)`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${primaryRgb}, 0.55)`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 数据点
  dataPoints.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = primaryHex;
    ctx.fill();
    ctx.strokeStyle = isDark ? '#242730' : '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // 标签（使用主题感知颜色）
  ctx.fillStyle = labelColor;
  ctx.font = '600 11px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  dataPoints.forEach(p => {
    const idx = dataPoints.indexOf(p);
    const angle = (Math.PI * 2 / n) * idx - Math.PI / 2;
    const labelR = radius + 18;
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    ctx.fillText(DIMENSIONS[p.dim].name, lx, ly);
  });
}

// ==================== 排行榜 ====================
// ==================== 测试历史 ====================
function renderHistory() {
  const container = document.getElementById('history-list');
  if (AppState.testHistory.length <= 1) {
    container.innerHTML = '<p class="lb-empty">完成第一次测试，开启你的探索之旅！</p>';
    return;
  }
  container.innerHTML = AppState.testHistory.slice(1, 6).map(h => {
    const type = PERSONALITY_TYPES.find(t => t.code === h.type);
    const name = type ? `<img src="${type.emoji}" alt="${type.name}" class="hist-type-img"> ${type.name}` : h.type;
    const date = new Date(h.date).toLocaleDateString('zh-CN');
    return `
      <div class="history-item">
        <span class="hist-name">${name}</span>
        <span class="hist-sim">${h.similarity}%</span>
        <span class="hist-date">${date}</span>
      </div>
    `;
  }).join('');
}

// ==================== 分享 ====================
function initShareButtons(type) {
  const shareText = `我在NBTI职场人格测试中测出了「${type.name}」！\n\n"${type.tagline}"\n\n匹配度：${AppState.similarity}%\n\n来测测你是什么职场人格？👉`;

  document.getElementById('btn-share-copy').onclick = () => {
    navigator.clipboard.writeText(shareText + '\n' + window.location.href).then(() => {
      const btn = document.getElementById('btn-share-copy');
      btn.textContent = '✅ 已复制';
      setTimeout(() => btn.textContent = '📋 复制结果', 2000);
    });
  };

  document.getElementById('btn-share-wechat').onclick = () => {
    // 微信分享提示
    alert('📱 微信分享：\n\n请截图此页面，分享到朋友圈或微信群～\n\n文案已复制到剪贴板！');
    navigator.clipboard.writeText(shareText);
  };

  document.getElementById('btn-retry').onclick = () => {
    AppState.answers = {};
    AppState.currentQuestion = 0;
    AppState.hobbyAnswer = null;
    AppState.hiddenAnswer = null;
    AppState.dimensionScores = {};
    AppState.userVector = [];
    AppState.matchedType = null;
    AppState.similarity = 0;
    AppState.isSpecialType = false;
    showView('userinfo');
    document.getElementById('input-major').value = '';
    document.getElementById('input-job').value = '';
  };
}

// ==================== 清空历史 ====================
function clearHistory() {
  if (confirm('确定要清空所有测试记录吗？')) {
    localStorage.removeItem('nbti_history');
    AppState.testHistory = [];
    renderHistory();
  }
}

// ==================== 工具函数 ====================
function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shake 0.5s ease';
  setTimeout(() => el.style.animation = '', 500);
}

// ==================== 窗口resize重绘雷达图 ====================
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (AppState.currentView === 'results') drawRadarChart();
  }, 300);
});

// ==================== 键盘导航 ====================
document.addEventListener('keydown', (e) => {
  if (AppState.currentView === 'landing' && e.key === 'Enter') {
    showView('userinfo');
  }
  if (AppState.currentView === 'userinfo' && e.key === 'Enter' && e.ctrlKey) {
    submitUserInfo();
  }
});

// ==================== 启动 ====================
document.addEventListener('DOMContentLoaded', init);
