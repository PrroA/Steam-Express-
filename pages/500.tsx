import { ErrorPageView } from '../components/ErrorPageView';

export default function Custom500() {
  return (
    <ErrorPageView
      code="500"
      title="頁面暫時無法顯示"
      description="剛剛的操作沒有順利完成，請稍後再試，或先回到商店繼續瀏覽。"
    />
  );
}
