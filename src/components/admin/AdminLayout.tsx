import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Package, DollarSign, Palette, LogOut, LayoutDashboard, ShoppingCart, Tag, ClipboardList, Menu, Database, UserCog, Lightbulb, Calculator } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/products', label: 'Estoque', icon: Package },
  { path: '/admin/calculator', label: 'Calculadora', icon: Calculator },
  { path: '/admin/finances', label: 'Financeiro', icon: DollarSign },
  { path: '/admin/orders', label: 'Pedidos', icon: ShoppingCart },
  { path: '/admin/coupons', label: 'Cupons', icon: Tag },
  { path: '/admin/remote-orders', label: 'Remotos', icon: ClipboardList },
  { path: '/admin/customers', label: 'Banco de Dados', icon: Database },
  { path: '/admin/internal', label: 'Controle Interno', icon: ClipboardList },
  { path: '/admin/settings', label: 'Personalização', icon: Palette },
  { path: '/admin/profiles', label: 'Perfis', icon: UserCog },
  { path: '/admin/ideas', label: 'Ideias', icon: Lightbulb },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Acesso negado. Você não é administrador.</p>
          <Button onClick={signOut} variant="outline">Sair</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 h-screen w-60 flex flex-col bg-card border-r border-border z-50 transition-transform duration-200",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-5 border-b border-border">
          <Link to="/" className="text-lg font-semibold tracking-tight text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            AMOZI
          </Link>
          <p className="text-[11px] text-muted-foreground mt-0.5 tracking-wide uppercase">Painel Admin</p>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-foreground text-background font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <p className="px-3 text-[11px] text-muted-foreground truncate mb-2">{user.email}</p>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>AMOZI</span>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
