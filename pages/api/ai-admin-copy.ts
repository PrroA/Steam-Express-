import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

function fallbackCopy(input: { name: string; price?: string; description?: string }) {
  const name = (input.name || '全新遊戲').trim();
  const price = input.price ? `$${input.price}` : '限時優惠價';
  const desc = (input.description || '').trim();
  const shortDescription = desc
    ? `${desc.slice(0, 72)}${desc.length > 72 ? '...' : ''}`
    : `${name}，${price}，適合想快速上手並享受穩定遊玩體驗的玩家。`;

  return {
    shortDescription,
    sellingPoints: [
      `${price} 入手門檻友善，適合先體驗再升級。`,
      '遊玩節奏順暢，適合平日短時段放鬆。',
      '畫面與玩法兼具，適合收藏到願望清單追蹤。',
    ],
    seoTitle: `${name} | Steam Practice 商店優惠`,
    source: 'fallback',
  };
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (innerError) {
      return null;
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const name = String(req.body?.name || '').trim();
  const price = String(req.body?.price || '').trim();
  const description = String(req.body?.description || '').trim();

  if (!name) {
    return res.status(400).json({ error: 'Missing game name' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json(fallbackCopy({ name, price, description }));
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_ADMIN_COPY_MODEL || 'gpt-4o-mini';
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.6,
      messages: [
        {
          role: 'system',
          content:
            '你是遊戲電商文案助手。回傳 JSON：{"shortDescription":"","sellingPoints":["","",""],"seoTitle":""}。使用繁體中文，sellingPoints 精簡有力，每條 12~24 字。',
        },
        {
          role: 'user',
          content: JSON.stringify({ name, price, description }),
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return res.status(200).json(fallbackCopy({ name, price, description }));
    }

    const shortDescription =
      typeof parsed.shortDescription === 'string' ? parsed.shortDescription.trim() : '';
    const sellingPoints = Array.isArray(parsed.sellingPoints)
      ? parsed.sellingPoints.map((item: unknown) => String(item || '').trim()).filter(Boolean).slice(0, 3)
      : [];
    const seoTitle = typeof parsed.seoTitle === 'string' ? parsed.seoTitle.trim() : '';

    return res.status(200).json({
      shortDescription: shortDescription || fallbackCopy({ name, price, description }).shortDescription,
      sellingPoints: sellingPoints.length > 0 ? sellingPoints : fallbackCopy({ name, price, description }).sellingPoints,
      seoTitle: seoTitle || fallbackCopy({ name, price, description }).seoTitle,
      source: 'openai',
    });
  } catch (error) {
    console.error('ai-admin-copy error:', error);
    return res.status(200).json(fallbackCopy({ name, price, description }));
  }
}
