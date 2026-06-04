import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/ChatPage',
    permanent: false,
  },
});

export default function LegacyChatRedirect() {
  return null;
}
