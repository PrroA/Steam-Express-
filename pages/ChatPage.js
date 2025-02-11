import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Header } from '../components/Header';

const socket = io('http://localhost:4000'); // 與後端 WebSocket 伺服器連接

export default function ChatPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // 接收歷史聊天訊息
    socket.on('chatHistory', (chatHistory) => {
      setMessages(chatHistory);
    });
    // 接收新訊息
    socket.on('receiveMessage', (newMessage) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    return () => {
      socket.disconnect(); // 清理 WebSocket 連接
    };
  }, []);

  const handleSendMessage = () => {
    if (message.trim() !== '') {
      const chatMessage = {
        user: '匿名用戶', // 可替換為已登入用戶名稱
        text: message,
      };
      socket.emit('sendMessage', chatMessage); // 發送訊息給伺服器
      setMessage(''); // 清空輸入框
    }
  };


  return (
    <>
      <Header />
      <div className="p-6 bg-gray-100 min-h-screen flex flex-col">
        <h1 className="text-2xl font-bold mb-4">即時聊天</h1>
        <div className="flex-1 bg-white p-4 rounded-lg shadow overflow-y-auto">
          {messages.map((msg, index) => (
            <div 
            key={index} 
            className="mb-2"
            >
              <span className="font-bold">{msg.user}:</span>
              <span className="ml-2">{msg.text}</span>
              <span className="ml-4 text-gray-500 text-sm">{msg.timestamp}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="輸入訊息..."
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={handleSendMessage}
            className="ml-2 bg-blue-500 text-white px-4 py-2 rounded"
          >
            發送
          </button>
        </div>
      </div>
    </>
  );
}
