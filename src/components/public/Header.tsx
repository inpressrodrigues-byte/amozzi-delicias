import { useState, useEffect } from 'react';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Header = ({ onCartClick }: { onCartClick: () => void }) => {
  const { itemCount } = useCart();
  const { data: settings } = useSiteSettings();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#produtos', label: 'Cardápio' },
    { href: '#sobre', label: 'Sobre Nós' },
    { href: '#contato', label: 'Contato' },
    { href: '/meus-pedidos', label: 'Meus Pedidos', isRoute: true },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled
        ? 'bg-card/95 backdrop-blur-md shadow-lg py-2'
        : 'bg-transparent py-4'
    }`}>
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="AMOZI" className="h-10 w-auto" />
          ) : (
            <span className={`font-display text-2xl font-bold transition-colors ${scrolled ? 'text-primary' : 'text-white'}`}>
              AMOZI
            </span>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(link => link.isRoute ? (
            <Link
              key={link.href}
              to={link.href}
              className={`text-sm font-semibold tracking-wide uppercase transition-colors hover:text-primary ${
                scrolled ? 'text-foreground' : 'text-white/90'
              }`}
            >
              {link.label}
            </Link>
          ) : (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-semibold tracking-wide uppercase transition-colors hover:text-primary ${
                scrolled ? 'text-foreground' : 'text-white/90'
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button
            variant={scrolled ? 'outline' : 'ghost'}
            size="sm"
            onClick={onCartClick}
            className={`relative rounded-full ${!scrolled ? 'text-white border-white/30 hover:bg-white/10' : ''}`}
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-scale-in">
                {itemCount}
              </span>
            )}
          </Button>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className={`h-6 w-6 ${scrolled ? 'text-foreground' : 'text-white'}`} />
            ) : (
              <Menu className={`h-6 w-6 ${scrolled ? 'text-foreground' : 'text-white'}`} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-card/95 backdrop-blur-md border-t border-border">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-foreground font-semibold py-2 hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
