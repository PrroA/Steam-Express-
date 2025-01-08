import { useState } from 'react';
import axios from 'axios';
import { Header} from '../components/Header';
import { toast } from 'react-toastify';
export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleRegister = async () => {
        console.log(username, password);
        try {
            const response = await axios.post('http://localhost:4000/register', { username, password });
            toast.success(response.data.message); 
        } catch (error) {
            toast.error(error.response?.data?.message || '註冊失敗'); 
        }
    };

    return (
        <>
            <Header />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-4 text-blue-500">註冊</h1>
                <input
                    type="text"
                    placeholder="用戶名"
                    className="w-full p-2 mb-4 border rounded text-blue-500"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="密碼"
                    className="w-full p-2 mb-4 border rounded text-blue-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button
                    onClick={handleRegister}
                    className="bg-blue-500 text-white w-full py-2 rounded hover:bg-blue-700"
                >
                    註冊
                </button>
            </div>
        </div>
        </>
    );
}
