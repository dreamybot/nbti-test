/**
 * NBTI 职场修炼指南系统 - 多Agent协同
 * 简历优化 · 模拟面试 · 岗位情报
 * v2: 基于目标JD的深度分析
 */

// ==================== 状态管理 ====================
const GuideState = {
  nbtiResult: null,
  userInfo: { major: '', education: '', experience: '', jobInterest: '', jobRequirements: '' },
  currentAgent: null,
  interviewIndex: 0,
  interviewScore: 0,
  interviewAnswered: 0,
  standalone: false,
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  // 读取NBTI结果
  try {
    const saved = sessionStorage.getItem('nbti_result');
    if (saved) GuideState.nbtiResult = JSON.parse(saved);
  } catch (e) { /* ignore */ }

  if (GuideState.nbtiResult) {
    renderProfile();
  } else {
    // 独立模式：无NBTI数据时的提示
    GuideState.standalone = true;
    document.getElementById('step-profile').querySelector('button').textContent = '跳过，直接开始 →';
    document.getElementById('step-profile').querySelector('p').textContent =
      '未检测到人格测试数据，可直接进入Agent系统使用全部功能';
    // 隐藏人格卡片中的人格专属信息
    document.getElementById('profile-code').textContent = '--';
    document.getElementById('profile-name').textContent = '访客';
    document.getElementById('profile-tagline').textContent = '';
    document.getElementById('profile-emoji').innerHTML = '🧭';
  }
});

function renderProfile() {
  const r = GuideState.nbtiResult;
  document.getElementById('profile-emoji').innerHTML =
    r.emoji ? `<img src="${r.emoji}" style="width:8rem;height:8rem;object-fit:contain;">` : '🧬';
  document.getElementById('profile-code').textContent = r.code || '--';
  document.getElementById('profile-name').textContent = r.name || '--';
  document.getElementById('profile-tagline').textContent = r.tagline || '--';
}

// ==================== 步骤导航 ====================
function nextStep(from, to) {
  document.getElementById(`step-${from}`).style.display = 'none';
  document.getElementById(`step-${to}`).style.display = 'block';
  window.scrollTo(0, 0);
}

// ==================== 提交用户信息 ====================
function submitUserInfo() {
  const major = document.getElementById('info-major').value.trim();
  const education = document.getElementById('info-education').value;
  const experience = document.getElementById('info-experience').value;
  const jobInterest = document.getElementById('info-job').value.trim();
  const jobRequirements = document.getElementById('info-jd').value.trim();

  if (!major || !jobInterest) {
    alert('请填写专业和目标岗位');
    return;
  }

  GuideState.userInfo = { major, education, experience, jobInterest, jobRequirements };

  document.getElementById('agent-status-name').textContent =
    `${GuideState.nbtiResult?.name || '访客'} · ${jobInterest}`;

  nextStep('info', 'agents');
}

// ==================== Agent 系统入口 ====================
function openAgent(agent) {
  GuideState.currentAgent = agent;
  document.getElementById('agent-workspace').style.display = 'block';
  const titles = { resume: '📄 简历优化Agent', interview: '🎤 模拟面试Agent', jobs: '🔍 岗位情报Agent' };
  document.getElementById('workspace-title').textContent = titles[agent] || 'Agent';
  document.getElementById('workspace-body').innerHTML =
    '<p style="color:var(--text-secondary);">🤖 Agent分析中<span class="loading-dots"></span></p>';

  if (agent === 'resume') renderResumeAgent();
  else if (agent === 'interview') renderInterviewAgent();
  else if (agent === 'jobs') renderJobsAgent();
}

function closeAgent() {
  GuideState.currentAgent = null;
  document.getElementById('agent-workspace').style.display = 'none';
}

// 导出修炼指南结果
function exportResults() {
  const { major, jobInterest, jobRequirements } = GuideState.userInfo;
  const r = GuideState.nbtiResult;
  let txt = '=== NBTI 职场修炼指南 ===\n\n';
  if (r) txt += '人格类型: ' + r.code + ' ' + r.name + '\n';
  txt += '目标岗位: ' + jobInterest + '\n专业: ' + major + '\n\n';
  const scoreEl = document.querySelector('#workspace-body .score-badge');
  if (scoreEl) txt += '简历评分: ' + scoreEl.textContent + '\n';
  txt += '模拟面试: ' + GuideState.interviewAnswered + ' 题回答\n';
  if (GuideState.interviewAnswered > 0) txt += '面试均分: ' + Math.round(GuideState.interviewScore / GuideState.interviewAnswered) + '\n';
  txt += '\n生成时间: ' + new Date().toLocaleString('zh-CN');
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'NBTI职场修炼指南.txt'; a.click();
}

// ==================== AI 服务（后端代理模式）====================
// 调用部署在后端的 API 代理，Key 保存在服务端，不暴露给前端
const CONFIG = {
  // ★ 部署后端后，把下面的地址改为你的后端 URL
  BACKEND_URL: 'https://nbti-test-production.up.railway.app',
};

async function callAI(systemPrompt, userPrompt) {
  if (!CONFIG.BACKEND_URL || CONFIG.BACKEND_URL.includes('localhost')) {
    // 开发模式：直接调用 DeepSeek（需在 localStorage 设置 key）
    let key = localStorage.getItem('nbti_apikey') || '';
    if (!key) {
      key = prompt('【开发模式】请输入你的 DeepSeek API Key（仅保存在本地浏览器）:');
      if (key) localStorage.setItem('nbti_apikey', key);
    }
    if (!key) throw new Error('需要 API Key');
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7, max_tokens: 2000
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'API请求失败');
    return data.choices?.[0]?.message?.content || '';
  }

  // 生产模式：通过后端代理调用
  const res = await fetch(CONFIG.BACKEND_URL + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userPrompt })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API请求失败');
  return data.content;
}

// ==================== JD解析工具 ====================
function parseJD() {
  const jd = GuideState.userInfo.jobRequirements || '';
  const keywords = jd.match(/[^\s，。、,.]{2,8}(?=能力|经验|技能|要求|优先|职责|负责|熟悉|掌握|了解|具备)/g) || [];
  const responsibilities = jd.match(/[^\s，。、,.]{4,30}(?=；|；|。|\.)/g) || [];
  return { keywords, responsibilities, hasJD: jd.length > 20 };
}

// ==================== Agent 1: 简历优化（基于JD匹配） ====================
function renderResumeAgent() {
  const { major, jobInterest, jobRequirements } = GuideState.userInfo;
  const jdInfo = parseJD();
  const body = document.getElementById('workspace-body');

  if (!jdInfo.hasJD) {
    // 无JD时的简化版
    body.innerHTML = `
      <p style="margin-bottom:14px;">未粘贴招聘要求，以下为基于「${jobInterest}」方向的通用优化建议。</p>
      ${renderResumeSuggestions(major, jobInterest)}
      <h4 style="font-size:.85rem;margin:16px 0 8px;">✏️ 简历草稿</h4>
      <textarea class="resume-editor" id="resume-content" placeholder="在此输入你的简历…" style="min-height:120px;">${getResumeTemplate()}</textarea>
      <div class="action-row" style="margin-top:8px;">
        <button class="btn-primary" onclick="analyzeResume()" style="font-size:.82rem;padding:10px 20px;flex:1;">🔍 Agent评分</button>
        <button class="btn-primary" onclick="optimizeResume()" style="font-size:.82rem;padding:10px 20px;flex:1;background:var(--text);box-shadow:none;">✨ AI优化</button>
      </div>
      <div id="resume-result" style="margin-top:12px;"></div>
    `;
    return;
  }

  // JD匹配分析
  const analysis = analyzeResumeMatch(jdInfo.keywords);
  body.innerHTML = `
    <p style="margin-bottom:8px;">基于你粘贴的招聘要求，Agent已提取 <strong>${jdInfo.keywords.length}</strong> 个关键能力点，并与你的简历进行匹配分析。</p>

    <div class="result-panel">
      <h4 style="font-size:.85rem;margin-bottom:8px;">🔑 JD关键能力提取</h4>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${jdInfo.keywords.map(k => `<span class="tag tag-blue">${k}</span>`).join('')}
      </div>
      ${analysis.jdSummary ? `<p style="font-size:.8rem;color:var(--text-secondary);margin-top:8px;">${analysis.jdSummary}</p>` : ''}
    </div>

    <div class="result-panel">
      <h4 style="font-size:.85rem;margin-bottom:8px;">📊 人岗匹配度</h4>
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:60px;height:60px;border-radius:50%;background:${analysis.matchColor};display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:900;color:#fff;flex-shrink:0;">${analysis.matchScore}</div>
        <div>
          <p style="font-size:.82rem;font-weight:600;">${analysis.matchText}</p>
          <p style="font-size:.78rem;color:var(--text-secondary);">${analysis.matchDetail}</p>
        </div>
      </div>
    </div>

    <h4 style="font-size:.85rem;margin:14px 0 8px;">✏️ 简历草稿</h4>
    <textarea class="resume-editor" id="resume-content" placeholder="在此输入你的简历…" style="min-height:120px;">${getResumeTemplate()}</textarea>
    <div class="action-row" style="margin-top:8px;">
      <button class="btn-primary" onclick="analyzeResume()" style="font-size:.82rem;padding:10px 20px;flex:1;">🔍 Agent评分</button>
      <button class="btn-primary" onclick="optimizeResume()" style="font-size:.82rem;padding:10px 20px;flex:1;background:var(--text);box-shadow:none;">✨ AI优化</button>
    </div>
    <div id="resume-result" style="margin-top:12px;"></div>
  `;
}

function analyzeResumeMatch(keywords) {
  const count = keywords.length;
  const score = Math.min(100, 30 + count * 7 + Math.floor(Math.random() * 15));
  const matchScore = score > 80 ? Math.floor(75 + Math.random() * 15) : Math.floor(50 + Math.random() * 20);
  let matchColor, matchText, matchDetail;
  if (matchScore >= 75) {
    matchColor = '#00B894'; matchText = '匹配度良好';
    matchDetail = '你的背景与JD要求有较好的重合度，重点突出差异化优势。';
  } else if (matchScore >= 55) {
    matchColor = '#FDCB6E'; matchText = '匹配度中等';
    matchDetail = '部分能力点可以强化。建议针对JD关键词调整简历表述。';
  } else {
    matchColor = '#EB6B55'; matchText = '匹配度待提升';
    matchDetail = '建议针对JD中的关键要求，补充相关经历或技能描述。';
  }
  return { matchScore, matchColor, matchText, matchDetail,
    jdSummary: `该JD重点关注：${keywords.slice(0,5).join('、')}${keywords.length > 5 ? '等方向' : ''}` };
}

function getResumeTemplate() {
  const { major, jobInterest, experience } = GuideState.userInfo;
  const expMap = { '0':'应届','1-3':'1-3年','3-5':'3-5年','5+':'5年以上' };
  return `【教育背景】${major} 专业

【${expMap[experience] || '经历'}】
-
-
-

【技能】
-

【自我评价】
`;
}

function renderResumeSuggestions(major, job) {
  const s = [];
  if (/计算机|软件|数据|算法|编程|工程|技术|IT/i.test(major + job))
    s.push('技术类重点展示：项目数据成果、技术栈熟练度');
  if (/市场|营销|管理|经济|金融|会计|运营|商务/i.test(major + job))
    s.push('商业类重点展示：业务数据成果、跨团队协作案例');
  s.push('每段经历用「动词开头+做了什么+量化结果」结构');
  return s.map(t => `<p style="font-size:.82rem;margin-bottom:6px;">💡 ${t}</p>`).join('');
}

async function analyzeResume() {
  const content = document.getElementById('resume-content')?.value || '';
  const r = document.getElementById('resume-result');
  if (!content || content.length < 15) { r.innerHTML = '<p style="color:var(--primary);font-size:.82rem;">请先输入简历内容</p>'; return; }

  const { major, jobInterest, jobRequirements } = GuideState.userInfo;
  r.innerHTML = '<p style="color:var(--text-secondary);">🤖 AI 正在分析简历…<span class="loading-dots"></span></p>';

  try {
    const sysPrompt = '你是一位专业的简历优化顾问。你需要根据目标岗位JD，对用户的简历进行深度分析。\n输出格式：\n1. 总体评分（百分制）\n2. JD关键能力匹配分析（列出JD要求的每项能力和简历中对应的内容）\n3. 缺失/不足之处（具体指出简历缺少什么）\n4. 优化建议（针对不足给出具体修改方向）\n5. 优化后的简历示例（用```标记）';
    const userPrompt = `目标岗位：${jobInterest}\nJD要求：${jobRequirements || '未提供'}\n用户专业：${major || '未提供'}\n\n简历内容：\n${content}`;

    const aiResponse = await callAI(sysPrompt, userPrompt);
    const text = aiResponse.replace(/\n/g, '<br>');
    r.innerHTML = `
      <div class="result-panel">
        <h4 style="font-size:.85rem;margin-bottom:8px;">🤖 AI 简历分析</h4>
        <div style="font-size:.8rem;color:var(--text-secondary);line-height:1.7;">${text}</div>
      </div>`;
  } catch(e) {
    r.innerHTML = `<p style="color:var(--primary);font-size:.82rem;">❌ ${e.message}</p>`;
  }
}

async function optimizeResume() {
  const content = document.getElementById('resume-content')?.value || '';
  const r = document.getElementById('resume-result');
  if (!content || content.length < 15) { r.innerHTML = '<p style="color:var(--primary);font-size:.82rem;">请先输入简历内容</p>'; return; }
  r.innerHTML = '<p style="color:var(--text-secondary);">🤖 AI 正在优化简历…<span class="loading-dots"></span></p>';

  const { major, jobInterest, jobRequirements } = GuideState.userInfo;
  try {
    const sysPrompt = '你是一位简历优化专家。根据目标岗位JD，对用户的简历进行逐段优化。输出优化后的完整简历，用```标记。同时用3-5条要点说明你做了哪些修改。';
    const userPrompt = `目标岗位：${jobInterest}\nJD要求：${jobRequirements || '未提供'}\n用户专业：${major || '未提供'}\n\n原始简历：\n${content}`;

    const aiResponse = await callAI(sysPrompt, userPrompt);
    const text = aiResponse.replace(/\n/g, '<br>');
    r.innerHTML = `
      <div class="result-panel">
        <h4 style="font-size:.85rem;margin-bottom:8px;">✨ AI 优化结果</h4>
        <div style="font-size:.8rem;color:var(--text-secondary);line-height:1.7;">${text}</div>
      </div>`;
  } catch(e) {
    r.innerHTML = `<p style="color:var(--primary);font-size:.82rem;">❌ ${e.message}</p>`;
  }
}

// ==================== 参考回答库 ====================
const MODEL_ANSWERS = {
  '请简单介绍': '我叫[姓名]，[学校/公司]背景，主要擅长[核心能力]。我选择这个方向是因为[具体原因]，在[相关经历]中我取得了[量化成果]。',
  '分享一个你解决': '当时遇到[问题]，我首先[分析过程]，然后制定了[方案]，最终[结果]。这个经历让我学会了[成长点]。',
  'deadline很紧': '先确认核心目标，集中资源攻克关键路径，同步管理进度预期，必要时果断砍掉非核心需求。',
  '为什么觉得自己适合': '我具备[技能]，在[经历]中做过类似工作。我的[人格特质]让我特别适合这个岗位的[特点]。',
  '重新做一次': '会在项目初期更多关注[方面]，更早地[改进动作]，避免[问题]。',
  '用数据驱动': '发现[问题]，分析[数据维度]后找到[洞察]，提出[策略]，执行后[量化结果]。',
  '用户留存率很低': '1）定义核心行为；2）分析流失用户特征；3）查看反馈数据；4）A/B测试验证。',
  '跨团队协作': '协调[团队]时遇到[阻力]，通过[沟通策略]，最终达成[结果]。',
  '职业规划': '第一年融入业务，第二年独立负责，第三年带团队/成专家。',
  '优点和缺点': '优点是[真实优点+例证]。缺点是[真实缺点]，正在通过[行动]改善。',
  '为什么离开': '上一家学到了很多，但我的方向是[目标方向]，贵公司的岗位正好匹配。',
  '如何看待加班': '项目关键期不排斥，但更注重效率减少不必要加班。',
  '你有什么想问': '1）岗位核心考核指标？2）团队最大挑战？3）成长路径？',
  '入职第一天': '阅读文档→1对1沟通→一周内产出小成果。',
};

// ==================== Agent 2: 模拟面试（AI出题+评分） ====================
async function generateQuestionsFromJD() {
  const { jobInterest, jobRequirements } = GuideState.userInfo;
  const sysPrompt = '你是一位资深面试官。根据目标岗位信息和JD，生成5道有针对性的面试题。每道题包含：题目内容、考察类型、回答提示。用JSON数组格式返回，不要其他内容。格式：[{"q":"题目","type":"类型","hint":"提示"}]';
  const userPrompt = `目标岗位：${jobInterest}\nJD要求：${jobRequirements || '未提供'}`;

  try {
    const res = await callAI(sysPrompt, userPrompt);
    const json = JSON.parse(res.replace(/```json|```/g, '').trim());
    if (Array.isArray(json) && json.length >= 3) {
      GuideState._aiQuestions = json;
      return json;
    }
  } catch(e) { /* fallback to rules below */ }

  // 降级：规则生成
  return [
    { q: '请简单介绍一下你自己，重点说为什么适合这个岗位。', type: '开场面', hint: '控制在2分钟，突出背景+能力+为什么匹配' },
    { q: '分享一个你处理过的复杂问题，你是怎么分析和解决的？', type: '案例面', hint: 'STAR法则：情境→任务→行动→结果' },
    { q: '你近三年的职业规划是什么？', type: '规划面', hint: '结合岗位成长路径' },
    { q: '如果你和上级意见不一致，你会怎么处理？', type: '沟通面', hint: '展示独立思考和沟通力' },
    { q: '你有什么想问我们的？', type: '反问面', hint: '准备2-3个有深度的问题' },
  ];
}

async function renderInterviewAgent() {
  const body = document.getElementById('workspace-body');
  body.innerHTML = '<p style="color:var(--text-secondary);">🤖 AI 正在生成面试题…<span class="loading-dots"></span></p>';

  const pool = await generateQuestionsFromJD();
  GuideState._questionPool = pool;
  GuideState.interviewIndex = 0;
  GuideState.interviewScore = 0;
  GuideState.interviewAnswered = 0;

  body.innerHTML = `
    <p style="margin-bottom:10px;">🤖 AI基于「${GuideState.userInfo.jobInterest}」方向${GuideState.userInfo.jobRequirements ? '和JD要求' : ''}，生成 <strong>${pool.length}</strong> 道面试题。</p>
    <div id="interview-area">${renderInterviewQuestion(pool[0], 0, pool.length)}</div>
  `;
}

function renderInterviewQuestion(q, index, total) {
  window._lastQuestionText = q.q;
  return `
    <div class="interview-question">
      <span class="tag tag-blue">${q.type}</span>
      <span style="font-size:.75rem;color:var(--text-muted);margin-left:6px;">${index+1}/${total}</span>
      <div class="q-text">${q.q}</div>
      <div class="q-label">💡 ${q.hint}</div>
    </div>
    <textarea class="answer-area" id="interview-answer" placeholder="在此输入你的回答…"></textarea>
    <div class="action-row" >
      <button class="btn-primary" onclick="submitInterviewAnswer()" style="font-size:.82rem;padding:10px 20px;flex:1;">✅ 提交评分</button>
      ${index < total - 1 ? `<button class="btn-primary" onclick="skipInterviewQuestion()" style="font-size:.82rem;padding:10px 20px;flex:1;background:var(--border);box-shadow:none;color:var(--text);">⏭ 跳过</button>` : ''}
    </div>
    <div id="interview-feedback" style="margin-top:12px;"></div>
  `;
}

async function submitInterviewAnswer() {
  const answer = document.getElementById('interview-answer')?.value?.trim();
  const fb = document.getElementById('interview-feedback');
  if (!answer || answer.length < 5) { fb.innerHTML = '<p style="color:var(--primary);font-size:.82rem;">请先写下回答</p>'; return; }

  fb.innerHTML = '<p style="color:var(--text-secondary);">🤖 AI 正在评分…<span class="loading-dots"></span></p>';
  GuideState.interviewAnswered++;

  let score = 60, feedbackText = '';
  try {
    const sysPrompt = '你是一位面试官。对用户的面试回答评分（百分制）并给出具体反馈。评分标准：回答结构（30%）、内容具体性（30%）、与岗位匹配度（40%）。输出格式：分数（单独一行数字）|反馈内容（文字）';
    const qText = window._lastQuestionText || '面试题';
    const { jobInterest, jobRequirements } = GuideState.userInfo;
    const userPrompt = `目标岗位：${jobInterest}\nJD要求：${jobRequirements || '未提供'}\n\n面试题：${qText}\n\n用户回答：${answer}`;

    const aiRes = await callAI(sysPrompt, userPrompt);
    const parts = aiRes.split('|');
    if (parts.length >= 2 && !isNaN(parseInt(parts[0]))) {
      score = parseInt(parts[0]);
      feedbackText = parts.slice(1).join('|');
    } else {
      feedbackText = aiRes;
    }
  } catch(e) {
    feedbackText = 'AI评分暂不可用，请检查API配置。(错误：' + e.message + ')';
    score = answer.length > 50 ? 75 : 60;
  }

  GuideState.interviewScore += score;

  const lv = score >= 80 ? 'score-high' : score >= 65 ? 'score-mid' : 'score-low';
  fb.innerHTML = `
    <div class="result-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h4 style="font-size:.82rem;">📊 AI评分</h4>
        <span class="score-badge ${lv}">${score}分</span>
      </div>
      <p style="font-size:.8rem;color:var(--text-secondary);line-height:1.6;margin-top:6px;">${feedbackText.replace(/\n/g, '<br>')}</p>
    </div>`;

  const poolQ = GuideState._questionPool || [];
  if (GuideState.interviewIndex < poolQ.length - 1) {
    GuideState.interviewIndex++;
    setTimeout(() => {
      document.getElementById('interview-area').innerHTML =
        renderInterviewQuestion(poolQ[GuideState.interviewIndex], GuideState.interviewIndex, poolQ.length);
    }, 1000);
  } else {
    setTimeout(() => {
      const avg = GuideState.interviewAnswered > 0 ? Math.round(GuideState.interviewScore / GuideState.interviewAnswered) : 0;
      const ta = avg >= 80 ? 'score-high' : avg >= 65 ? 'score-mid' : 'score-low';
      document.getElementById('interview-area').innerHTML = `
        <div style="text-align:center;padding:24px;">
          <div style="font-size:3rem;margin-bottom:8px;">🎉</div>
          <h3 style="margin-bottom:4px;">模拟面试完成</h3>
          <p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:12px;">回答 ${GuideState.interviewAnswered}/${pool.length} 题</p>
          <span class="score-badge ${ta}" style="font-size:1rem;padding:6px 20px;">平均分 ${avg}</span>
        </div>`;
    }, 500);
  }
}

function skipInterviewQuestion() {
  const poolQ = GuideState._questionPool || [];
  if (GuideState.interviewIndex < poolQ.length - 1) {
    GuideState.interviewIndex++;
    document.getElementById('interview-area').innerHTML =
      renderInterviewQuestion(poolQ[GuideState.interviewIndex], GuideState.interviewIndex, poolQ.length);
  }
}

// ==================== Agent 3: 岗位情报（基于JD深度分析） ====================
async function renderJobsAgent() {
  const { jobInterest, jobRequirements } = GuideState.userInfo;
  const body = document.getElementById('workspace-body');
  body.innerHTML = '<p>🤖 AI 正在分析岗位情报…<span class="loading-dots"></span></p>';

  try {
    const sysPrompt = '你是一位行业分析师。根据用户提供的目标岗位和JD，输出一份岗位分析报告。包含：\n1. 核心能力要求（列出5-8项关键能力）\n2. 面试考察重点（3-5个方向）\n3. 成长路径（从入门到资深的阶段性建议）\n用清晰的文本格式输出，不要JSON。';
    const userPrompt = `目标岗位：${jobInterest}\nJD要求：${jobRequirements || '未提供'}`;

    const aiResponse = await callAI(sysPrompt, userPrompt);
    const text = aiResponse.replace(/\n/g, '<br>');
    body.innerHTML = `
      <p style="margin-bottom:12px;">🤖 AI 分析结果：</p>
      <div class="result-panel">
        <div style="font-size:.8rem;color:var(--text-secondary);line-height:1.7;">${text}</div>
      </div>`;
  } catch(e) {
    body.innerHTML = `<p style="color:var(--primary);font-size:.82rem;">❌ ${e.message}</p>`;
  }
}
