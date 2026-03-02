import { ErrorPageView } from '../components/ErrorPageView';

function getErrorText(statusCode) {
  if (statusCode === 404) {
    return {
      code: '404',
      title: '找不到這個頁面',
      description: '你造訪的連結不存在，請確認網址是否正確。',
    };
  }

  if (statusCode === 500) {
    return {
      code: '500',
      title: '伺服器暫時忙碌',
      description: '系統目前發生錯誤，請稍後再試，或先返回首頁。',
    };
  }

  return {
    code: String(statusCode || 'ERROR'),
    title: '發生未預期錯誤',
    description: '系統無法完成這次請求，請稍後再試。',
  };
}

export default function Error({ statusCode }) {
  const copy = getErrorText(statusCode);
  return (
    <ErrorPageView code={copy.code} title={copy.title} description={copy.description} />
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 500;
  return { statusCode };
};
