import { motion } from 'framer-motion';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { MessageCircle } from 'lucide-react';

const FloatingButtons = () => {
  const { data: settings } = useSiteSettings();
  const whatsapp = settings?.whatsapp_number?.replace(/\D/g, '');
  const ifoodUrl = (settings as any)?.ifood_url;

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-3">
      {/* iFood button */}
      {ifoodUrl && (
        <motion.a
          href={ifoodUrl}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-[#EA1D2C] text-white rounded-full shadow-xl px-4 py-3 font-bold text-sm hover:shadow-2xl transition-shadow"
          title="Peça pelo iFood"
        >
          <span className="text-lg">🛵</span>
          <span className="hidden sm:inline">Peça no iFood</span>
        </motion.a>
      )}

      {/* WhatsApp button */}
      {whatsapp && (
        <motion.a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá! Quero fazer um pedido 🍰')}`}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-[#25D366] text-white rounded-full shadow-xl px-4 py-3 font-bold text-sm hover:shadow-2xl transition-shadow"
          title="Fale pelo WhatsApp"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </motion.a>
      )}
    </div>
  );
};

export default FloatingButtons;
