import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

type RecommendItemInput = {
  id: number;
  name: string;
  price: string;
  description?: string;
  baseReasons?: string[];
};

function parseJsonResponse(text: string) {
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

  const items: RecommendItemInput[] = Array.isArray(req.body?.items) ? req.body.items.slice(0, 5) : [];
  const topKeywords: string[] = Array.isArray(req.body?.topKeywords) ? req.body.topKeywords.slice(0, 6) : [];
  const averagePrice: number = Number(req.body?.averagePrice || 0);

  if (items.length === 0) {
    return res.status(400).json({ error: 'Missing recommendation items' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({ reasonsById: {}, source: 'no_openai_key' });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_RECOMMEND_MODEL || 'gpt-4o-mini';

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            '你是電商推薦文案助手。請輸出 JSON，格式為 {"reasonsById":{"<id>":["理由1","理由2"]}}。每個理由要短、口語、繁體中文，不超過 26 字。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            userPreference: {
              averagePrice,
              topKeywords,
            },
            recommendations: items.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              description: item.description || '',
              baseReasons: item.baseReasons || [],
            })),
          }),
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    const parsed = parseJsonResponse(raw);
    const reasonsById = parsed?.reasonsById && typeof parsed.reasonsById === 'object' ? parsed.reasonsById : {};
    return res.status(200).json({ reasonsById, source: 'openai' });
  } catch (error) {
    console.error('ai-recommend-reasons error:', error);
    return res.status(200).json({ reasonsById: {}, source: 'openai_error' });
  }
}
