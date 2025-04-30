import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一位親切的遊戲客服助手。' },
        { role: 'user', content: message },
      ],
    });

    const reply = completion.choices?.[0]?.message?.content;

    if (!reply) {
      console.error('⚠️ GPT 回應為空：', JSON.stringify(completion, null, 2));
    }

    res.status(200).json({
      reply: reply || '（⚠️ GPT 沒有回覆內容）',
    });
  } catch (error) {
    console.error('🔥 GPT 回覆錯誤：', error);
    res.status(500).json({ error: 'AI 回覆失敗' });
  }
}
