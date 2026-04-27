import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

type FilterIntent = {
  searchQuery?: string;
  priceRange?: 'all' | 'under20' | '20to50' | '50plus';
  genreKeyword?: string;
  onlyInStock?: boolean;
  sortOrder?: 'default' | 'low-to-high' | 'high-to-low';
  reason?: string;
  source?: 'openai' | 'fallback';
};

let openaiQuotaBlockedUntil = 0;

function fallbackParse(query: string): FilterIntent {
  const text = (query || '').toLowerCase();
  const compact = text.replace(/\s+/g, '');
  let priceRange: FilterIntent['priceRange'] = 'all';
  let sortOrder: FilterIntent['sortOrder'] = 'default';
  let onlyInStock = false;
  let genreKeyword = '';
  let searchQuery = '';
  let reason = '已用關鍵字規則套用篩選';

  const numericOnly = compact.match(/^\d+(\.\d+)?$/);
  if (numericOnly) {
    const value = Number(compact);
    if (value <= 20) priceRange = 'under20';
    else if (value <= 50) priceRange = '20to50';
    else priceRange = '50plus';
    return {
      searchQuery: '',
      priceRange,
      genreKeyword: '',
      onlyInStock: false,
      sortOrder: 'low-to-high',
      reason: `已將 ${value} 視為目標價格並套用價格區間`,
      source: 'fallback',
    };
  }

  if (/(20|低於|便宜|平價|budget|cheap)/i.test(text)) {
    priceRange = 'under20';
  } else if (/(20\s*[-~到]\s*50|中價|mid)/i.test(text)) {
    priceRange = '20to50';
  } else if (/(50|高價|豪華|premium|貴)/i.test(text)) {
    priceRange = '50plus';
  }

  if (/(最便宜|低到高|cheap first|lowest)/i.test(text)) {
    sortOrder = 'low-to-high';
  } else if (/(最貴|高到低|expensive first|highest)/i.test(text)) {
    sortOrder = 'high-to-low';
  }

  if (/(有庫存|有貨|可買|in stock|available)/i.test(text)) {
    onlyInStock = true;
  }

  if (/(無聊|打發時間|放鬆|輕鬆|chill|casual)/i.test(text)) {
    genreKeyword = '多人';
    reason = '已將情境詞轉為推薦類型（多人）';
  }

  const genreMap: Array<{ pattern: RegExp; value: string }> = [
    { pattern: /(多人|連線|co-op|multiplayer)/i, value: '多人' },
    { pattern: /(劇情|story)/i, value: '劇情' },
    { pattern: /(獨立|indie)/i, value: '獨立' },
    { pattern: /(rpg|角色扮演)/i, value: 'rpg' },
    { pattern: /(動作|action)/i, value: 'action' },
    { pattern: /(開放世界|open world)/i, value: '開放' },
    { pattern: /(特價|sale|discount)/i, value: '特價' },
  ];

  for (const item of genreMap) {
    if (item.pattern.test(text)) {
      genreKeyword = item.value;
      break;
    }
  }

  const remainingKeyword = query.trim();
  if (!genreKeyword && /[a-zA-Z\u4e00-\u9fff]/.test(remainingKeyword) && remainingKeyword.length <= 8) {
    searchQuery = remainingKeyword;
  }

  return {
    searchQuery,
    priceRange,
    genreKeyword,
    onlyInStock,
    sortOrder,
    reason,
    source: 'fallback',
  };
}

function safeJsonParse(content: string) {
  try {
    return JSON.parse(content);
  } catch (error) {
    const matched = content.match(/\{[\s\S]*\}/);
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

  const query = String(req.body?.query || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  if (Date.now() < openaiQuotaBlockedUntil) {
    return res.status(200).json(fallbackParse(query));
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json(fallbackParse(query));
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_SEARCH_MODEL || 'gpt-4o-mini';
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            '你是電商搜尋意圖解析器。輸出 JSON: {"searchQuery":"","priceRange":"all|under20|20to50|50plus","genreKeyword":"","onlyInStock":boolean,"sortOrder":"default|low-to-high|high-to-low","reason":""}。searchQuery 必須是短關鍵字（1~3詞）；若使用者輸入自然語句，searchQuery 回傳空字串。不要輸出其他內容。',
        },
        {
          role: 'user',
          content: query,
        },
      ],
    });

    const text = completion.choices?.[0]?.message?.content || '';
    const parsed = safeJsonParse(text);
    if (!parsed || typeof parsed !== 'object') {
      return res.status(200).json(fallbackParse(query));
    }

    const result: FilterIntent = {
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
      priceRange:
        parsed.priceRange === 'under20' ||
        parsed.priceRange === '20to50' ||
        parsed.priceRange === '50plus'
          ? parsed.priceRange
          : 'all',
      genreKeyword: typeof parsed.genreKeyword === 'string' ? parsed.genreKeyword : '',
      onlyInStock: Boolean(parsed.onlyInStock),
      sortOrder:
        parsed.sortOrder === 'low-to-high' || parsed.sortOrder === 'high-to-low'
          ? parsed.sortOrder
          : 'default',
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'AI 已解析查詢條件',
      source: 'openai',
    };

    if (/^\d+(\.\d+)?$/.test(query)) {
      result.searchQuery = '';
      result.sortOrder = 'low-to-high';
      const value = Number(query);
      result.priceRange = value <= 20 ? 'under20' : value <= 50 ? '20to50' : '50plus';
      result.reason = `已將 ${value} 視為目標價格並套用價格區間`;
    }

    return res.status(200).json(result);
  } catch (error) {
    const typedError = error as { status?: number; code?: string; type?: string };
    const isQuotaError =
      typedError?.status === 429 ||
      typedError?.code === 'insufficient_quota' ||
      typedError?.type === 'insufficient_quota';

    if (isQuotaError) {
      openaiQuotaBlockedUntil = Date.now() + 10 * 60 * 1000;
      console.warn('ai-search-intent: OpenAI quota exceeded, fallback enabled for 10 minutes.');
    } else {
      console.error('ai-search-intent error:', error);
    }
    return res.status(200).json(fallbackParse(query));
  }
}
