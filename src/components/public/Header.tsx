import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Header = ({ onCartClick }: { onCartClick: () => void }) => {
  const { itemCount } = useCart();
  const { data: settings } = useSiteSettings();

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="AMOZI" className="h-10 w-auto" />
          ) : (
            <span className="font-display text-2xl font-bold text-primary">AMOZI</span>
          )}
          <span className="hidden sm:block font-display text-sm text-accent">Delícias no Pote</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <a href="#produtos" className="hover:text-primary transition-colors">Produtos</a>
          <a href="#sobre" className="hover:text-primary transition-colors">Sobre Nós</a>
          <a href="#contato" className="hover:text-primary transition-colors">Contato</a>
        </nav>

        <Button variant="outline" size="sm" onClick={onCartClick} className="relative">
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
};

export default Header;
