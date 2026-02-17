import { useSiteSettings } from '@/hooks/useSiteSettings';
import { MessageCircle, Instagram, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const { data: settings } = useSiteSettings();
  const whatsapp = settings?.whatsapp_number || '';
  const instagram = (settings as any)?.instagram_url || '';

  const instagramHref = instagram.startsWith('http') ? instagram :
    instagram.startsWith('@') ? `https://instagram.com/${instagram.slice(1)}` :
    instagram ? `https://instagram.com/${instagram}` : '';

  return (
    <footer id="contato" className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-display text-xl font-bold mb-3">AMOZI</h3>
            <p className="text-sm opacity-80">Delícias no Pote — Feito com amor e carinho.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contato</h4>
            <div className="flex flex-col gap-2">
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {instagramHref && (
                <a
                  href={instagramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity"
                >
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Links</h4>
            <div className="flex flex-col gap-2 text-sm opacity-80">
              <a href="#produtos" className="hover:opacity-100 transition-opacity">Produtos</a>
              <a href="#sobre" className="hover:opacity-100 transition-opacity">Sobre Nós</a>
              <Link to="/rastrear" className="hover:opacity-100 transition-opacity">Rastrear Pedido</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-background/20 mt-8 pt-6 text-center text-sm opacity-60">
          <p className="flex items-center justify-center gap-1">
            Feito com <Heart className="h-3 w-3 text-primary" /> AMOZI © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
