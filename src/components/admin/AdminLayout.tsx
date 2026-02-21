import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Package, DollarSign, Palette, LogOut, LayoutDashboard, ShoppingCart, Tag, ClipboardList } from 'lucide-react';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/products', label: 'Estoque', icon: Package },
  { path: '/admin/finances', label: 'Financeiro', icon: DollarSign },
  { path: '/admin/orders', label: 'Pedidos', icon: ShoppingCart },
  { path: '/admin/coupons', label: 'Cupons', icon: Tag },
  { path: '/admin/remote-orders', label: 'Remotos', icon: ClipboardList },
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
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar desktop */}
      <aside className="w-64 hidden md:flex flex-col bg-gradient-to-b from-primary/95 to-primary/80 text-primary-foreground shadow-xl">
        <div className="p-5 border-b border-white/10">
          <Link to="/" className="font-display text-2xl font-bold tracking-tight text-white drop-shadow">
            ✨ AMOZI
          </Link>
          <p className="text-xs text-white/60 mt-1">Painel Administrativo</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-white/20 text-white shadow-md backdrop-blur-sm'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${active ? 'drop-shadow' : ''}`} />
                  {item.label}
                </button>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="px-4 py-2 mb-2">
            <p className="text-xs text-white/50 truncate">{user.email}</p>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="h-5 w-5" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border shadow-lg z-50 md:hidden">
        <div className="flex justify-around py-2 px-1">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center p-1.5 rounded-lg text-xs transition-all ${
                  active
                    ? 'text-primary font-bold'
                    : 'text-muted-foreground'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${active ? 'bg-primary/10' : ''}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="mt-0.5">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 p-6 pb-24 md:pb-6 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
