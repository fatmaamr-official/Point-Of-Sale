import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Edit2, Trash2, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface SupplierRow {
  id: string;
  supplier_name: string;
  phone: string;
  email: string | null;
  contact_person: string | null;
  address: string | null;
  notes: string | null;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
}

interface SupplierFormValues {
  supplierName: string;
  phone: string;
  email: string;
  contactPerson: string;
  address: string;
  notes: string;
  openingBalance: string;
  isActive: boolean;
}

const emptyFormValues: SupplierFormValues = {
  supplierName: '',
  phone: '',
  email: '',
  contactPerson: '',
  address: '',
  notes: '',
  openingBalance: '',
  isActive: true,
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return (error as { message?: string }).message ?? 'Something went wrong';
  return 'Something went wrong';
};

export default function Suppliers() {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const canEdit = role === 'admin' || role === 'manager';
  const canDelete = role === 'admin';

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<SupplierRow | null>(null);
  const [formValues, setFormValues] = useState<SupplierFormValues>(emptyFormValues);

  const { data: suppliers = [], isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('supplier_name');
      if (error) throw error;
      return (data ?? []) as SupplierRow[];
    },
  });

  const invalidateSuppliers = () => queryClient.invalidateQueries({ queryKey: ['suppliers'] });

  const openNewDialog = () => {
    setEditSupplier(null);
    setFormValues(emptyFormValues);
    setDialogOpen(true);
  };

  const openEditDialog = (supplier: SupplierRow) => {
    setEditSupplier(supplier);
    setFormValues({
      supplierName: supplier.supplier_name,
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      contactPerson: supplier.contact_person ?? '',
      address: supplier.address ?? '',
      notes: supplier.notes ?? '',
      openingBalance: supplier.opening_balance.toString(),
      isActive: supplier.is_active,
    });
    setDialogOpen(true);
  };

  const createSupplier = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      try {
        console.log('Supplier create payload', payload);
        const { error } = await supabase.from('suppliers').insert(payload);
        console.log('Supplier create response', { error });
        if (error) throw error;
      } catch (error) {
        console.error('Supplier create failed', error);
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSuppliers();
      toast.success('Supplier created');
      setDialogOpen(false);
      setEditSupplier(null);
      setFormValues(emptyFormValues);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: string }) => {
      try {
        console.log('Supplier update payload', { id, payload });
        const { error } = await supabase.from('suppliers').update(payload).eq('id', id);
        console.log('Supplier update response', { error });
        if (error) throw error;
      } catch (error) {
        console.error('Supplier update failed', error);
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSuppliers();
      toast.success('Supplier updated');
      setDialogOpen(false);
      setEditSupplier(null);
      setFormValues(emptyFormValues);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      try {
        console.log('Supplier delete id', id);
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        console.log('Supplier delete response', { error });
        if (error) throw error;
      } catch (error) {
        console.error('Supplier delete failed', error);
        throw error;
      }
    },
    onSuccess: () => {
      invalidateSuppliers();
      toast.success('Supplier deleted');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return suppliers;

    return suppliers.filter((supplier) => {
      const supplierName = supplier.supplier_name.toLowerCase();
      const phone = supplier.phone.toLowerCase();
      return supplierName.includes(normalizedSearch) || phone.includes(normalizedSearch);
    });
  }, [search, suppliers]);

  const handleSave = () => {
    if (!canEdit) {
      toast.error('Access denied');
      return;
    }

    const supplierName = formValues.supplierName.trim();
    const phone = formValues.phone.trim();
    const email = formValues.email.trim();
    const contactPerson = formValues.contactPerson.trim() || null;
    const address = formValues.address.trim() || null;
    const notes = formValues.notes.trim() || null;
    const openingBalanceInput = formValues.openingBalance.trim();
    const openingBalance = openingBalanceInput === '' ? 0 : Number(openingBalanceInput);

    if (!supplierName) {
      console.error('Supplier form validation failed: supplierName is required', { supplierName, openingBalanceInput });
      toast.error('Supplier name is required');
      return;
    }

    if (openingBalanceInput !== '' && !Number.isFinite(openingBalance)) {
      console.error('Supplier form validation failed: openingBalance must be numeric', { openingBalanceInput, openingBalance });
      toast.error('Opening balance must be numeric');
      return;
    }

    if (editSupplier) {
      const updatePayload = {
        supplier_name: supplierName,
        phone,
        email: email || null,
        contact_person: contactPerson,
        address,
        notes,
        opening_balance: openingBalance,
        current_balance: openingBalance,
        is_active: formValues.isActive,
      };

      updateSupplier.mutate({ id: editSupplier.id, ...updatePayload });
      return;
    }

    const createPayload = {
      supplier_name: supplierName,
      phone,
      email: email || null,
      contact_person: contactPerson,
      address,
      notes,
      opening_balance: openingBalance,
      current_balance: openingBalance,
      is_active: formValues.isActive,
    };

    createSupplier.mutate(createPayload);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('Submitting supplier form', formValues);
    handleSave();
  };

  const handleDelete = (supplier: SupplierRow) => {
    if (!canDelete) {
      toast.error('Access denied');
      return;
    }

    if (!window.confirm(`Delete ${supplier.supplier_name}?`)) return;

    deleteSupplier.mutate(supplier.id);
  };

  if (isLoading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-500">{getErrorMessage(error)}</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-1">{suppliers.length} suppliers</p>
        </div>
        <Button onClick={openNewDialog} disabled={!canEdit}>
          <Plus className="h-4 w-4 mr-2" /> Add Supplier
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by supplier or phone..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <Truck className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h2 className="text-sm font-medium">{search ? 'No suppliers found' : 'No suppliers yet'}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? 'Try a different search term.' : 'Create your first supplier to manage balances and contacts.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Supplier</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Balance</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium">{supplier.supplier_name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{supplier.phone}</td>
                    <td className="px-5 py-3 text-muted-foreground">{supplier.contact_person || '-'}</td>
                    <td className="px-5 py-3 text-muted-foreground">${supplier.current_balance.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <Badge className={supplier.is_active ? 'bg-green-600/10 text-green-700 border-0' : 'bg-gray-500/10 text-gray-700 border-0'}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {canEdit && (
                          <button onClick={() => openEditDialog(supplier)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(supplier)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
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

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditSupplier(null); setFormValues(emptyFormValues); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editSupplier ? 'Edit Supplier' : 'New Supplier'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Basic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="supplierName">Supplier Name *</Label>
                  <Input
                    id="supplierName"
                    value={formValues.supplierName}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, supplierName: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={formValues.phone} onChange={(event) => setFormValues((prev) => ({ ...prev, phone: event.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formValues.email} onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input id="contactPerson" value={formValues.contactPerson} onChange={(event) => setFormValues((prev) => ({ ...prev, contactPerson: event.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={formValues.address} onChange={(event) => setFormValues((prev) => ({ ...prev, address: event.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={formValues.notes}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, notes: event.target.value }))}
                    className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border/50 p-4">
              <h3 className="text-sm font-semibold">Financial</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="openingBalance">Opening Balance</Label>
                  <Input id="openingBalance" type="number" step="0.01" value={formValues.openingBalance} onChange={(event) => setFormValues((prev) => ({ ...prev, openingBalance: event.target.value }))} />
                </div>
                <div>
                  <Label>Current Balance</Label>
                  <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    {`$${(Number(formValues.openingBalance.trim() === '' ? 0 : Number(formValues.openingBalance))).toLocaleString()}`}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
              <div>
                <p className="font-medium">Status</p>
                <p className="text-sm text-muted-foreground">Choose whether this supplier is active.</p>
              </div>
              <Switch checked={formValues.isActive} onCheckedChange={(checked) => setFormValues((prev) => ({ ...prev, isActive: checked }))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending}>{editSupplier ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
