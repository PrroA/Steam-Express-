import type { Request, Response } from 'express';
import type { Socket } from 'socket.io';
import type { RouteDeps } from './types';
import type { GptReplyBody } from '../../types/backend';
import { persistState } from '../persistence';
import { retrieveRagContext } from '../rag';

type TypedRequest<TBody> = Request & { body: TBody };
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct';

async function queryOllama(messages: ChatMessage[], temperature = 0.7): Promise<string | null> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: { temperature },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { message?: { content?: string } };
    return payload?.message?.content?.trim() || null;
  } catch (error) {
    return null;
  }
}

async function queryAssistant({
  openaiClient,
  messages,
  temperature = 0.7,
  openaiModel = 'gpt-4o-mini',
}: {
  openaiClient: RouteDeps['openaiClient'];
  messages: ChatMessage[];
  temperature?: number;
  openaiModel?: string;
}): Promise<{ reply: string; provider: 'openai' | 'ollama' } | null> {
  if (openaiClient) {
    try {
      const completion = await openaiClient.chat.completions.create({
        model: openaiModel,
        temperature,
        messages,
      });
      const reply = completion.choices?.[0]?.message?.content?.trim();
      if (reply) {
        return { reply, provider: 'openai' };
      }
    } catch (error) {
      const typedError = error as { message?: string };
      console.error('OpenAI completion failed:', typedError?.message || error);
    }
  }

  const localReply = await queryOllama(messages, temperature);
  if (localReply) {
    return { reply: localReply, provider: 'ollama' };
  }

  return null;
}

function isPlatformQuery(message: string) {
  return /(訂單|退款|退費|取消|購物車|付款|支付|結帳|物流|運送|出貨|登入|帳號|密碼|願望清單|收藏|商品|遊戲|版本|庫存|價格|管理員|後台|平台|客服|交易|狀態|stripe|payment|order|refund|cart|wishlist|checkout|login|account|admin)/i.test(
    message
  );
}

export function registerChatRoutes({ app, io, state, openaiClient }: RouteDeps) {
  const { messages } = state;

  io.on('connection', (socket: Socket) => {
    socket.emit('chatHistory', messages);

    socket.on('sendMessage', (message: { user?: string; text: string }) => {
      const newMessage = {
        user: message.user || '我',
        text: message.text,
        timestamp: new Date().toLocaleTimeString(),
      };
      messages.push(newMessage);
      persistState(state);
      io.emit('receiveMessage', newMessage);
    });

    setTimeout(() => {
      const autoReply = {
        user: '客服中心',
        text: '此功能還在開發中 敬請期待',
        timestamp: new Date().toLocaleTimeString(),
      };
      io.emit('receiveMessage', autoReply);
    }, 1000);
  });

  app.post('/gpt-reply', async (req: TypedRequest<GptReplyBody>, res: Response) => {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: '缺少 message' });
    }

    try {
      const result = await queryAssistant({
        openaiClient,
        openaiModel: 'gpt-4o-mini',
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content:
              '你是 Steam 風格電商平台客服助理。請用繁體中文，回覆精簡、可執行，優先提供實際操作步驟。',
          },
          { role: 'user', content: message },
        ],
      });

      if (!result) {
        return res.status(503).json({ error: '目前找不到可用的 AI Provider（OpenAI/Ollama）' });
      }

      return res.json({ reply: result.reply, provider: result.provider });
    } catch (err: unknown) {
      const typedError = err as { response?: { data?: unknown }; message?: string };
      console.error('GPT API 錯誤:', typedError.response?.data || typedError.message || err);
      return res.status(500).json({ error: 'GPT 回覆失敗' });
    }
  });

  app.post('/chat/rag', async (req: TypedRequest<GptReplyBody>, res: Response) => {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: '缺少 message' });
    }

    const contexts = retrieveRagContext(state, message, 4);
    const topScore = contexts[0]?.score || 0;
    const platformQuery = isPlatformQuery(message);
    const useGeneralChat = !platformQuery && topScore < 6;

    if (useGeneralChat) {
      try {
        const result = await queryAssistant({
          openaiClient,
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content:
                '你是一位友善、自然的繁體中文 AI 助手。可以一般聊天，也可回答技術與生活問題。回覆精簡、自然，不要制式客服語氣。',
            },
            { role: 'user', content: message },
          ],
        });

        if (!result) {
          return res.json({
            reply:
              '目前一般聊天服務暫時不可用。若你想，我可以先提供平台相關協助（訂單、退款、付款、物流）。',
            grounded: false,
            mode: 'general-chat-unavailable',
            sources: [],
          });
        }

        return res.json({
          reply: result.reply,
          grounded: false,
          mode: 'general-chat',
          provider: result.provider,
          sources: [],
        });
      } catch (error: unknown) {
        const typedError = error as { message?: string };
        console.error('General chat failed:', typedError.message || error);
        return res.json({
          reply: '我目前暫時無法一般聊天，先切回平台客服模式。你可以問我訂單、退款、付款或物流。',
          grounded: false,
          mode: 'degraded-service',
          sources: [],
        });
      }
    }

    if (contexts.length === 0) {
      try {
        const result = await queryAssistant({
          openaiClient,
          temperature: 0.35,
          messages: [
            {
              role: 'system',
              content:
                '你是平台客服助理。當內部知識不足時，請誠實說明資料不足，並提供下一步檢查建議；不可編造政策。',
            },
            { role: 'user', content: message },
          ],
        });

        if (!result) {
          return res.json({
            reply:
              '目前找不到對應平台資料。你可以提供更多細節（例如訂單狀態、付款步驟、商品名稱），我再幫你判斷。',
            grounded: false,
            mode: 'service-no-context',
            sources: [],
          });
        }

        return res.json({
          reply: result.reply,
          grounded: false,
          mode: 'service-ai-no-context',
          provider: result.provider,
          sources: [],
        });
      } catch (error: unknown) {
        const typedError = error as { message?: string };
        console.error('No-context service reply failed:', typedError.message || error);
        return res.json({
          reply: '目前知識庫找不到直接答案，建議改問：訂單狀態、退款規則、庫存與版本、付款流程。',
          grounded: false,
          mode: 'service-fallback',
          sources: [],
        });
      }
    }

    const sourceItems = contexts.map((item) => ({
      id: item.doc.id,
      title: item.doc.title,
      type: item.doc.type,
      score: item.score,
    }));

    const contextText = contexts
      .map((item, index) => `[來源${index + 1}] ${item.doc.title}：${item.doc.content}`)
      .join('\n');

    try {
      const result = await queryAssistant({
        openaiClient,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `你是 Steam 風格電商平台的客服助理。請嚴格遵守以下規則：
1) 只能依據「可用知識」回答，禁止捏造政策、價格、庫存、訂單狀態。
2) 回覆使用繁體中文，語氣專業、簡潔、可執行。
3) 先給結論，再給操作步驟；步驟用 1. 2. 3.。
4) 若使用者問題屬於這些類別，優先對應說明：
   - 訂單/物流：先引導到訂單頁與訂單狀態欄位
   - 退款/取消：先說明適用條件，再說操作路徑
   - 付款失敗：先給檢查項，再提供重試付款路徑
   - 帳號/權限：先確認登入狀態與角色，再給下一步
5) 若可用知識不足，明確說「目前資料不足」，並提供最接近的下一步，不可硬答。
6) 避免冗長，控制在 4-8 行內，除非使用者要求詳細。
`,
          },
          {
            role: 'user',
            content: `使用者問題：${message}\n\n可用知識：\n${contextText}`,
          },
        ],
      });

      if (!result) {
        const fallbackReply =
          `根據平台資料整理如下：\n` +
          contexts
            .slice(0, 3)
            .map((item) => `- ${item.doc.title}：${item.doc.content}`)
            .join('\n') +
          `\n如果你要，我可以再幫你一步一步操作。`;
        return res.json({
          reply: fallbackReply,
          grounded: true,
          mode: 'service-rag-fallback',
          sources: sourceItems,
        });
      }

      return res.json({
        reply: result.reply,
        grounded: true,
        mode: 'service-rag',
        provider: result.provider,
        sources: sourceItems,
      });
    } catch (error: unknown) {
      const typedError = error as { message?: string };
      console.error('RAG reply failed:', typedError.message || error);
      const degradedReply =
        `目前改用本地知識回答：\n` +
        contexts
          .slice(0, 3)
          .map((item) => `- ${item.doc.title}：${item.doc.content}`)
          .join('\n');
      return res.json({
        reply: degradedReply,
        grounded: true,
        degraded: true,
        mode: 'service-rag-degraded',
        sources: sourceItems,
      });
    }
  });
}
