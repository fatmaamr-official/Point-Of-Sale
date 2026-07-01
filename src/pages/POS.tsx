import { useState, useEffect, useCallback, useRef } from 'react';
import { useCategories, useProducts, useOrderMutations, useCustomers } from '@/hooks/use-supabase-data';
import { useCartStore, useNotificationStore } from '@/lib/store';
import { Search, X, Minus, Plus, CreditCard, Banknote, Split, ScanBarcode, User, Calculator, Users as UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { openReceiptWindow } from '@/lib/receipt';

export default function POS() {
  const { t } = useTranslation();
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: customers = [] } = useCustomers();
  const { addOrder, getNextOrderNumber } = useOrderMutations();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'card' | 'split' | null>(null);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const cart = useCartStore();
  const addNotification = useNotificationStore((s) => s.addNotification);

  // Compute display name based on selected customer
  const displayName = selectedCustomerId 
    ? customers.find(c => c.id === selectedCustomerId)?.fullName || ''
    : customerName || t('walkIn') || 'Walk-in Customer';

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleBarcodeSubmit = useCallback((barcode: string) => {
    const product = products.find((p) => p.sku.toLowerCase() === barcode.toLowerCase());
    if (product) {
      if (product.stock <= 0) {
        toast.error(t('outOfStock'));
      } else {
        cart.addItem(product);
        toast.success(t('itemScanned', { name: product.name }));
      }
    } else {
      toast.error(t('productNotFound'));
    }
  }, [products, cart, t]);

  const handlePay = useCallback(async (method: 'cash' | 'card' | 'split') => {
    try {
      const orderNumber = await getNextOrderNumber();
      const totalAmount = cart.total();

      addOrder.mutate({
        orderNumber,
        items: cart.items.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity, price: i.price })),
        subtotal: cart.subtotal(),
        tax: cart.taxAmount(),
        discount: cart.discountAmount(),
        total: totalAmount,
        paymentMethod: method,
        customerId: selectedCustomerId || undefined,
        customerName: selectedCustomerId ? undefined : (customerName || undefined),
      }, {
        onSuccess: () => {
          // Check low stock after order
          cart.items.forEach((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (product && (product.stock - item.quantity) <= product.lowStockThreshold) {
              addNotification({ message: t('lowStockNotif', { name: product.name, stock: product.stock - item.quantity }), type: 'stock' });
            }
          });

          addNotification({ message: t('newOrderNotif', { id: orderNumber, total: totalAmount.toFixed(2) }), type: 'order' });
          toast.success(t('paymentReceived', { amount: `$${totalAmount.toFixed(2)}`, method }));

          openReceiptWindow({
            id: orderNumber,
            items: cart.items.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity, price: i.price })),
            subtotal: cart.subtotal(),
            tax: cart.taxAmount(),
            discount: cart.discountAmount(),
            total: totalAmount,
            paymentMethod: method,
            status: 'completed',
            date: new Date().toISOString(),
            customerName: displayName,
          });

          cart.clearCart();
          setPaymentOpen(false);
          setSelectedCustomerId(null);
          setCustomerName('');
          setCashTendered('');
          setSelectedMethod(null);
        },
        onError: (e) => toast.error(e.message),
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [cart, addOrder, getNextOrderNumber, addNotification, t, selectedCustomerId, customerName, displayName, products]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2' && cart.items.length > 0) { e.preventDefault(); setPaymentOpen(true); }
      if (e.key === 'Escape') { cart.clearCart(); }
      if (e.key === 'F4') { e.preventDefault(); setBarcodeMode((v) => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart]);

  useEffect(() => {
    if (barcodeMode && barcodeInputRef.current) barcodeInputRef.current.focus();
  }, [barcodeMode]);

  const changeAmount = selectedMethod === 'cash' && cashTendered
    ? parseFloat(cashTendered) - cart.total()
    : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5.5rem)]">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('searchProducts')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" autoFocus={!barcodeMode} />
          </div>
          <Button variant={barcodeMode ? 'default' : 'outline'} size="icon" onClick={() => setBarcodeMode((v) => !v)} title={t('barcodeScanner')} className="shrink-0">
            <ScanBarcode className="h-4 w-4" />
          </Button>
        </div>

        {barcodeMode && (
          <div className="mb-4 p-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <ScanBarcode className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">{t('barcodeScannerActive')}</span>
              <span className="text-xs text-muted-foreground ml-auto">(F4)</span>
            </div>
            <Input ref={barcodeInputRef} placeholder={t('scanOrTypeBarcode')} onKeyDown={(e) => { if (e.key === 'Enter') { const val = (e.target as HTMLInputElement).value.trim(); if (val) { handleBarcodeSubmit(val); (e.target as HTMLInputElement).value = ''; } } }} className="font-mono text-sm" autoFocus={barcodeMode} />
          </div>
        )}

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button onClick={() => setSelectedCategory(null)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${!selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
            {t('all')}
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${selectedCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto flex-1">
          {filtered.map((product) => (
            <button key={product.id} onClick={() => { if (product.stock <= 0) return toast.error(t('outOfStock')); cart.addItem(product); }} disabled={product.stock <= 0}
              className="flex flex-col items-start p-4 rounded-xl border border-border/50 bg-card hover:shadow-md hover:border-primary/30 transition-all duration-150 active:scale-[0.97] text-left disabled:opacity-50 disabled:cursor-not-allowed group">
              <span className="text-sm font-medium leading-tight line-clamp-2">{product.name}</span>
              <span className="text-xs text-muted-foreground mt-1 font-mono">{product.sku}</span>
              <div className="flex items-center justify-between w-full mt-auto pt-3">
                <span className="text-base font-semibold">${product.price.toFixed(2)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${product.stock <= product.lowStockThreshold ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                  {product.stock} {t('left')}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-full lg:w-96 flex flex-col bg-card border border-border/50 rounded-xl shadow-sm">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('currentSale')}</h2>
          <div className="flex items-center gap-2">
            {cart.items.length > 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{cart.items.reduce((s, i) => s + i.quantity, 0)} {t('items').toLowerCase()}</span>}
            {cart.items.length > 0 && <button onClick={() => cart.clearCart()} className="text-xs text-muted-foreground hover:text-destructive transition-colors">{t('clear')}</button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ScanBarcode className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">{t('noItemsYet')}</p>
              <p className="text-xs mt-1">{t('clickOrScan')}</p>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} {t('each')}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)} className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors active:scale-95"><Minus className="h-3 w-3" /></button>
                  <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                  <button onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)} className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors active:scale-95"><Plus className="h-3 w-3" /></button>
                </div>
                <span className="text-sm font-medium tabular-nums w-16 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                <button onClick={() => cart.removeItem(item.productId)} className="text-muted-foreground hover:text-destructive transition-colors"><X className="h-4 w-4" /></button>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="border-t border-border/50 p-4 space-y-3">
            <div className="relative">
              <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              {customers.length > 0 ? (
                <Select value={selectedCustomerId || 'walk-in'} onValueChange={(v) => {
                  if (v === 'walk-in') {
                    setSelectedCustomerId(null);
                    setCustomerName('');
                  } else {
                    setSelectedCustomerId(v);
                  }
                }}>
                  <SelectTrigger className="pl-9 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">{t('walkIn') || 'Walk-in Customer'}</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.fullName} ({c.phone})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder={t('customerNameOptional')} value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="pl-9 h-9 text-sm" />
              )}
            </div>
            {!selectedCustomerId && customers.length > 0 && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder={t('customerNameOptional')} value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
            )}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('subtotal')}</span><span className="tabular-nums">${cart.subtotal().toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('tax')} (9%)</span><span className="tabular-nums">${cart.taxAmount().toFixed(2)}</span></div>
              {cart.discountAmount() > 0 && <div className="flex justify-between text-success"><span>{t('discount')}</span><span className="tabular-nums">-${cart.discountAmount().toFixed(2)}</span></div>}
              <div className="flex justify-between text-base font-semibold pt-1.5 border-t border-border/50"><span>{t('total')}</span><span className="tabular-nums">${cart.total().toFixed(2)}</span></div>
            </div>
            <Button onClick={() => setPaymentOpen(true)} className="w-full" size="lg">
              {t('charge')} ${cart.total().toFixed(2)}
              <span className="ml-2 text-xs opacity-70">(F2)</span>
            </Button>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={(open) => { setPaymentOpen(open); if (!open) { setSelectedMethod(null); setCashTendered(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {t('completePayment')} — ${cart.total().toFixed(2)}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 mt-4">
            <Button variant={selectedMethod === 'cash' ? 'default' : 'outline'} size="lg" onClick={() => setSelectedMethod('cash')} className="justify-start gap-3 h-14">
              <Banknote className="h-5 w-5 text-success" />
              <div className="text-left"><p className="font-medium">{t('cash')}</p><p className="text-xs opacity-70">{t('physicalCurrency')}</p></div>
            </Button>
            <Button variant={selectedMethod === 'card' ? 'default' : 'outline'} size="lg" onClick={() => setSelectedMethod('card')} className="justify-start gap-3 h-14">
              <CreditCard className="h-5 w-5 text-info" />
              <div className="text-left"><p className="font-medium">{t('card')}</p><p className="text-xs opacity-70">{t('creditOrDebit')}</p></div>
            </Button>
            <Button variant={selectedMethod === 'split' ? 'default' : 'outline'} size="lg" onClick={() => setSelectedMethod('split')} className="justify-start gap-3 h-14">
              <Split className="h-5 w-5 text-warning" />
              <div className="text-left"><p className="font-medium">{t('splitPayment')}</p><p className="text-xs opacity-70">{t('multipleMethods')}</p></div>
            </Button>
          </div>

          {selectedMethod === 'cash' && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('cashTendered')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input type="number" step="0.01" min={cart.total()} placeholder={cart.total().toFixed(2)} value={cashTendered} onChange={(e) => setCashTendered(e.target.value)} className="pl-7 text-lg font-semibold tabular-nums" autoFocus />
                </div>
              </div>
              {cashTendered && changeAmount >= 0 && (
                <div className="flex justify-between items-center p-3 rounded-lg bg-success/10 border border-success/20">
                  <span className="text-sm font-medium text-success">{t('changeAmount')}</span>
                  <span className="text-lg font-bold text-success tabular-nums">${changeAmount.toFixed(2)}</span>
                </div>
              )}
              {cashTendered && changeAmount < 0 && (
                <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <span className="text-sm font-medium text-destructive">{t('insufficientAmount')}</span>
                  <span className="text-lg font-bold text-destructive tabular-nums">-${Math.abs(changeAmount).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {selectedMethod && (
            <Button onClick={() => handlePay(selectedMethod)} className="w-full mt-4" size="lg" disabled={selectedMethod === 'cash' && cashTendered !== '' && changeAmount < 0}>
              {t('confirmPayment')} — ${cart.total().toFixed(2)}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
