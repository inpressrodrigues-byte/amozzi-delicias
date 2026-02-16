import { motion } from 'framer-motion';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Heart } from 'lucide-react';

const AboutSection = () => {
  const { data: settings } = useSiteSettings();

  return (
    <section id="sobre" className="py-16 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Heart className="h-8 w-8 text-primary mx-auto mb-4" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6 text-foreground">Sobre Nós</h2>
          <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
            {settings?.about_text || 'Somos a AMOZI, uma empresa dedicada a criar delícias artesanais com ingredientes selecionados e muito amor.'}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
