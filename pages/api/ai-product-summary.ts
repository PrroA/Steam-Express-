import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { buildRecommendationReasons } from '../../services/aiRecommendationService';

type ProductSummaryInput = {
  id?: number;
  name: string;
  price: string;
  description?: string;
  variants?: Array<{ name: string; price: string; stock: number }>;
};

type ClientPreferenceProfile = {
  recentlyViewedIds?: number[];
  recentlyViewedNames?: string[];
  topKeywords?: string[];
  averagePrice?: number;
};

export type ProductAiSummary = {
  fitFor: string[];
  notFor: string[];
  highlights: string[];
  buyingTip: string;
  source: 'openai' | 'fallback';
};

function parsePrice(priceText: string | undefined) {
  return parseFloat((priceText || '$0').replace('$', '')) || 0;
}

function getLowestPrice(input: ProductSummaryInput) {
  const variantPrices = (input.variants || [])
    .map((variant) => parsePrice(variant.price))
    .filter((price) => price > 0);
  if (variantPrices.length > 0) return Math.min(...variantPrices);
  return parsePrice(input.price);
}

function getTotalStock(input: ProductSummaryInput) {
  return (input.variants || []).reduce((sum, variant) => sum + Math.max(0, Number(variant.stock) || 0), 0);
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function buildFallbackProductSummary(input: ProductSummaryInput): ProductAiSummary {
  const text = `${input.name} ${input.description || ''}`.toLowerCase();
  const lowestPrice = getLowestPrice(input);
  const totalStock = getTotalStock(input);

  const fitFor: string[] = [];
  const notFor: string[] = [];
  const highlights: string[] = [];

  if (includesAny(text, ['rpg', 'fantasy', 'witcher', 'souls', 'elden'])) {
    fitFor.push('喜歡角色養成、探索與奇幻世界的玩家');
    highlights.push('有明確的冒險感，適合想投入較長遊玩時間的人');
  }

  if (includesAny(text, ['open', 'world', 'adventure', 'gta'])) {
    fitFor.push('想自由探索、慢慢逛地圖的玩家');
    highlights.push('遊玩節奏彈性高，可以照自己的步調推進');
  }

  if (includesAny(text, ['horror', 'survival', 'last of us'])) {
    fitFor.push('能接受緊張氣氛與生存壓力的玩家');
    notFor.push('只想輕鬆遊玩、完全不想被劇情壓迫的人');
  }

  if (includesAny(text, ['cyberpunk', 'futuristic'])) {
    fitFor.push('喜歡科幻城市、角色扮演與沉浸式世界觀的玩家');
    highlights.push('題材辨識度高，適合重視世界觀與角色風格的人');
  }

  if (includesAny(text, ['magical', 'hogwarts'])) {
    fitFor.push('喜歡魔法題材、校園冒險與輕度探索的玩家');
    highlights.push('主題清楚，適合想玩奇幻但不想太硬派的人');
  }

  if (lowestPrice >= 50) {
    notFor.push('預算有限、只想先買一款入門遊戲的人');
  } else if (lowestPrice > 0) {
    highlights.push(`最低版本約 $${lowestPrice.toFixed(2)}，適合先用標準版入手`);
  }

  if (totalStock > 0) {
    highlights.push(`目前共有 ${totalStock} 件可選版本`);
  }

  return {
    fitFor: fitFor.slice(0, 3).length > 0 ? fitFor.slice(0, 3) : ['想找一款容易理解、可以直接開始玩的玩家'],
    notFor: notFor.slice(0, 2).length > 0 ? notFor.slice(0, 2) : ['已經很確定只想找完全不同類型的人'],
    highlights: highlights.slice(0, 3).length > 0 ? highlights.slice(0, 3) : ['商品資訊完整，適合先看版本與庫存再決定'],
    buyingTip:
      totalStock <= 0
        ? '目前可選版本庫存不足，建議先加入願望清單，之後再回來確認。'
        : '如果只是想先體驗，建議從標準版開始；確定喜歡這個類型後，再考慮高階版本。',
    source: 'fallback',
  };
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const matched = text.match(/\{[\s\S]*\}/);
    if (!matched) return null;
    try {
      return JSON.parse(matched[0]);
    } catch {
      return null;
    }
  }
}

function normalizeStringList(value: unknown, fallback: string[], maxLength: number) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, maxLength);
  return items.length > 0 ? items : fallback;
}

function normalizeUserProfile(userProfile?: ClientPreferenceProfile) {
  return {
    recentlyViewedIds: Array.isArray(userProfile?.recentlyViewedIds)
      ? userProfile.recentlyViewedIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)).slice(0, 10)
      : [],
    recentlyViewedNames: Array.isArray(userProfile?.recentlyViewedNames)
      ? userProfile.recentlyViewedNames.map((name) => String(name || '').trim()).filter(Boolean).slice(0, 5)
      : [],
    topKeywords: Array.isArray(userProfile?.topKeywords)
      ? userProfile.topKeywords.map((keyword) => String(keyword || '').trim()).filter(Boolean).slice(0, 6)
      : [],
    averagePrice: Number(userProfile?.averagePrice || 0),
  };
}

function applyPreferenceHints(
  summary: ProductAiSummary,
  product: ProductSummaryInput,
  userProfile: ReturnType<typeof normalizeUserProfile>
) {
  if (userProfile.recentlyViewedNames.length === 0 && userProfile.topKeywords.length === 0) return summary;

  const preferenceHints = buildRecommendationReasons({
    product: {
      id: product.id || 0,
      name: product.name,
      price: product.price,
      description: product.description,
      variants: product.variants,
    },
    preference: {
      averagePrice: userProfile.averagePrice,
      topKeywords: userProfile.topKeywords,
    },
    recentlyViewedIds: userProfile.recentlyViewedIds,
  });

  return {
    ...summary,
    highlights: [...preferenceHints, ...summary.highlights].slice(0, 3),
    buyingTip:
      userProfile.recentlyViewedNames.length > 0
        ? '如果這款和你最近看的遊戲風格接近，可以先從標準版入手，再依照喜好升級版本。'
        : summary.buyingTip,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const product = req.body?.product as ProductSummaryInput | undefined;
  if (!product?.name || !product?.price) {
    return res.status(400).json({ error: 'Missing product' });
  }

  const userProfile = normalizeUserProfile(req.body?.userProfile);
  const fallback = applyPreferenceHints(buildFallbackProductSummary(product), product, userProfile);
  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json(fallback);
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_PRODUCT_SUMMARY_MODEL || 'gpt-4o-mini';
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.35,
      messages: [
        {
          role: 'system',
          content:
            '你是遊戲商城的商品決策助理。請只根據商品資料回答，輸出 JSON：{"fitFor":[""],"notFor":[""],"highlights":[""],"buyingTip":""}。文案要自然、給一般使用者看，不要提到 API、server、模型或技術細節。',
        },
        {
          role: 'user',
          content: JSON.stringify({ product, userProfile }),
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return res.status(200).json(fallback);
    }

    return res.status(200).json({
      fitFor: normalizeStringList((parsed as ProductAiSummary).fitFor, fallback.fitFor, 3),
      notFor: normalizeStringList((parsed as ProductAiSummary).notFor, fallback.notFor, 2),
      highlights: normalizeStringList((parsed as ProductAiSummary).highlights, fallback.highlights, 3),
      buyingTip:
        typeof (parsed as ProductAiSummary).buyingTip === 'string' && (parsed as ProductAiSummary).buyingTip.trim()
          ? (parsed as ProductAiSummary).buyingTip.trim()
          : fallback.buyingTip,
      source: 'openai',
    });
  } catch (error) {
    console.error('ai-product-summary error:', error);
    return res.status(200).json(fallback);
  }
}
