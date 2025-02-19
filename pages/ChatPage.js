import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Header } from "../components/Header";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const user = "你"; 

  useEffect(() => {
    const newSocket = io("http://localhost:4000");
    setSocket(newSocket);

    newSocket.off("chatHistory").on("chatHistory", (chatHistory) => {
      setMessages(chatHistory);
    });

    newSocket.off("receiveMessage").on("receiveMessage", (newMessage) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleSendMessage = () => {
    if (message.trim() !== "" && socket) {
      const chatMessage = {
        user: user, 
        text: message,
        timestamp: new Date().toLocaleTimeString(),
      };
      socket.emit("sendMessage", chatMessage); 
      setMessage(""); // 清空輸入框
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
            const isSystem = msg.user === "系統通知";

            return (
              <div key={index} className={`flex mb-2 ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`p-3 rounded-lg max-w-xs ${isMe ? "bg-green-500 text-white" : isSystem ? "bg-blue-500 text-white" : "bg-gray-700 text-white"}`}
                >
                  <span className="block text-sm font-bold">{msg.user}</span>
                  <span className="block">{msg.text}</span>
                  <span className="block text-xs text-gray-300 mt-1">{msg.timestamp}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 w-full max-w-2xl flex">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="輸入訊息..."
            className="flex-1 p-3 border rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
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
