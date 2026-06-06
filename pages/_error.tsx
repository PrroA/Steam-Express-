import { ErrorPageView } from '../components/ErrorPageView';
import type { NextPage, NextPageContext } from 'next';

function getErrorText(statusCode: number) {
  if (statusCode === 404) {
    return {
      title: '找不到這個頁面',
      description: '這個連結可能已經不存在，或商品暫時沒有上架。你可以先回到商店繼續瀏覽。',
    };
  }

  return {
    title: '頁面暫時無法載入',
    description: '這個頁面剛剛沒有順利打開。你可以先回到商店，或稍後再重新整理一次。',
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
  return <ErrorPageView title={copy.title} description={copy.description} />;
};

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 500;
  return { statusCode };
};

export default ErrorPage;
