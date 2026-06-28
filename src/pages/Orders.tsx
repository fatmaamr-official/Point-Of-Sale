import { useState } from 'react';
import { useOrders, useOrderMutations, useProducts } from '@/hooks/use-supabase-data';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationStore } from '@/lib/store';
import { Search, Plus, Minus, X, Trash2, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { openReceiptWindow } from '@/lib/receipt';

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export default function Orders() {
  const { t } = useTranslation();
  const { data: orders = [], isLoading, error } = useOrders();
  const { data: products = [] } = useProducts();
  const { addOrder, updateOrder, deleteOrder, getNextOrderNumber } = useOrderMutations();
  const { role } = useAuth();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const canEdit = role === 'admin' || role === 'manager';
  const canDelete = role === 'admin';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editCustomer, setEditCustomer] = useState('');
  const [editPayment, setEditPayment] = useState<'cash' | 'card' | 'split'>('cash');

  const filtered = orders.filter((o) => {
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) || (o.customerName || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || o.paymentMethod === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const openCreate = () => {
    setEditingOrder(null);
    setEditItems([]);
    setEditCustomer('');
    setEditPayment('cash');
    setEditDialogOpen(true);
  };

  const openEdit = (order: any) => {
    setEditingOrder(order);
    setEditItems([...order.items]);
    setEditCustomer(order.customerName || '');
    setEditPayment(order.paymentMethod);
    setEditDialogOpen(true);
  };

  const addItemToEdit = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const existing = editItems.find((i) => i.productId === productId);
    if (existing) {
      setEditItems(editItems.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setEditItems([...editItems, { productId: product.id, name: product.name, quantity: 1, price: product.price }]);
    }
  };

  const updateEditItemQty = (productId: string, qty: number) => {
    if (qty <= 0) setEditItems(editItems.filter((i) => i.productId !== productId));
    else setEditItems(editItems.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const calcSubtotal = () => editItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const calcTax = () => calcSubtotal() * 0.09;
  const calcTotal = () => calcSubtotal() + calcTax();

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) return (error as any).message;
    return 'Something went wrong';
  };

  const handleSaveOrder = async () => {
    if (editItems.length === 0) return toast.error(t('addAtLeastOneItem'));

    if (editingOrder) {
      updateOrder.mutate({ dbId: editingOrder.dbId, paymentMethod: editPayment, customerName: editCustomer || undefined }, {
        onSuccess: () => toast.success(t('orderUpdated')),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    } else {
      try {
        const orderNumber = await getNextOrderNumber();
        addOrder.mutate({
          orderNumber,
          items: editItems,
          subtotal: calcSubtotal(),
          tax: calcTax(),
          discount: 0,
          total: calcTotal(),
          paymentMethod: editPayment,
          customerName: editCustomer || undefined,
        }, {
          onSuccess: () => {
            addNotification({ message: t('newOrderNotif', { id: orderNumber, total: calcTotal().toFixed(2) }), type: 'order' });
            toast.success(t('orderCreated'));
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        });
      } catch (e: any) {
        toast.error(getErrorMessage(e));
      }
    }
    setEditDialogOpen(false);
  };

  const handleRefund = (order: any) => {
    updateOrder.mutate({ dbId: order.dbId, status: 'refunded' }, {
      onSuccess: () => toast.success(t('refundProcessed', { id: order.id })),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const handleDelete = (order: any) => {
    deleteOrder.mutate(order.dbId, {
      onSuccess: () => toast.success(t('orderDeleted')),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  if (error) {
    return <div className="p-10 text-center text-red-500">{error instanceof Error ? error.message : 'Something went wrong'}</div>;
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('orders')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('totalOrders', { count: orders.length })}</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />{t('newOrder')}</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('searchOrders')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatus')}</SelectItem>
            <SelectItem value="completed">{t('completed')}</SelectItem>
            <SelectItem value="refunded">{t('refunded')}</SelectItem>
            <SelectItem value="partial-refund">{t('partialRefund')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allPayment')}</SelectItem>
            <SelectItem value="cash">{t('cash')}</SelectItem>
            <SelectItem value="card">{t('card')}</SelectItem>
            <SelectItem value="split">{t('splitPayment')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('order')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('date')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('customer')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('items')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('status')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('payment')}</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('total')}</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.dbId} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                  <td className="px-5 py-3 font-medium">{order.id}</td>
                  <td className="px-5 py-3 text-muted-foreground">{new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-3">{order.customerName || t('walkIn')}</td>
                  <td className="px-5 py-3 text-muted-foreground">{t('itemsCount', { count: order.items.length })}</td>
                  <td className="px-5 py-3">
                    <Badge variant={order.status === 'completed' ? 'default' : 'destructive'} className={order.status === 'completed' ? 'bg-success/10 text-success border-0' : ''}>
                      {t(order.status === 'partial-refund' ? 'partialRefund' : order.status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 capitalize text-muted-foreground">{t(order.paymentMethod === 'split' ? 'splitPayment' : order.paymentMethod)}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">${order.total.toFixed(2)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openReceiptWindow(order)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title={t('printReceipt')}><Printer className="h-4 w-4 text-muted-foreground" /></button>
                      {canEdit && <Button variant="ghost" size="sm" onClick={() => openEdit(order)} className="text-xs">{t('editOrder')}</Button>}
                      {order.status === 'completed' && canEdit && (
                        <Button variant="ghost" size="sm" onClick={() => handleRefund(order)} className="text-xs text-destructive">{t('refund')}</Button>
                      )}
                      {canDelete && <button onClick={() => handleDelete(order)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title={t('deleteOrder')}><Trash2 className="h-4 w-4 text-destructive" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Order Detail */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('order')} {selectedOrder?.id}</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 mt-2">
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('date')}</span><span>{new Date(selectedOrder.date).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('customer')}</span><span>{selectedOrder.customerName || t('walkIn')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('payment')}</span><span className="capitalize">{selectedOrder.paymentMethod}</span></div>
              </div>
              <div className="border-t border-border/50 pt-3 space-y-2">
                {selectedOrder.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="tabular-nums">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/50 pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('subtotal')}</span><span className="tabular-nums">${selectedOrder.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('tax')}</span><span className="tabular-nums">${selectedOrder.tax.toFixed(2)}</span></div>
                {selectedOrder.discount > 0 && <div className="flex justify-between text-success"><span>{t('discount')}</span><span className="tabular-nums">-${selectedOrder.discount.toFixed(2)}</span></div>}
                <div className="flex justify-between font-semibold pt-1 border-t border-border/50"><span>{t('total')}</span><span className="tabular-nums">${selectedOrder.total.toFixed(2)}</span></div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => openReceiptWindow(selectedOrder)}>
                <Printer className="h-4 w-4 mr-2" />{t('printReceipt')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Order Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingOrder ? t('editOrder') : t('newOrder')}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('customerName')}</Label>
                <Input value={editCustomer} onChange={(e) => setEditCustomer(e.target.value)} placeholder={t('walkIn')} />
              </div>
              <div>
                <Label>{t('paymentMethod')}</Label>
                <Select value={editPayment} onValueChange={(v) => setEditPayment(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t('cash')}</SelectItem>
                    <SelectItem value="card">{t('card')}</SelectItem>
                    <SelectItem value="split">{t('splitPayment')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t('addItem')}</Label>
              <Select onValueChange={addItemToEdit}>
                <SelectTrigger><SelectValue placeholder={t('selectProduct')} /></SelectTrigger>
                <SelectContent>
                  {products.filter((p) => p.stock > 0).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — ${p.price.toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editItems.length > 0 && (
              <div className="border border-border/50 rounded-lg divide-y divide-border/30">
                {editItems.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateEditItemQty(item.productId, item.quantity - 1)} className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted"><Minus className="h-3 w-3" /></button>
                      <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                      <button onClick={() => updateEditItemQty(item.productId, item.quantity + 1)} className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted"><Plus className="h-3 w-3" /></button>
                    </div>
                    <span className="text-sm tabular-nums w-16 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => updateEditItemQty(item.productId, 0)} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}

            {editItems.length > 0 && (
              <div className="text-sm space-y-1 pt-2 border-t border-border/50">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('subtotal')}</span><span>${calcSubtotal().toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('tax')} (9%)</span><span>${calcTax().toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold"><span>{t('total')}</span><span>${calcTotal().toFixed(2)}</span></div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t('cancel')}</Button>
              <Button onClick={handleSaveOrder}>{editingOrder ? t('updateOrder') : t('saveOrder')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
