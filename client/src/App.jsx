import { Route, Routes } from 'react-router-dom';
import { StoreLayout, ScrollToTop, Toasts } from './components/Layout.jsx';
import { RequireUser, NotFound } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import Product from './pages/Product.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderPlaced from './pages/OrderPlaced.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Account from './pages/Account.jsx';
import BecomeSeller from './pages/BecomeSeller.jsx';
import SellerLayout from './pages/seller/SellerLayout.jsx';
import SellerOverview from './pages/seller/Overview.jsx';
import SellerProducts from './pages/seller/Products.jsx';
import ProductEditor from './pages/seller/ProductEditor.jsx';
import SellerOrders from './pages/seller/Orders.jsx';
import SellerOrderDetail from './pages/seller/OrderDetail.jsx';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="products/:id" element={<Product />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="cart" element={<RequireUser><Cart /></RequireUser>} />
          <Route path="checkout" element={<RequireUser><Checkout /></RequireUser>} />
          <Route path="orders" element={<RequireUser><Orders /></RequireUser>} />
          <Route path="orders/:id" element={<RequireUser><OrderDetail /></RequireUser>} />
          <Route path="orders/:id/placed" element={<RequireUser><OrderPlaced /></RequireUser>} />
          <Route path="account" element={<RequireUser><Account /></RequireUser>} />
          <Route path="sell" element={<RequireUser><BecomeSeller /></RequireUser>} />
          <Route path="seller" element={<RequireUser seller><SellerLayout /></RequireUser>}>
            <Route index element={<SellerOverview />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="products/new" element={<ProductEditor />} />
            <Route path="products/:id" element={<ProductEditor />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="orders/:id" element={<SellerOrderDetail />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toasts />
    </>
  );
}
