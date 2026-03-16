import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Clock, Store } from 'lucide-react';

interface StoreHours {
  enabled: boolean;
  weekday_open: string;
  weekday_close: string;
  weekend_open: string;
  weekend_close: string;
  closed_message: string;
}

const DEFAULT_HOURS: StoreHours = {
  enabled: false,
  weekday_open: '19:30',
  weekday_close: '22:00',
  weekend_open: '10:00',
  weekend_close: '22:00',
  closed_message: 'Estamos fechados no momento.',
};

export const useStoreStatus = () => {
  const { data: settings } = useSiteSettings();
  const hours: StoreHours = { ...DEFAULT_HOURS, ...((settings as any)?.store_hours || {}) };

  if (!hours.enabled) return { isOpen: true, hours, message: '' };

  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 6;
  const openTime = isWeekend ? hours.weekend_open : hours.weekday_open;
  const closeTime = isWeekend ? hours.weekend_close : hours.weekday_close;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  const openMinutes = oh * 60 + om;
  const closeMinutes = ch * 60 + cm;

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  const nextOpen = isWeekend ? hours.weekend_open : hours.weekday_open;
  const message = isOpen
    ? `Aberto até ${closeTime}`
    : `${hours.closed_message} Abrimos às ${nextOpen}.`;

  return { isOpen, hours, message };
};

const StoreStatusBanner = () => {
  const { data: settings } = useSiteSettings();
  const hours: StoreHours = { ...DEFAULT_HOURS, ...((settings as any)?.store_hours || {}) };
  const { isOpen, message } = useStoreStatus();

  if (!hours.enabled) return null;

  return (
    <div className={`w-full py-2.5 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 ${
      isOpen
        ? 'bg-green-500/10 text-green-700 border-b border-green-500/20'
        : 'bg-amber-500/10 text-amber-700 border-b border-amber-500/20'
    }`}>
      {isOpen ? <Store className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      <span>{isOpen ? '🟢 Loja Aberta' : '🔴 Loja Fechada'}</span>
      <span className="text-xs opacity-75 ml-1">— {message}</span>
    </div>
  );
};

export default StoreStatusBanner;
