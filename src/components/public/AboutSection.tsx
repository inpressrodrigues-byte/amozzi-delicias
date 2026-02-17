import { motion } from 'framer-motion';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Heart, Star, Truck } from 'lucide-react';

const features = [
  { icon: Heart, title: 'Feito com Amor', desc: 'Cada produto é preparado artesanalmente com ingredientes selecionados.' },
  { icon: Star, title: 'Qualidade Premium', desc: 'Ingredientes frescos e de alta qualidade em todas as receitas.' },
  { icon: Truck, title: 'Entrega Rápida', desc: 'Entregamos com cuidado para manter a qualidade até sua porta.' },
];

const AboutSection = () => {
  const { data: settings } = useSiteSettings();

  return (
    <section id="sobre" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Features row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center p-8 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <f.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* About text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-[0.3em]">Nossa História</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-2 mb-6 text-foreground">Sobre Nós</h2>
          <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
            {settings?.about_text || 'Somos a AMOZI, uma empresa dedicada a criar delícias artesanais com ingredientes selecionados e muito amor. Cada bolo no pote e marmita salgada é preparado com carinho, trazendo sabores que aquecem o coração.'}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
