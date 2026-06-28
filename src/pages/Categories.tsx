import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from '@/hooks/use-supabase-data';
import { Search, Plus, Edit2, Trash2, Tags } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  created_at: string;
}

const db = supabase as any;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return (error as any).message;
  return 'Something went wrong';
};

export default function Categories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  const {
    data: categoryItems = [],
    isLoading,
    error,
  } = useCategories();

  const categories = useMemo(() => categoryItems.map((category) => ({
    id: category.id,
    name: category.name,
    created_at: category.createdAt,
  })) as Category[], [categoryItems]);

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const { error: mutationError } = await db.from('categories').insert({ name });
      if (mutationError) throw mutationError;
    },
    onSuccess: invalidateCategories,
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error: mutationError } = await db.from('categories').update({ name }).eq('id', id);
      if (mutationError) throw mutationError;
    },
    onSuccess: invalidateCategories,
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error: mutationError } = await db.from('categories').delete().eq('id', id);
      if (mutationError) throw mutationError;
    },
    onSuccess: invalidateCategories,
  });

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return categories.filter((category) => category.name.toLowerCase().includes(normalizedSearch));
  }, [categories, search]);

  const handleSave = (formData: FormData) => {
    const name = String(formData.get('name') ?? '').trim();

    if (!name) {
      toast.error('Category name is required');
      return;
    }

    if (editCategory) {
      updateCategory.mutate(
        { id: editCategory.id, name },
        {
          onSuccess: () => toast.success('Category updated'),
          onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
        },
      );
    } else {
      createCategory.mutate(name, {
        onSuccess: () => toast.success('Category created'),
        onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
      });
    }

    setDialogOpen(false);
    setEditCategory(null);
  };

  const handleDelete = (category: Category) => {
    if (!window.confirm(`Delete ${category.name}?`)) return;

    deleteCategory.mutate(category.id, {
      onSuccess: () => toast.success('Category deleted'),
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
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">{categories.length} categories</p>
        </div>
        <Button onClick={() => { setEditCategory(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search categories..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <Tags className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h2 className="text-sm font-medium">{search ? 'No categories found' : 'No categories yet'}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? 'Try a different search term.' : 'Create your first category to organize products.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((category) => (
                  <tr key={category.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{category.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(category.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditCategory(category); setDialogOpen(true); }} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDelete(category)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditCategory(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCategory ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
          <form onSubmit={(event) => { event.preventDefault(); handleSave(new FormData(event.currentTarget)); }} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={editCategory?.name} required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>{editCategory ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
