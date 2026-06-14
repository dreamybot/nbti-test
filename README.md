# NBTI Creator Skill

> 构建你自己的互联网语感人格测试 — 15维度心理学模型 × 曼哈顿距离匹配 × AI 多Agent求职辅助系统

[![Netlify Status](https://api.netlify.com/api/v1/badges/xxx/deploy-status)](https://nbtitiyanban.netlify.app/)

**参赛作品**：智聘未来·智联招聘首届全国AI创新大赛 — AI+创意赛道

---

## 这是什么？

这是一个 **AI Agent Skill**，记录了构建「NBTI 职场人格测试」的完整方法论。你可以用这套方法构建自己的趣味人格测试网页。

### 在线演示

👉 [https://nbtitiyanban.netlify.app/](https://nbtitiyanban.netlify.app/)

演示版包含了基于本技能构建的完整产品：27种职场人格、30道情境题、15维雷达图、AI多Agent修炼系统。

---

## 技能内容

| 文件 | 说明 |
|------|------|
| [`SKILL.md`](SKILL.md) | 核心技能文档 — 完整的构建方法论 |
| [`algorithm/matching-algorithm.js`](algorithm/matching-algorithm.js) | 可复用的匹配算法代码 |
| [`examples/nbti-website.md`](examples/nbti-website.md) | NBTI 网站作为案例研究 |

---

## 核心创新

1. **15维度心理学模型** — 5大模型 × 15个维度，L/M/H 三级评分
2. **曼哈顿距离匹配 + 极端冲突加权** — 避免假阳性匹配
3. **人格驱动的多Agent协同** — 测试结果直接输入 AI Agent

---

## 开始使用

阅读 [`SKILL.md`](SKILL.md) 了解完整方法论，然后用 [`algorithm/matching-algorithm.js`](algorithm/matching-algorithm.js) 开始构建。

---

## 许可

MIT License — 方法论开源，鼓励复用。

**注意**：本仓库不包含 NBTI 项目的具体人格数据和测试题库。这些是原创创意作品，属于知识产权保护内容。线上演示版可访问 [https://nbtitiyanban.netlify.app/](https://nbtitiyanban.netlify.app/) 体验。
