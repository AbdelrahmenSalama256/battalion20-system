const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { auth } = require('../middleware/auth');
const router = express.Router();

router.post('/ask', auth, async (req, res) => {
  try {
    const { system, question } = req.body;
    if (!question) return res.status(400).json({ error: 'يرجى إدخال السؤال' });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'مفتاح Anthropic API غير مضبوط في الخادم' });
    }
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 900,
      system: system || 'أنت مساعد ذكي لنظام تقييم كتيبة عسكرية',
      messages: [{ role: "user", content: question }]
    });
    res.json({ reply: msg.content[0].text });
  } catch (e) {
    res.status(500).json({ error: 'فشل الاتصال بـ AI: ' + e.message });
  }
});

module.exports = router;
