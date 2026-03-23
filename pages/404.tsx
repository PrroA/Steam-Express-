import { ErrorPageView } from '../components/ErrorPageView';

export default function Custom404() {
  return (
    <ErrorPageView
      code="404"
      title="找不到這個頁面"
      description="你造訪的連結不存在，可能已被移除或路徑輸入錯誤。"
    />
  );
}
