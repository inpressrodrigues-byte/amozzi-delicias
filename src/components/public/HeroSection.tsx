import { motion } from 'framer-motion';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import heroBg from '@/assets/hero-bg.jpg';

const HeroSection = () => {
  const { data: settings } = useSiteSettings();

  const bgImage = (settings as any)?.hero_image_url || heroBg;

  return (
    <section className="relative min-h-[70vh] sm:min-h-[85vh] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="relative z-10 text-center px-5 max-w-4xl mx-auto"
      >
        {settings?.logo_url && (
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            src={settings.logo_url}
            alt="AMOZI"
            className="h-28 md:h-36 w-auto mx-auto mb-8 drop-shadow-2xl"
          />
        )}
        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-lg">
          {settings?.hero_title || 'AMOZI Delícias no Pote'}
        </h1>
        <p className="text-lg md:text-xl text-white/80 mb-10 font-light max-w-2xl mx-auto leading-relaxed">
          {settings?.hero_subtitle || 'Bolos no pote artesanais feitos com amor e ingredientes selecionados'}
        </p>
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 py-6 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          onClick={() => document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Ver Cardápio
        </Button>
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <ChevronDown className="h-8 w-8 text-white/60" />
      </motion.div>
    </section>
  );
};

export default HeroSection;
