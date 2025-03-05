import { useEffect, useState } from "react";
import { Header } from "../components/Header";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export default function ProfilePage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/profile`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` },
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data);
                setUsername(data.username);
                setEmail(data.email);
            }
            setLoading(false);
        };

        fetchProfile();
    }, []);

    const handleUpdateProfile = async () => {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ username, email }),
        });

        if (res.ok) {
            alert("個人資料更新成功！");
        } else {
            alert("更新失敗");
        }
    };

    if (loading) return <p className="text-center text-gray-500">載入中...</p>;

    return (
        <>
            <Header />
            <div className="p-6 bg-gray-900 min-h-screen text-white">
                <h1 className="text-3xl font-bold mb-6">👤 個人資料</h1>

                <div className="max-w-lg mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
                    <label className="block text-lg">用戶名:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-2 mb-4 bg-gray-700 rounded"
                    />

                    <label className="block text-lg">電子郵件:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 mb-4 bg-gray-700 rounded"
                    />

                    <button
                        onClick={handleUpdateProfile}
                        className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-700"
                    >
                        更新資料
                    </button>
                </div>
            </div>
        </>
    );
}
