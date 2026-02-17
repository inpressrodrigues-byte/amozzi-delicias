import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground mb-3">Pagamento Confirmado!</h1>
        <p className="text-muted-foreground mb-8">
          Seu pedido foi recebido e está sendo preparado com carinho. Você receberá atualizações pelo WhatsApp.
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate('/')} className="bg-primary hover:bg-primary/90 rounded-full">
            Voltar à Loja
          </Button>
          <Button variant="outline" onClick={() => navigate('/rastrear')} className="rounded-full">
            Rastrear Pedido
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
