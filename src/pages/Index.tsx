import { useState } from 'react';
import Header from '@/components/public/Header';
import HeroSection from '@/components/public/HeroSection';
import ProductsSection from '@/components/public/ProductsSection';
import EncomendaSection from '@/components/public/EncomendaSection';
import AboutSection from '@/components/public/AboutSection';
import Footer from '@/components/public/Footer';
import CartDrawer from '@/components/public/CartDrawer';
import FloatingButtons from '@/components/public/FloatingButtons';
import StoreStatusBanner from '@/components/public/StoreStatusBanner';

const Index = () => {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <StoreStatusBanner />
      <Header onCartClick={() => setCartOpen(true)} />
      <HeroSection />
      <ProductsSection />
      <EncomendaSection />
      <AboutSection />
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <FloatingButtons />
    </div>
  );
};

export default Index;
