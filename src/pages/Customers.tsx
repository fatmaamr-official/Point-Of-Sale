import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomers, useCustomerMutations, type CustomerListItem } from '@/hooks/use-supabase-data';
import { Search, Plus, Edit2, Trash2, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return (error as any).message;
  return 'Something went wrong';
};

export default function Customers() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const canEdit = role === 'admin' || role === 'manager';
  const canDelete = role === 'admin';
  const [search, setSearch] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'phone'>('name');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerListItem | null>(null);

  const {
    data: customers = [],
    isLoading,
    error,
  } = useCustomers();

  const { createCustomer, updateCustomer, deleteCustomer } = useCustomerMutations();

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return customers.filter((customer) => {
      if (searchType === 'name') {
        return customer.fullName.toLowerCase().includes(normalizedSearch);
      } else {
        return customer.phone.toLowerCase().includes(normalizedSearch);
      }
    });
  }, [customers, search, searchType]);

  const handleSave = (formData: FormData) => {
    if (!canEdit) {
      toast.error(t('accessDenied') || 'Access denied');
      return;
    }

    const fullName = String(formData.get('fullName') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim() || null;
    const address = String(formData.get('address') ?? '').trim() || null;
    const notes = String(formData.get('notes') ?? '').trim() || null;

    if (!fullName || !phone) {
      toast.error('Full name and phone are required');
      return;
    }

    if (editCustomer) {
      updateCustomer.mutate(
        { id: editCustomer.id, fullName, phone, email, address, notes },
        {
          onSuccess: () => {
            toast.success('Customer updated');
            setDialogOpen(false);
            setEditCustomer(null);
          },
          onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
        },
      );
    } else {
      createCustomer.mutate(
        { fullName, phone, email, address, notes },
        {
          onSuccess: () => {
            toast.success('Customer created');
            setDialogOpen(false);
            setEditCustomer(null);
          },
          onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
        },
      );
    }
  };

  const handleDelete = (customer: CustomerListItem) => {
    if (!canDelete) {
      toast.error(t('accessDenied') || 'Access denied');
      return;
    }

    if (!window.confirm(`Delete ${customer.fullName}?`)) return;

    deleteCustomer.mutate(customer.id, {
      onSuccess: () => toast.success('Customer deleted'),
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
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">{customers.length} customers</p>
        </div>
        <Button onClick={() => { setEditCustomer(null); setDialogOpen(true); }} disabled={!canEdit}>
          <Plus className="h-4 w-4 mr-2" /> Add Customer
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchType === 'name' ? 'Search by name...' : 'Search by phone...'}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value as 'name' | 'phone')}
          className="px-3 py-2 border border-border/50 rounded-lg bg-background text-foreground text-sm"
        >
          <option value="name">By Name</option>
          <option value="phone">By Phone</option>
        </select>
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h2 className="text-sm font-medium">{search ? 'No customers found' : 'No customers yet'}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? 'Try a different search term.' : 'Create your first customer to manage their information.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{customer.fullName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{customer.phone}</td>
                    <td className="px-5 py-3 text-muted-foreground">{customer.email || '-'}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{customer.address || '-'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(customer.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {canEdit && (
                          <button onClick={() => { setEditCustomer(customer); setDialogOpen(true); }} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(customer)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditCustomer(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCustomer ? 'Edit Customer' : 'New Customer'}</DialogTitle></DialogHeader>
          <form onSubmit={(event) => { event.preventDefault(); handleSave(new FormData(event.currentTarget)); }} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" name="fullName" defaultValue={editCustomer?.fullName} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" name="phone" defaultValue={editCustomer?.phone} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={editCustomer?.email || ''} />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={editCustomer?.address || ''} />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" defaultValue={editCustomer?.notes || ''} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createCustomer.isPending || updateCustomer.isPending}>{editCustomer ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
