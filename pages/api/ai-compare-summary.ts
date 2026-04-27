import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

type CompareItem = {
  id: number;
  name: string;
  price: string;
  description?: string;
  stock?: number;
  variantCount?: number;
};

function parsePrice(priceText: string) {
  return parseFloat((priceText || '$0').replace('$', '')) || 0;
}

function buildFallbackSummary(items: CompareItem[]) {
  const sortedByPrice = [...items].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
  const sortedByStock = [...items].sort((a, b) => (b.stock || 0) - (a.stock || 0));
  const cheapest = sortedByPrice[0];
  const mostStock = sortedByStock[0];

  return {
    headline: `比較了 ${items.length} 款商品，建議依預算與玩法偏好選擇`,
    bestForBudget: cheapest ? `${cheapest.name}（價格 ${cheapest.price}）` : '無',
    bestForAvailability: mostStock ? `${mostStock.name}（庫存較充足）` : '無',
    recommendation:
      '若你重視 CP 值，先選低價款；若要穩定可買性，優先選庫存高的版本。最後再看描述是否符合你的遊玩習慣。',
    cautions: ['請先確認版本內容與庫存', '若近期常有折扣，可先加願望清單追蹤價格'],
    source: 'fallback',
  };
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch (error) {
    const matched = text.match(/\{[\s\S]*\}/);
    if (!matched) return null;
    try {
      return JSON.parse(matched[0]);
    } catch (innerError) {
      return null;
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const items: CompareItem[] = Array.isArray(req.body?.items) ? req.body.items.slice(0, 3) : [];
  if (items.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 items' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json(buildFallbackSummary(items));
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_COMPARE_MODEL || 'gpt-4o-mini';
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            '你是電商商品比較助手。輸出 JSON：{"headline":"","bestForBudget":"","bestForAvailability":"","recommendation":"","cautions":["",""]}。使用繁體中文，語氣精簡專業。',
        },
        {
          role: 'user',
          content: JSON.stringify({ items }),
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return res.status(200).json(buildFallbackSummary(items));
    }

    const fallback = buildFallbackSummary(items);
    return res.status(200).json({
      headline: typeof parsed.headline === 'string' ? parsed.headline : fallback.headline,
      bestForBudget:
        typeof parsed.bestForBudget === 'string' ? parsed.bestForBudget : fallback.bestForBudget,
      bestForAvailability:
        typeof parsed.bestForAvailability === 'string'
          ? parsed.bestForAvailability
          : fallback.bestForAvailability,
      recommendation:
        typeof parsed.recommendation === 'string' ? parsed.recommendation : fallback.recommendation,
      cautions: Array.isArray(parsed.cautions)
        ? parsed.cautions.map((item: unknown) => String(item || '').trim()).filter(Boolean).slice(0, 3)
        : fallback.cautions,
      source: 'openai',
    });
  } catch (error) {
    console.error('ai-compare-summary error:', error);
    return res.status(200).json(buildFallbackSummary(items));
  }
}
