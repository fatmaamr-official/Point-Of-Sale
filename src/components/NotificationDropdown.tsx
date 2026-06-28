import { Bell, ShoppingCart, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNotificationStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

const iconMap = {
  order: ShoppingCart,
  stock: AlertTriangle,
  update: RefreshCw,
};

export function NotificationDropdown() {
  const { t } = useTranslation();
  const { notifications, markAsRead, markAllRead, unreadCount } = useNotificationStore();
  const count = unreadCount();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors duration-150 active:scale-95">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h3 className="text-sm font-semibold">{t('notifications')}</h3>
          {count > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              {t('markAllRead')}
            </button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('noNotifications')}</p>
          ) : (
            notifications.slice(0, 20).map((n) => {
              const Icon = iconMap[n.type];
              return (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0 ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${n.type === 'stock' ? 'text-warning' : n.type === 'order' ? 'text-success' : 'text-info'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-tight">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('justNow')}</p>
                  </div>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                </button>
              );
            })
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
