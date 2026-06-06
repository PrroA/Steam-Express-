import { ErrorPageView } from '../components/ErrorPageView';

export default function Custom500() {
  return (
    <ErrorPageView
      title="頁面暫時無法載入"
      description="這個頁面剛剛沒有順利打開。你可以先回到商店，或稍後再重新整理一次。"
    />
  );
}
