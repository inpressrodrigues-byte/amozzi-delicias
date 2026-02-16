import { motion } from 'framer-motion';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  const { data: settings } = useSiteSettings();

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/30 to-background" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center px-4 max-w-3xl mx-auto"
      >
        {settings?.logo_url && (
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            src={settings.logo_url}
            alt="AMOZI"
            className="h-32 w-auto mx-auto mb-6"
          />
        )}
        <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-4">
          {settings?.hero_title || 'AMOZI Delícias no Pote'}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 font-light">
          {settings?.hero_subtitle || 'Bolos no pote artesanais feitos com amor e carinho'}
        </p>
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 text-lg"
          onClick={() => document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Ver Produtos
        </Button>
      </motion.div>
    </section>
  );
};

export default HeroSection;
