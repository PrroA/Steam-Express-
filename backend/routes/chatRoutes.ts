import type { Request, Response } from 'express';
import type { Socket } from 'socket.io';
import type { RouteDeps } from './types';
import type { GptReplyBody } from '../../types/backend';
import { persistState } from '../persistence';
import { retrieveRagContext } from '../rag';

type TypedRequest<TBody> = Request & { body: TBody };

function buildFallbackRagReply(state: RouteDeps['state'], message: string) {
  const contexts = retrieveRagContext(state, message, 3);
  if (contexts.length === 0) {
    return {
      reply: '目前知識庫找不到直接答案，建議改問：訂單狀態、退款規則、庫存與版本、付款流程。',
      sources: [],
    };
  }
  return {
    reply:
      `根據平台資料整理如下：\n` +
      contexts.map((item) => `- ${item.doc.title}：${item.doc.content}`).join('\n'),
    sources: contexts.map((item) => item.doc.title),
  };
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

      const isUserMessage =
        newMessage.user === '你' || newMessage.user === '我' || newMessage.user === '訪客';
      if (isUserMessage && typeof newMessage.text === 'string' && newMessage.text.trim()) {
        const ragResult = buildFallbackRagReply(state, newMessage.text.trim());
        const supportReply = {
          user: 'AI助手',
          text:
            ragResult.reply +
            (ragResult.sources.length > 0
              ? `\n\n參考來源：${ragResult.sources.slice(0, 2).join('、')}`
              : ''),
          timestamp: new Date().toLocaleTimeString(),
        };
        messages.push(supportReply);
        persistState(state);
        io.emit('receiveMessage', supportReply);
      }
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
    if (!openaiClient) {
      return res.status(501).json({ error: 'GPT 功能尚未設定 OPENAI_API_KEY' });
    }

    try {
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: '你是一位親切的遊戲客服助手。' },
          { role: 'user', content: message },
        ],
      });
      const reply = completion.choices?.[0]?.message?.content;
      return res.json({ reply: reply || '（GPT 沒有回覆內容）' });
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
    if (contexts.length === 0) {
      return res.json({
        reply: '目前知識庫找不到直接答案，建議改問：訂單狀態、退款規則、庫存與版本、付款流程。',
        grounded: false,
        sources: [],
      });
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

    if (!openaiClient) {
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
        sources: sourceItems,
      });
    }

    try {
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              '你是電商平台客服。只能根據提供的知識回答，不可編造。請用繁體中文，簡潔且可執行。',
          },
          {
            role: 'user',
            content: `使用者問題：${message}\n\n可用知識：\n${contextText}`,
          },
        ],
      });

      const reply = completion.choices?.[0]?.message?.content || '目前無法產生回覆，請稍後再試。';
      return res.json({
        reply,
        grounded: true,
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
        sources: sourceItems,
      });
    }
  });
}
