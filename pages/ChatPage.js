'use client';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Header } from '../components/Header';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://steam-express.onrender.com'
    : 'http://localhost:4000');
const possibleKeywords = [
  '艾爾登',
  'Elden',
  '薩爾達',
  'Zelda',
  'Cyberpunk',
  '2077',
  '霍格華茲',
  'Hogwarts',
];

export default function ChatPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const user = '你';

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 初始化 socket
  useEffect(() => {
    const newSocket = io(`${API_BASE_URL}`);
    setSocket(newSocket);

    newSocket.off('chatHistory').on('chatHistory', (chatHistory) => {
      setMessages(chatHistory);
    });

    newSocket.off('receiveMessage').on('receiveMessage', (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // 自動滾到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 初次 focus 輸入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !socket) return;

    const userMessage = {
      user,
      text: trimmedMessage,
      timestamp: new Date().toLocaleTimeString(),
    };

    socket.emit('sendMessage', userMessage);
    setMessage('');

    // 1️⃣ 檢查關鍵字
    const matchedKeyword = possibleKeywords.find((kw) =>
      trimmedMessage.toLowerCase().includes(kw.toLowerCase())
    );

    if (matchedKeyword) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/games?query=${encodeURIComponent(matchedKeyword)}`
        );
        const data = await res.json();
        const aiReply = {
          user: 'AI助手',
          text:
            Array.isArray(data) && data.length > 0
              ? `🔍 找到：${data[0].name}，售價為 ${data[0].price}`
              : `找不到和「${matchedKeyword}」相關的遊戲唷～`,
          timestamp: new Date().toLocaleTimeString(),
        };
        socket.emit('sendMessage', aiReply);
      } catch (err) {
        console.error('查詢錯誤:', err);
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/gpt-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      const data = await res.json();
      const reply = data?.reply;

      const aiReply = {
        user: 'AI助手',
        text: reply || '抱歉，您的額度不足，請充值 🫠',

        timestamp: new Date().toLocaleTimeString(),
      };

      socket.emit('sendMessage', aiReply);
    } catch (err) {
      console.error('GPT 回覆錯誤:', err);
    }
  };

  return (
    <>
      <Header />
      <div className="p-6 bg-gray-900 min-h-screen flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4 text-white">💬 客服中心</h1>
        <div className="w-full max-w-2xl flex flex-col bg-gray-800 p-4 rounded-lg shadow-md h-[500px] overflow-y-auto">
          {messages.map((msg, index) => {
            const isMe = msg.user === user;
            const isSystem = msg.user === '系統通知';

            return (
              <div key={index} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`p-3 rounded-lg max-w-xs ${
                    isMe
                      ? 'bg-green-500 text-white'
                      : isSystem
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-white'
                  }`}
                >
                  <span className="block text-sm font-bold">{msg.user}</span>
                  <span className="block">{msg.text}</span>
                  <span className="block text-xs text-gray-300 mt-1">{msg.timestamp}</span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-4 w-full max-w-2xl flex">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="輸入訊息..."
            className="flex-1 p-3 border rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            className="ml-2 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition"
          >
            發送
          </button>
        </div>
      </div>
    </>
  );
}
