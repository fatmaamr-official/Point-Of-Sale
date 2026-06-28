import { useState } from 'react';
import { useEmployees, useEmployeeMutations, type EmployeeListItem } from '@/hooks/use-supabase-data';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

type AppRole = 'admin' | 'manager' | 'cashier';

export default function Employees() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const canEdit = role === 'admin';
  const canDelete = role === 'admin';
  const canViewSensitive = role === 'admin' || role === 'manager';
  const { data: employees = [], isLoading, error } = useEmployees(canViewSensitive);
  const { createEmployee, updateEmployee, deleteEmployee } = useEmployeeMutations();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeListItem | null>(null);

  const filtered = employees.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || e.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSave = async (formData: FormData) => {
    const name = formData.get('name')?.toString().trim() ?? '';
    const email = formData.get('email')?.toString().trim() ?? '';
    const phone = formData.get('phone')?.toString().trim() || null;
    const position = formData.get('position')?.toString().trim() ?? '';
    const roleValueCandidate = formData.get('role')?.toString();
    const validRoles: AppRole[] = ['cashier', 'manager', 'admin'];
    const roleValue = validRoles.includes(roleValueCandidate as AppRole) ? (roleValueCandidate as AppRole) : 'cashier';
    const salary = Number(formData.get('salary')) || 0;
    const deductions = Number(formData.get('deductions')) || 0;
    const workingDays = Number(formData.get('workingDays')) || 26;
    const attendance = Number(formData.get('attendance')) || 0;
    const absences = Number(formData.get('absences')) || 0;
    const status = (formData.get('status')?.toString() || 'active').trim();

    if (!name || !email || !position) {
      toast.error(t('fillRequiredFields'));
      return;
    }

    if (editing) {
      updateEmployee.mutate(
        {
          id: editing.id,
          name,
          email,
          phone,
          role: roleValue,
          position,
          salary,
          deductions,
          workingDays,
          attendance,
          absences,
          status,
        },
        {
          onSuccess: () => {
            toast.success(t('employeeUpdated'));
            setDialogOpen(false);
            setEditing(null);
          },
          onError: (error) => toast.error(error.message),
        }
      );
      return;
    }

    const password = formData.get('password')?.toString();
    if (!password) {
      toast.error('Password is required');
      return;
    }

    createEmployee.mutate(
      {
        email,
        password,
        name,
        role: roleValue,
        position,
        salary,
        phone,
        deductions,
        workingDays,
        attendance,
        absences,
        status,
      },
      {
        onSuccess: () => {
          toast.success(t('employeeCreated'));
          setDialogOpen(false);
          setEditing(null);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteEmployee.mutate(id, {
      onSuccess: () => toast.success(t('employeeDeleted')),
      onError: (error) => toast.error(error.message),
    });
  };

  const roleBadgeClass = (r: AppRole) => {
    switch (r) {
      case 'admin': return 'bg-primary/10 text-primary border-0';
      case 'manager': return 'bg-warning/10 text-warning border-0';
      default: return 'bg-muted text-muted-foreground border-0';
    }
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
          <h1 className="text-2xl font-semibold tracking-tight">{t('employees')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('totalEmployees', { count: employees.length })}</p>
        </div>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />{t('addEmployee')}
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('searchEmployees')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allRoles')}</SelectItem>
            <SelectItem value="admin">{t('admin')}</SelectItem>
            <SelectItem value="manager">{t('manager')}</SelectItem>
            <SelectItem value="cashier">{t('cashier')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('employeeName')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('role')}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('position')}</th>
                {canViewSensitive && <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('salary')}</th>}
                {canViewSensitive && <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('attendanceLabel')}</th>}
                {canViewSensitive && <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('absencesLabel')}</th>}
                {canViewSensitive && <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('netSalary')}</th>}
                {!canViewSensitive && <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('status')}</th>}
                {canEdit && <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <div>
                      <p className="font-medium">{emp.name}</p>
                      {canViewSensitive && <p className="text-xs text-muted-foreground">{emp.email}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-3"><Badge className={roleBadgeClass(emp.role)}>{t(emp.role)}</Badge></td>
                  <td className="px-5 py-3 text-muted-foreground">{emp.position}</td>
                  {canViewSensitive && <td className="px-5 py-3 text-right tabular-nums">${emp.salary.toLocaleString()}</td>}
                  {canViewSensitive && <td className="px-5 py-3 text-right tabular-nums">{emp.attendance}/{emp.workingDays}</td>}
                  {canViewSensitive && <td className="px-5 py-3 text-right tabular-nums">
                    <span className={emp.absences > 3 ? 'text-destructive font-medium' : ''}>{emp.absences}</span>
                  </td>}
                  {canViewSensitive && <td className="px-5 py-3 text-right tabular-nums font-medium">${(emp.salary - emp.deductions).toLocaleString()}</td>}
                  {!canViewSensitive && <td className="px-5 py-3 text-right">
                    <Badge variant="outline" className="capitalize">{emp.status}</Badge>
                  </td>}
                  {canEdit && (
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditing(emp); setDialogOpen(true); }} className="p-1.5 rounded-md hover:bg-muted transition-colors"><Edit2 className="h-4 w-4 text-muted-foreground" /></button>
                        {canDelete && <button onClick={() => handleDelete(emp.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"><Trash2 className="h-4 w-4 text-destructive" /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? t('editEmployee') : t('addEmployee')}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>{t('name')}</Label><Input name="name" defaultValue={editing?.name} required /></div>
              <div><Label>{t('email')}</Label><Input name="email" type="email" defaultValue={editing?.email} required /></div>
              <div><Label>{t('phone')}</Label><Input name="phone" defaultValue={editing?.phone} /></div>
              {!editing && (
                <div>
                  <Label>{t('password')}</Label>
                  <Input name="password" type="password" required />
                </div>
              )}
              <div>
                <Label>{t('role')}</Label>
                <Select name="role" defaultValue={editing?.role ?? 'cashier'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">{t('cashier')}</SelectItem>
                    <SelectItem value="manager">{t('manager')}</SelectItem>
                    <SelectItem value="admin">{t('admin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t('position')}</Label><Input name="position" defaultValue={editing?.position} required /></div>
              <div><Label>{t('salary')}</Label><Input name="salary" type="number" defaultValue={editing?.salary} required /></div>
              <div><Label>{t('deductions')}</Label><Input name="deductions" type="number" defaultValue={editing?.deductions || 0} /></div>
              <div><Label>{t('workingDaysLabel')}</Label><Input name="workingDays" type="number" defaultValue={editing?.workingDays || 26} /></div>
              <div><Label>{t('attendanceLabel')}</Label><Input name="attendance" type="number" defaultValue={editing?.attendance || 0} /></div>
              <div><Label>{t('absencesLabel')}</Label><Input name="absences" type="number" defaultValue={editing?.absences || 0} /></div>
              <div>
                <Label>{t('status')}</Label>
                <Select name="status" defaultValue={editing?.status || 'active'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('active')}</SelectItem>
                    <SelectItem value="inactive">{t('inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
              <Button type="submit">{editing ? t('update') : t('create')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
