"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChatRoutes = registerChatRoutes;
function registerChatRoutes({ app, io, state, openaiClient }) {
    const { messages } = state;
    io.on('connection', (socket) => {
        socket.emit('chatHistory', messages);
        socket.on('sendMessage', (message) => {
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
    app.post('/gpt-reply', async (req, res) => {
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
        }
        catch (err) {
            const typedError = err;
            console.error('GPT API 錯誤:', typedError.response?.data || typedError.message || err);
            return res.status(500).json({ error: 'GPT 回覆失敗' });
        }
    });
}
