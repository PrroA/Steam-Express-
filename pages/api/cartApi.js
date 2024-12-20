import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const fetchCart = async (token) => {
  const response = await axios.get(`${BASE_URL}/cart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const addToCart = async (gameId, token) => {
    const response = await axios.post(
      `${BASE_URL}/cart`, // 使用環境變數 BASE_URL
      { id: gameId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  };
  
  
export const updateCartQuantity = async (id, quantity, token) => {
  const response = await axios.patch(
    `${BASE_URL}/cart/${id}`,
    { quantity },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

export const removeFromCart = async (id, token) => {
  const response = await axios.delete(`${BASE_URL}/cart/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
