import { ErrorPageView } from '../components/ErrorPageView';

export default function Custom500() {
  return (
    <ErrorPageView
      code="500"
      title="伺服器暫時忙碌"
      description="系統目前發生錯誤，請稍後再試，或先返回首頁繼續瀏覽。"
    />
  );
}
