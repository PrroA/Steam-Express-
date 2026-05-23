import { ErrorPageView } from '../components/ErrorPageView';
import type { NextPage, NextPageContext } from 'next';

function getErrorText(statusCode) {
  if (statusCode === 404) {
    return {
      code: '404',
      title: '找不到這個頁面',
      description: '這個連結可能已經移動，請回到商店重新瀏覽。',
    };
  }

  if (statusCode === 500) {
    return {
      code: '500',
      title: '頁面暫時無法顯示',
      description: '剛剛的操作沒有順利完成，請稍後再試，或先回到商店繼續瀏覽。',
    };
  }

  return {
    code: String(statusCode || ''),
    title: '頁面暫時無法顯示',
    description: '請稍後再試，或回到商店繼續瀏覽。',
  };
}

type ErrorPageProps = {
  statusCode: number;
};

type ErrorPageComponent = NextPage<ErrorPageProps> & {
  getInitialProps?: (context: NextPageContext) => ErrorPageProps;
};

const ErrorPage: ErrorPageComponent = ({ statusCode }) => {
  const copy = getErrorText(statusCode);
  return <ErrorPageView code={copy.code} title={copy.title} description={copy.description} />;
};

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 500;
  return { statusCode };
};

export default ErrorPage;
