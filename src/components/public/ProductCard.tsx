import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

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

  const handleAdd = () => {
    addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url ?? undefined });
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden group hover:shadow-lg transition-shadow duration-300">
        <div className="aspect-square overflow-hidden bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-5xl">🧁</span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <span className="text-xs font-medium text-accent uppercase tracking-wide">
            {product.category === 'bolo_no_pote' ? 'Bolo no Pote' : 'Marmita Salgada'}
          </span>
          <h3 className="font-display text-lg font-semibold mt-1 text-foreground">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
          )}
          <div className="flex items-center justify-between mt-4">
            <span className="text-xl font-bold text-primary">
              R$ {product.price.toFixed(2).replace('.', ',')}
            </span>
            <Button size="sm" onClick={handleAdd} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" /> Pedir
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProductCard;
