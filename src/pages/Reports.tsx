import { useState, useMemo } from 'react';
import { useOrders } from '@/hooks/use-supabase-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Reports() {
  const { t } = useTranslation();
  const { data: orders = [] } = useOrders();

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = o.date.split('T')[0];
      return d >= startDate && d <= endDate && o.status === 'completed';
    });
  }, [orders, startDate, endDate]);

  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((s, o) => s + o.total, 0);
    const totalCost = filteredOrders.reduce((s, o) => s + o.items.reduce((c, i) => c + i.price * i.quantity * 0.5, 0), 0); // estimate cost at 50%
    const profit = totalRevenue - totalCost;
    const avgOrder = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

    // Sales by date
    const salesByDate: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const key = o.date.split('T')[0];
      salesByDate[key] = (salesByDate[key] || 0) + o.total;
    });
    const dailyData = Object.entries(salesByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date: date.slice(5), revenue: Math.round(revenue * 100) / 100 }));

    // Payment methods
    const methodCounts: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      methodCounts[o.paymentMethod] = (methodCounts[o.paymentMethod] || 0) + 1;
    });
    const paymentData = Object.entries(methodCounts).map(([name, value]) => ({ name, value }));

    // Top products
    const productSales: Record<string, { name: string; sold: number; revenue: number }> = {};
    filteredOrders.forEach((o) => o.items.forEach((item) => {
      if (!productSales[item.productId]) productSales[item.productId] = { name: item.name, sold: 0, revenue: 0 };
      productSales[item.productId].sold += item.quantity;
      productSales[item.productId].revenue += item.price * item.quantity;
    }));
    const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    return { totalRevenue, totalCost, profit, avgOrder, dailyData, paymentData, topProducts, orderCount: filteredOrders.length };
  }, [filteredOrders]);

  const exportCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer', 'Payment', 'Status', 'Subtotal', 'Tax', 'Discount', 'Total'];
    const rows = filteredOrders.map((o) => [o.id, o.date, o.customerName || 'Walk-in', o.paymentMethod, o.status, o.subtotal.toFixed(2), o.tax.toFixed(2), o.discount.toFixed(2), o.total.toFixed(2)]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('reportExported'));
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('reports')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('salesAnalytics')}</p>
        </div>
        <Button onClick={exportCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />{t('exportCSV')}
        </Button>
      </div>

      {/* Date Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <Label className="text-xs">{t('startDate')}</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">{t('endDate')}</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">{t('daily')}</SelectItem>
            <SelectItem value="weekly">{t('weekly')}</SelectItem>
            <SelectItem value="monthly">{t('monthly')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('totalRevenue'), value: `$${stats.totalRevenue.toFixed(2)}` },
          { label: t('profit'), value: `$${stats.profit.toFixed(2)}` },
          { label: t('ordersCount'), value: String(stats.orderCount) },
          { label: t('avgOrderValue'), value: `$${stats.avgOrder.toFixed(2)}` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-xl font-bold mt-1 tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-medium mb-4">{t('salesTrend')}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-medium mb-4">{t('paymentMethods')}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {stats.paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border/50">
          <h2 className="text-sm font-medium">{t('topProducts')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">#</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{t('product')}</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{t('sold')}</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">{t('revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.topProducts.map((p, i) => (
                <tr key={p.name} className="border-b border-border/30 last:border-0 hover:bg-muted/30">
                  <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-5 py-3 font-medium">{p.name}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{p.sold}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">${p.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
