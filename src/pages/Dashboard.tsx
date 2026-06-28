import { useMemo } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Package } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { useOrders, useProducts } from '@/hooks/use-supabase-data';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t } = useTranslation();
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts();
  const lowStockCount = products.filter((p) => p.stock <= p.lowStockThreshold).length;

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const completedOrders = orders.filter((o) => o.status === 'completed');
    const todayOrders = completedOrders.filter((o) => o.date.startsWith(todayStr));
    const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
    const totalRevenue = completedOrders.reduce((s, o) => s + o.total, 0);
    const avgOrder = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    const weekData: Record<string, { revenue: number; orders: number }> = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach((d) => (weekData[d] = { revenue: 0, orders: 0 }));
    completedOrders.forEach((o) => {
      const d = new Date(o.date);
      const day = days[d.getDay()];
      weekData[day].revenue += o.total;
      weekData[day].orders += 1;
    });
    const weeklyRevenue = days.map((day) => ({ day, revenue: Math.round(weekData[day].revenue * 100) / 100, orders: weekData[day].orders }));

    const productSales: Record<string, { name: string; sold: number; revenue: number }> = {};
    completedOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!productSales[item.productId]) productSales[item.productId] = { name: item.name, sold: 0, revenue: 0 };
        productSales[item.productId].sold += item.quantity;
        productSales[item.productId].revenue += item.price * item.quantity;
      });
    });
    const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return { todayRevenue, todayOrderCount: todayOrders.length, avgOrder, weeklyRevenue, topProducts };
  }, [orders]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('welcomeBack')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title={t('todaysRevenue')} value={`$${stats.todayRevenue.toFixed(2)}`} change={`${orders.filter(o => o.status === 'completed').length} ${t('orders').toLowerCase()}`} changeType="positive" icon={DollarSign} delay={0} />
        <MetricCard title={t('ordersToday')} value={String(stats.todayOrderCount)} change={t('completed')} changeType="positive" icon={ShoppingCart} delay={60} />
        <MetricCard title={t('avgOrderValue')} value={`$${stats.avgOrder.toFixed(2)}`} change={`${orders.filter(o => o.status === 'completed').length} ${t('orders').toLowerCase()}`} changeType="positive" icon={TrendingUp} delay={120} />
        <MetricCard title={t('lowStockItems')} value={String(lowStockCount)} change={t('needsAttention')} changeType={lowStockCount > 0 ? 'negative' : 'positive'} icon={Package} delay={180} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-xl p-5 shadow-sm opacity-0 animate-fade-up" style={{ animationDelay: '240ms' }}>
          <h2 className="text-sm font-medium mb-4">{t('weeklyRevenue')}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyRevenue} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '13px' }} formatter={(value: number) => [`$${value.toLocaleString()}`, t('revenue')]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm opacity-0 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <h2 className="text-sm font-medium mb-4">{t('topProducts')}</h2>
          <div className="space-y-4">
            {stats.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('noItemsYet')}</p>
            ) : (
              stats.topProducts.map((product, i) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground w-5">{i + 1}</span>
                    <div className="min-w-0">
                      <span className="text-sm truncate block">{product.name}</span>
                      <span className="text-xs text-muted-foreground">{product.sold} {t('soldItems')}</span>
                    </div>
                  </div>
                  <span className="text-sm font-medium tabular-nums">${product.revenue.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm opacity-0 animate-fade-up" style={{ animationDelay: '360ms' }}>
        <div className="p-5 border-b border-border/50">
          <h2 className="text-sm font-medium">{t('recentOrders')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('order')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('customer')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('status')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('payment')}</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('total')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((order) => (
                <tr key={order.dbId} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium">{order.id}</td>
                  <td className="px-5 py-3 text-muted-foreground">{order.customerName || t('walkIn')}</td>
                  <td className="px-5 py-3">
                    <Badge variant={order.status === 'completed' ? 'default' : 'destructive'} className={order.status === 'completed' ? 'bg-success/10 text-success border-0 hover:bg-success/20' : ''}>
                      {t(order.status === 'partial-refund' ? 'partialRefund' : order.status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 capitalize text-muted-foreground">{t(order.paymentMethod === 'split' ? 'splitPayment' : order.paymentMethod)}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">${order.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
