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
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

const serviceScopePattern =
  /(商品|遊戲|推薦|價格|庫存|版本|購物車|結帳|付款|訂單|退款|取消|出貨|配送|物流|帳號|登入|註冊|密碼|願望清單|客服|game|price|cart|checkout|payment|order|refund|shipping|wishlist|account|login)/i;

async function queryOllama(messages: ChatMessage[], temperature = 0.4): Promise<string | null> {
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

    if (!response.ok) return null;
    const payload = (await response.json()) as { message?: { content?: string } };
    return payload?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function queryAssistant({
  openaiClient,
  messages,
  temperature = 0.4,
}: {
  openaiClient: RouteDeps['openaiClient'];
  messages: ChatMessage[];
  temperature?: number;
}): Promise<{ reply: string; provider: 'openai' | 'ollama' } | null> {
  if (openaiClient) {
    try {
      const completion = await openaiClient.chat.completions.create({
        model: OPENAI_CHAT_MODEL,
        temperature,
        messages,
      });
      const reply = completion.choices?.[0]?.message?.content?.trim();
      if (reply) return { reply, provider: 'openai' };
    } catch (error) {
      const typedError = error as { message?: string };
      console.error('OpenAI completion failed:', typedError?.message || error);
    }
  }

  const localReply = await queryOllama(messages, temperature);
  if (localReply) return { reply: localReply, provider: 'ollama' };

  return null;
}

function isServiceQuestion(message: string) {
  return serviceScopePattern.test(message);
}

function buildFallbackReply(
  message: string,
  grounded: boolean,
  contexts: ReturnType<typeof retrieveRagContext> = []
) {
  if (!isServiceQuestion(message)) {
    return '我目前主要協助商城相關問題，例如商品推薦、購物車、付款、訂單、退款、配送或帳號設定。你可以換個商城情境問我。';
  }

  if (grounded) {
    if (/(退款|退費|refund)/i.test(message)) {
      return '可以，若訂單已付款，可以到訂單中心找到該筆訂單並申請退款。退款完成後，訂單會顯示為已退款；若訂單還沒付款，也可以直接取消訂單。';
    }

    if (/(推薦|便宜|低價|價格|遊戲|商品|recommend|cheap|price|game)/i.test(message)) {
      const catalogNames = contexts
        .filter((item) => item.doc.type === 'catalog')
        .map((item) => item.doc.title)
        .slice(0, 2);
      if (catalogNames.length > 0) {
        return `可以先看 ${catalogNames.join('、')}。如果你想找預算友善的作品，可以在首頁用價格篩選或排序，進商品頁確認版本、庫存與目前價格後再加入購物車。`;
      }
      return '可以先到首頁用價格由低到高排序，或用價格篩選找預算內的遊戲。進商品頁後可以確認版本、庫存與目前價格，再加入購物車。';
    }

    if (/(付款|結帳|信用卡|payment|checkout|card)/i.test(message)) {
      return '可以從商品頁加入購物車，完成結帳後到訂單中心付款。信用卡付款可使用測試卡號；如果暫時無法載入信用卡付款，也可以用 Demo 快速付款完成展示流程。';
    }

    if (/(配送|出貨|物流|shipping|delivery)/i.test(message)) {
      return '付款完成後，訂單會進入準備出貨狀態。你可以在訂單中心查看目前出貨狀態；若後台補上物流資訊，訂單也會顯示相關配送資料。';
    }

    if (/(帳號|登入|註冊|密碼|account|login|password)/i.test(message)) {
      return '你可以使用 Demo 帳號快速體驗完整流程，也可以註冊自己的帳號。若忘記密碼，可以從登入頁進入找回帳號流程。';
    }

    return '我先依照商城資料整理：你可以從商品頁加入購物車，完成結帳後到訂單中心付款；如果付款沒有成功，可以在訂單中心重新付款或查看狀態。';
  }

  return '目前 AI 暫時無法產生完整回覆。不過你可以先到訂單中心查看付款與退款狀態，或回到商店確認商品資訊。';
}

function buildSystemPrompt(grounded: boolean) {
  const base =
    '你是遊戲商城的 AI 客服助理。請用繁體中文回答，語氣自然、簡潔、像真正客服。不要提到後端、API、server、token、模型錯誤或工程細節。不要執行付款、退款、取消訂單，只能提供導引。';

  if (!grounded) {
    return `${base} 如果問題超出商品、訂單、付款、退款、配送、帳號或願望清單範圍，請禮貌引導使用者回到商城客服問題。`;
  }

  return `${base} 你必須根據提供的商城資料回答；如果資料不足，請說明目前能確認的資訊，並引導使用者到相關頁面查看。回答控制在 4 到 8 句。`;
}

export function registerChatRoutes({ app, io, state, openaiClient }: RouteDeps) {
  const { messages } = state;

  io.on('connection', (socket: Socket) => {
    socket.emit('chatHistory', messages);

    socket.on('sendMessage', (message: { user?: string; text: string }) => {
      const newMessage = {
        user: message.user || '會員',
        text: message.text,
        timestamp: new Date().toLocaleTimeString(),
      };
      messages.push(newMessage);
      persistState(state);
      io.emit('receiveMessage', newMessage);
    });
  });

  app.post('/gpt-reply', async (req: TypedRequest<GptReplyBody>, res: Response) => {
    const message = req.body?.message?.trim();
    if (!message) {
      return res.status(400).json({ error: '請輸入訊息。' });
    }

    const result = await queryAssistant({
      openaiClient,
      messages: [
        { role: 'system', content: buildSystemPrompt(false) },
        { role: 'user', content: message },
      ],
    });

    return res.json({
      reply: result?.reply || buildFallbackReply(message, false),
      provider: result?.provider,
    });
  });

  app.post('/chat/rag', async (req: TypedRequest<GptReplyBody>, res: Response) => {
    const message = req.body?.message?.trim();
    if (!message) {
      return res.status(400).json({ error: '請輸入訊息。' });
    }

    const contexts = retrieveRagContext(state, message, 4);
    const sourceItems = contexts.map((item) => ({
      id: item.doc.id,
      title: item.doc.title,
      type: item.doc.type,
      score: item.score,
    }));
    const grounded = contexts.length > 0;

    if (!grounded && !isServiceQuestion(message)) {
      return res.json({
        reply: buildFallbackReply(message, false),
        grounded: false,
        mode: 'out-of-scope',
        sources: [],
      });
    }

    const contextText = contexts
      .map((item, index) => `[來源 ${index + 1}] ${item.doc.title}：${item.doc.content}`)
      .join('\n');

    const result = await queryAssistant({
      openaiClient,
      temperature: grounded ? 0.2 : 0.35,
      messages: [
        { role: 'system', content: buildSystemPrompt(grounded) },
        {
          role: 'user',
          content: grounded
            ? `使用者問題：${message}\n\n商城資料：\n${contextText}`
            : `使用者問題：${message}`,
        },
      ],
    });

    return res.json({
      reply: result?.reply || buildFallbackReply(message, grounded, contexts),
      grounded,
      mode: grounded ? (result ? 'service-rag' : 'service-rag-fallback') : result ? 'general-service' : 'service-fallback',
      provider: result?.provider,
      sources: sourceItems,
    });
  });
}
