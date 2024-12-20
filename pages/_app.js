import '../styles/globals.css';
import { CartProvider } from '../context/CartContext';
import { Provider } from 'react-redux';
import { store } from '../store/store'; 

export default function App({ Component, pageProps }) {
  return (
    <Provider store={store}>
      <CartProvider>
        <Component {...pageProps} />
      </CartProvider>
    </Provider>
  );
}
