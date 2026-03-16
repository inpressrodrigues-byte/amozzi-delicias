import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Checkout from "./pages/Checkout";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";
import Finances from "./pages/admin/Finances";
import Orders from "./pages/admin/Orders";
import Settings from "./pages/admin/Settings";
import Coupons from "./pages/admin/Coupons";
import RemoteOrders from "./pages/admin/RemoteOrders";
import InternalControl from "./pages/admin/InternalControl";
import Customers from "./pages/admin/Customers";
import Profiles from "./pages/admin/Profiles";
import Ideas from "./pages/admin/Ideas";
import TrackOrder from "./pages/TrackOrder";
import CostCalculator from "./pages/admin/CostCalculator";
import PaymentSuccess from "./pages/PaymentSuccess";
import MyOrders from "./pages/MyOrders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/products" element={<Products />} />
              <Route path="/admin/finances" element={<Finances />} />
              <Route path="/admin/orders" element={<Orders />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/admin/coupons" element={<Coupons />} />
              <Route path="/admin/remote-orders" element={<RemoteOrders />} />
              <Route path="/admin/internal" element={<InternalControl />} />
              <Route path="/admin/customers" element={<Customers />} />
              <Route path="/admin/profiles" element={<Profiles />} />
              <Route path="/admin/ideas" element={<Ideas />} />
              <Route path="/rastrear" element={<TrackOrder />} />
              <Route path="/rastrear/:code" element={<TrackOrder />} />
              <Route path="/meus-pedidos" element={<MyOrders />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

