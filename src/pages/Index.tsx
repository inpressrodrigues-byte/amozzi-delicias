import { useState } from 'react';
import Header from '@/components/public/Header';
import HeroSection from '@/components/public/HeroSection';
import ProductsSection from '@/components/public/ProductsSection';
import AboutSection from '@/components/public/AboutSection';
import Footer from '@/components/public/Footer';
import CartDrawer from '@/components/public/CartDrawer';

const Index = () => {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Header onCartClick={() => setCartOpen(true)} />
      <HeroSection />
      <ProductsSection />
      <AboutSection />
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};

export default Index;
