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
        <div className="aspect-[4/3] overflow-hidden relative">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary/30">
              <span className="text-6xl">🧁</span>
            </div>
          )}
          {/* Category badge */}
          <span className="absolute top-3 left-3 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            {categoryLabel}
          </span>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-display text-xl font-bold text-foreground mb-1 leading-tight">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
          )}
          <NutritionTable productId={product.id} />

          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary font-display">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center border border-border rounded-full overflow-hidden">
              <button
                className="px-3 py-2 hover:bg-muted transition-colors text-muted-foreground"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center text-sm font-bold text-foreground">{quantity}</span>
              <button
                className="px-3 py-2 hover:bg-muted transition-colors text-muted-foreground"
                onClick={() => setQuantity(q => q + 1)}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <Button
              onClick={handleAdd}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-semibold gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Pedir
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
