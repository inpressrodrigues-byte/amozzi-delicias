import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useProductCategories } from '@/hooks/useProductCategories';
import ProductCard from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

const ProductsSection = () => {
  const { data: products, isLoading } = useProducts();
  const { categories: productCategories } = useProductCategories();
  const [filter, setFilter] = useState<string>('all');

  const categories = [{ key: 'all', label: 'Todos' }, ...productCategories];

const ProductsSection = () => {
  const { data: products, isLoading } = useProducts();
  const [filter, setFilter] = useState<string>('all');

  const filtered = products?.filter(p =>
    filter === 'all' ? true : p.category === filter
  ) ?? [];

  return (
    <section id="produtos" className="py-20 bg-card relative">
      {/* Decorative top wave */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background/50 to-transparent" />

      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-[0.3em]">Cardápio</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-2 text-foreground">
            Nossos Produtos
          </h2>
          <p className="text-muted-foreground mt-3 text-lg max-w-xl mx-auto">
            Deliciosamente recheados e com muito sabor, cada produto é criado para proporcionar mais amor.
          </p>
        </motion.div>

        {/* Category tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-muted rounded-full p-1 gap-1">
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setFilter(cat.key)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  filter === cat.key
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block">🧁</span>
            <p className="text-muted-foreground text-lg">Nenhum produto disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductsSection;
