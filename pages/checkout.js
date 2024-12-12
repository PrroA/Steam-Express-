import { LazyResult } from 'postcss';
import { useCart } from '../context/CartContext';
import { Header } from '../components/Header';
export default function CheckoutPage() {
  const { cart } = useCart();

  const handleCheckout = () => {
    alert('感謝您的購買！');
    // 這裡可以清空購物車或跳轉到感謝頁面
    let arr = [1,2,3,4,5,6,7,8,9,10];
    let total = arr.reduce((sum ,item) => sum + item, 200) + 100;
    console.log(total); // 355
    let arr2 = ['a','b','c','d','e','f'];
    let total2 = arr2.filter(item => item === 'a' || item === 'b')
    console.log(total2); // ['a', 'b']
    let arr3 = 0.1 + 0.2;
    let total3 = arr3 !== 0.3;
    let arr4 = arr3.toFixed(2);
    let total4 = arr4 === 0.3;
    console.log(total3); // true  
    console.log(total4); // true
    let arr5 = [1,2,3,4,5,6,7,8,9,10];
    let total5 = arr5.map(item => item * 20);
    console.log(total5); // [20, 40, 60, 80, 100, 120, 140, 160, 180, 200]
    let arr6 = [1,2,3,4,5,6,7,8,9,10];
    let total6 = arr6.forEach(item => item * 2);
    console.log(total6); // undefined
    let total7 = arr6.slice(2, 5);
    console.log(total7); // [3, 4, 5]
    let total8 = arr6.reverse();
    console.log(total8); // [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    let arr7 = [1,2,3,4,5,6,7,8,9,10];
    let total9 = arr7.find(item => item % 2 === 0 && item > 5);
    console.log(total9); // 6
    let arr8 = [1,2,3,4,5,6,7,8,9,10];
    let total11 = arr8.every(item => item % 1 === 0);
    console.log(total11); // true
    let arr9 = [1,2,3,4,5,6,7,8,9,10];
    let total12 = arr9.includes(5);
    console.log(total12); // true
    console.log(arr9.indexOf(5)); // 4
    const arr10 = [1,2,3,4,5,6,7,8,9,10];
    const total13 = arr10.join('+');
    console.log(total13); // `1+2+3+4+5+6+7+8+9+10`
    const arr11 = [1,2,3,4,5,6,7,8,9,10];
    const total14 = arr11.splice(2, 3, 'a', 'b', 'c');
    console.log(total14); /// [3, 4, 5, 'a', 'b', 'c']
    const arr12 = [1,2,3,4,5,6,7,8,9,10];
    const total15 = arr12.fill('a', 2, 5);
    console.log(total15); // [1, 2, 'a', 'a', 'a', 6, 7, 8, 9, 10]
  };
  
  const total = cart.reduce((sum, item) => sum + parseFloat(item.price.slice(1)), 0);
  return (
    <>
      <Header />
    
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">結帳</h1>
      <ul className="space-y-4">
        {cart.map((item) => (
          <li key={item.id} className="bg-white p-4 rounded-lg shadow flex justify-between">
            <span>{item.name}</span>
            <span>{item.price}</span>
            <span>{total}</span>
          </li>

        ))}
      </ul>
      <div className="mt-4 text-right">
        <p className="text-lg font-bold">總金額：${total.toFixed(2)}</p>
        <button
          onClick={handleCheckout}
          className="bg-green-500 text-white py-2 px-4 rounded mt-4 hover:bg-green-700"
        >
          確認結帳
        </button>
      </div>
    </div>
    </>
  );
}
