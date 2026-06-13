/**
 * NBTI AI API Proxy Server
 * 用途：作为前端和 DeepSeek API 之间的代理，隐藏 API Key
 * 部署方式：Railway / Render / Fly.io / 任意 Node.js 服务器
 */

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ===== 配置 =====
const PORT = process.env.PORT || 3000;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

// ===== API 路由 =====
app.post('/api/chat', async (req, res) => {
  try {
    const { systemPrompt, userPrompt } = req.body;

    if (!systemPrompt || !userPrompt) {
      return res.status(400).json({ error: '缺少 systemPrompt 或 userPrompt' });
    }

    const response = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API 请求失败' });
    }

    const content = data.choices?.[0]?.message?.content || '';
    res.json({ content });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== 启动 =====
app.listen(PORT, () => {
  console.log(`NBTI API Server running on port ${PORT}`);
  if (!DEEPSEEK_API_KEY) {
    console.warn('⚠️  Warning: DEEPSEEK_API_KEY 未设置！请在环境变量中配置。');
  }
});
