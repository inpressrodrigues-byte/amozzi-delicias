import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import NutritionTable from '@/components/public/NutritionTable';
import { useProductCategories } from '@/hooks/useProductCategories';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  tags?: string[];
}

const ProductCard = ({ product }: { product: Product }) => {
  const { addItem } = useCart();
  const { getCategoryLabel } = useProductCategories();
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    addItem(
      { id: product.id, name: product.name, price: product.price, image_url: product.image_url ?? undefined },
      quantity
    );
    toast.success(`${quantity}x ${product.name} adicionado ao carrinho!`);
    setQuantity(1);
  };

  const categoryLabel = getCategoryLabel(product.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group"
    >
      <div className="bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 border border-border/50">
        {/* Image */}
        <div className="aspect-[4/3] overflow-hidden relative bg-secondary/10">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary/30">
              <span className="text-6xl">🧁</span>
            </div>
          )}
          {/* Category badge */}
          <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-accent text-accent-foreground text-[8px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
            {categoryLabel}
          </span>
          {/* Tags badges (fitness, zero sugar, etc.) */}
          {product.tags && (product.tags as string[]).length > 0 && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-0.5 sm:gap-1">
              {(product.tags as string[]).slice(0, 2).map((tag: string) => (
                <span
                  key={tag}
                  className={`text-[7px] sm:text-[9px] font-extrabold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-md ${
                    tag === 'fitness' ? 'bg-emerald-500 text-white' :
                    tag === 'zero_acucar' ? 'bg-sky-500 text-white' :
                    tag === 'vegano' ? 'bg-lime-500 text-white' :
                    tag === 'sem_gluten' ? 'bg-amber-500 text-white' :
                    'bg-primary text-primary-foreground'
                  }`}
                >
                  {tag === 'fitness' ? '💪 FIT' :
                   tag === 'zero_acucar' ? '🚫 ZERO' :
                   tag === 'vegano' ? '🌱 VEG' :
                   tag === 'sem_gluten' ? '🌾 S/G' :
                   tag.toUpperCase().slice(0, 6)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-5">
          <h3 className="font-display text-sm sm:text-xl font-bold text-foreground mb-0.5 sm:mb-1 leading-tight line-clamp-2">{product.name}</h3>
          {product.description && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 sm:line-clamp-2 mb-1 sm:mb-2 hidden sm:block">{product.description}</p>
          )}
          <div className="hidden sm:block">
            <NutritionTable productId={product.id} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg sm:text-2xl font-bold text-primary font-display">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-4">
            <div className="flex items-center border border-border rounded-full overflow-hidden">
              <button
                className="px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-muted transition-colors text-muted-foreground"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-5 sm:w-8 text-center text-xs sm:text-sm font-bold text-foreground">{quantity}</span>
              <button
                className="px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-muted transition-colors text-muted-foreground"
                onClick={() => setQuantity(q => q + 1)}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <Button
              onClick={handleAdd}
              size="sm"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-semibold gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10"
            >
              <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Pedir</span>
              <span className="sm:hidden">+</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
