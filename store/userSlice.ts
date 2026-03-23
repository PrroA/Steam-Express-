// 負責管理用戶的登入狀態
import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'user',
  initialState: {
    userInfo: null,
    token: null,
  },
  reducers: {
    login: (state, action) => {
      state.userInfo = action.payload.userInfo;
      state.token = action.payload.token;
    },
    logout: (state) => {
      state.userInfo = null;
      state.token = null;
    },
  },
});

export const { login, logout } = userSlice.actions;
export default userSlice.reducer;
