import '../styles/globals.css';
import { CartProvider } from '../context/CartContext';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Footer from '../components/Footer';
import { Header } from '@/components/Header';

export default function App({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <ToastContainer />
      <Header />
      <CartProvider>
        <Component {...pageProps} />
        <Footer />
      </CartProvider>
    </Provider>
  );
}
