import type { Request, Response } from 'express';
import type { Socket } from 'socket.io';
import type { RouteDeps } from './types';
import type { GptReplyBody } from '../../types/backend';

type TypedRequest<TBody> = Request & { body: TBody };

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
}
