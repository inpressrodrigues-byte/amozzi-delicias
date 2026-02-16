import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Package, DollarSign, Palette, LogOut, LayoutDashboard, ShoppingCart } from 'lucide-react';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/products', label: 'Estoque', icon: Package },
  { path: '/admin/finances', label: 'Financeiro', icon: DollarSign },
  { path: '/admin/orders', label: 'Pedidos', icon: ShoppingCart },
  { path: '/admin/settings', label: 'Personalização', icon: Palette },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Carregando...</p>
    </div>;
  }

  if (!user) return <Navigate to="/admin/login" />;
  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-muted-foreground mb-2">Acesso negado. Você não é administrador.</p>
        <Button onClick={signOut} variant="outline">Sair</Button>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-card border-r hidden md:flex flex-col">
        <div className="p-4 border-b">
          <Link to="/" className="font-display text-xl font-bold text-primary">AMOZI Admin</Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={location.pathname === item.path ? 'default' : 'ghost'}
                className="w-full justify-start"
                size="sm"
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t">
          <Button variant="ghost" className="w-full justify-start text-destructive" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t z-50 md:hidden">
        <div className="flex justify-around py-2">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={`flex flex-col items-center p-1 text-xs ${location.pathname === item.path ? 'text-primary' : 'text-muted-foreground'}`}>
              <item.icon className="h-5 w-5" />
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          ))}
        </div>
      </div>

      <main className="flex-1 p-6 pb-20 md:pb-6 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
