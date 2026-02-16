import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import ProductCard from './ProductCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const ProductsSection = () => {
  const { data: products, isLoading } = useProducts();
  const [filter, setFilter] = useState<string>('all');

  const filtered = products?.filter(p =>
    filter === 'all' ? true : p.category === filter
  ) ?? [];

  return (
    <section id="produtos" className="py-16 bg-card">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-2 text-foreground">
          Nossos Produtos
        </h2>
        <p className="text-center text-muted-foreground mb-8">Escolha seus sabores favoritos</p>

        <div className="flex justify-center gap-3 mb-10">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'bolo_no_pote', label: 'Bolos no Pote' },
            { key: 'marmita_salgada', label: 'Marmitas Salgadas' },
          ].map(cat => (
            <Button
              key={cat.key}
              variant={filter === cat.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(cat.key)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nenhum produto disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
