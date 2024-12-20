//購物車狀態 跟 相關的 action 
import { createSlice } from '@reduxjs/toolkit';

// 定義購物車的初始狀態
const initialState = {
  items: [], // 購物車內的所有商品，每個商品包含 id, name, price, quantity 等資訊
};

// 創建 cartSlice，用來處理購物車的狀態
const cartSlice = createSlice({
  name: 'cart', // slice 名稱，用於區分其他 slice
  initialState, // 初始狀態
  reducers: {
    // 新增商品到購物車
    addItem: (state, action) => {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) {
        // 如果商品已存在，增加數量
        item.quantity += 1;
      } else {
        // 如果商品不存在，新增商品並設置數量為 1
        state.items.push({ ...action.payload, quantity: 1 });
      }
    },
    // 從購物車移除商品
    removeItem: (state, action) => {
      // 過濾掉匹配的商品
      state.items = state.items.filter((i) => i.id !== action.payload.id);
    },
    // 清空購物車
    clearCart: (state) => {
      state.items = []; // 將購物車重置為空陣列
    },
    // 修改商品數量
    updateItemQuantity: (state, action) => {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) {
        item.quantity = action.payload.quantity;
      }
    },
  },
});



// 導出 actions，供其他地方呼叫來修改購物車狀態
export const { addItem, removeItem, clearCart , updateItemQuantity} = cartSlice.actions;

// 導出 reducer，用於整合到 Redux Store 中
export default cartSlice.reducer;

