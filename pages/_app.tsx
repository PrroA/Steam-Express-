import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CartProvider } from '../context/CartContext';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Footer from '../components/Footer';
import { Header } from '@/components/Header';
import { FloatingSupportWidget } from '../components/FloatingSupportWidget';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const protectedPathPattern = /^\/(cart|orders|transactions|wishlist|profile|admin)(\/.*)?$/;
    if (!protectedPathPattern.test(router.pathname)) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      const redirectPath = encodeURIComponent(router.asPath);
      router.replace(`/login?redirect=${redirectPath}`);
    }
  }, [router]);

  return (
    <Provider store={store}>
      <ToastContainer />
      <Header />
      <CartProvider>
        <Component {...pageProps} />
        <FloatingSupportWidget />
        <Footer />
      </CartProvider>
    </Provider>
  );
}
