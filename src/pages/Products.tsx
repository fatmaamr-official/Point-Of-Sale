import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories, useProducts } from '@/hooks/use-supabase-data';
import { Search, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Category {
  id: string;
  name: string;
  created_at: string;
}

interface ProductRow {
  id: string;
  name: string;
  barcode: string | null;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  category_id: string | null;
  created_at: string;
  low_stock_threshold: number;
  categories: Pick<Category, 'id' | 'name'> | null;
}

interface ProductPayload {
  name: string;
  barcode: string | null;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  category_id: string | null;
  low_stock_threshold: number;
}

const db = supabase as any;

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong');

export default function Products() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const canEdit = role === 'admin' || role === 'manager';
  const canDelete = role === 'admin';

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('none');

  const {
    data: categoryItems = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const {
    data: productItems = [],
    isLoading: productsLoading,
    error: productsError,
  } = useProducts();

  const categories = useMemo(() => categoryItems.map((category) => ({
    id: category.id,
    name: category.name,
    created_at: category.createdAt,
  })) as Category[], [categoryItems]);

  const products = useMemo(() => productItems.map((product) => ({
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    sku: product.sku,
    price: product.price,
    cost: product.cost,
    stock: product.stock,
    category_id: product.categoryId,
    created_at: '',
    low_stock_threshold: product.lowStockThreshold,
    categories: product.categoryId ? { id: product.categoryId, name: product.categoryName } : null,
  })) as ProductRow[], [productItems]);

  const invalidateProducts = () => queryClient.invalidateQueries({ queryKey: ['products'] });

  const addProduct = useMutation({
    mutationFn: async (payload: ProductPayload) => {
      const { data, error } = await db.from('products').insert(payload).select();
      console.log("INSERT DATA:", data);
      console.log("INSERT ERROR:", error);
      if (error) throw error;
    },
    onSuccess: invalidateProducts,
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...payload }: ProductPayload & { id: string }) => {
      const { error } = await db.from('products').update(payload).eq('id', id);
      console.log("UPDATE ERROR:", error);
      if (error) throw error;
    },
    onSuccess: invalidateProducts,
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('products').delete().eq('id', id);
      console.log("DELETE ERROR:", error);
      if (error) throw error;
    },
    onSuccess: invalidateProducts,
  });

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.sku.toLowerCase().includes(normalizedSearch) ||
        (product.barcode ?? '').toLowerCase().includes(normalizedSearch);
      const matchesCat = catFilter === 'all' || product.category_id === catFilter;
      return matchesSearch && matchesCat;
    });
  }, [catFilter, products, search]);

  const lowStockCount = products.filter((product) => product.stock <= product.low_stock_threshold).length;
  const isLoading = productsLoading && products.length === 0;
  const error = productsError || categoriesError;

  const handleSave = (formData: FormData) => {
    const payload: ProductPayload = {
      name: String(formData.get('name') ?? '').trim(),
      barcode: String(formData.get('barcode') ?? '').trim() || null,
      sku: String(formData.get('sku') ?? '').trim(),
      price: Number(formData.get('price') ?? 0),
      cost: Number(formData.get('cost') ?? 0),
      stock: Number(formData.get('stock') ?? 0),
      category_id: selectedCategory === 'none' ? null : selectedCategory,
      low_stock_threshold: Number(formData.get('threshold') ?? 10),
    };

    if (editProduct) {
      updateProduct.mutate(
        { id: editProduct.id, ...payload },
        {
          onSuccess: () => toast.success(t('productUpdated')),
          onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
        },
      );
    } else {
      addProduct.mutate(payload, {
        onSuccess: () => toast.success(t('productCreated')),
        onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
      });
    }

    setDialogOpen(false);
    setEditProduct(null);
  };

  const handleDelete = (id: string) => {
    deleteProduct.mutate(id, {
      onSuccess: () => toast.success(t('productDeleted')),
      onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
    });
  };

  if (isLoading) {
    return (
      <div className="p-10 text-center">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-500">
        {getErrorMessage(error)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('products')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {products.length} {t('products').toLowerCase()} · {lowStockCount} {t('lowStockItems').toLowerCase()}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditProduct(null); setSelectedCategory('none'); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> {t('addProduct')}
          </Button>
        )}
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-warning/30 bg-warning/5">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium">{t('lowStockWarning', { count: lowStockCount })}</p>
            <p className="text-xs text-muted-foreground">{t('reviewInventory')}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('searchProductsShort')} value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allCategories')}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('product')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('sku')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Barcode</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('category')}</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('price')}</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('cost')}</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('stock')}</th>
                {canEdit && <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="px-5 py-10 text-center text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{product.name}</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{product.sku}</td>
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{product.barcode ?? '-'}</td>
                    <td className="px-5 py-3">
                      <Badge variant="secondary" className="font-normal">{product.categories?.name ?? 'Uncategorized'}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">${product.price.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">${product.cost.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`tabular-nums font-medium ${product.stock <= product.low_stock_threshold ? 'text-destructive' : ''}`}>{product.stock}</span>
                    </td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { setEditProduct(product); setSelectedCategory(product.category_id ?? 'none'); setDialogOpen(true); }} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {canDelete && (
                            <button onClick={() => handleDelete(product.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditProduct(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editProduct ? t('editProduct') : t('newProduct')}</DialogTitle></DialogHeader>
          <form onSubmit={(event) => { event.preventDefault(); handleSave(new FormData(event.currentTarget)); }} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">{t('name')}</Label>
                <Input id="name" name="name" defaultValue={editProduct?.name} required />
              </div>
              <div>
                <Label htmlFor="sku">{t('sku')}</Label>
                <Input id="sku" name="sku" defaultValue={editProduct?.sku} required />
              </div>
              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input id="barcode" name="barcode" defaultValue={editProduct?.barcode ?? ''} />
              </div>
              <div>
                <Label>{t('category')}</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger><SelectValue placeholder={t('category')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="price">{t('price')}</Label>
                <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={editProduct?.price} required />
              </div>
              <div>
                <Label htmlFor="cost">{t('cost')}</Label>
                <Input id="cost" name="cost" type="number" min="0" step="0.01" defaultValue={editProduct?.cost} required />
              </div>
              <div>
                <Label htmlFor="stock">{t('stock')}</Label>
                <Input id="stock" name="stock" type="number" min="0" defaultValue={editProduct?.stock} required />
              </div>
              <div>
                <Label htmlFor="threshold">{t('lowStockAlert')}</Label>
                <Input id="threshold" name="threshold" type="number" min="0" defaultValue={editProduct?.low_stock_threshold ?? 10} required />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
              <Button type="submit" disabled={addProduct.isPending || updateProduct.isPending}>{editProduct ? t('update') : t('create')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
