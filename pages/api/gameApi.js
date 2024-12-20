import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const fetchGames = async (query = '') => {
  const response = await axios.get(`${BASE_URL}/games`, {
    params: { query },
  });
  return response.data;
};

export const fetchGameDetails = async (id) => {
  const response = await axios.get(`${BASE_URL}/games/${id}`);
  return response.data;
};
