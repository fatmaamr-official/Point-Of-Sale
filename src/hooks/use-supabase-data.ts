import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type AppRole = Database['public']['Enums']['app_role'];
type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderUpdate = Database['public']['Tables']['orders']['Update'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
type EmployeeRow = Database['public']['Tables']['employees']['Row'];
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];
type EmployeePublicRow = Database['public']['Views']['employees_public']['Row'];

const db = supabase as any;

export interface CategoryListItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  barcode: string | null;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  categoryId: string | null;
  categoryName: string;
  image?: string | null;
  lowStockThreshold: number;
}

export interface EmployeeListItem {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  createdAt: string;
  position: string;
  phone: string | null;
  salary: number;
  deductions: number;
  workingDays: number;
  attendance: number;
  absences: number;
  status: string;
}

export interface CreateEmployeePayload {
  email: string;
  name: string;
  password: string;
  role: AppRole;
  position: string;
  salary: number;
  phone?: string | null;
  deductions?: number;
  workingDays?: number;
  attendance?: number;
  absences?: number;
  status?: string;
}

export interface CreateEmployeeResponse {
  success: boolean;
  employee: EmployeeRow;
  error?: string;
}

// ─── Products ───
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async ({ signal }) => {
      const { data, error } = await db
        .from('categories')
        .select('id, name, created_at')
        .order('name')
        .abortSignal(signal);
      if (error) throw error;

      return (data ?? []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        createdAt: cat.created_at,
      })) as CategoryListItem[];
    },
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async ({ signal }) => {
      const { data, error } = await db
        .from('products')
        .select('*, categories(name)')
        .order('name')
        .abortSignal(signal);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode ?? null,
        sku: p.sku,
        price: Number(p.price),
        cost: Number(p.cost),
        stock: Number(p.stock),
        categoryId: p.category_id ?? null,
        categoryName: p.categories?.name ?? p.categories?.[0]?.name ?? 'Uncategorized',
        image: p.image,
        lowStockThreshold: p.low_stock_threshold,
      })) as ProductListItem[];
    },
  });
}

export function useProductMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['products'] });

  const addProduct = useMutation({
    mutationFn: async (p: { name: string; sku: string; barcode?: string | null; price: number; cost: number; stock: number; categoryId: string | null; lowStockThreshold: number }) => {
      const { error } = await db.from('products').insert({
        name: p.name,
        barcode: p.barcode ?? null,
        sku: p.sku,
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        category_id: p.categoryId,
        low_stock_threshold: p.lowStockThreshold,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; sku?: string; barcode?: string | null; price?: number; cost?: number; stock?: number; categoryId?: string | null; lowStockThreshold?: number }) => {
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.sku !== undefined) updatePayload.sku = data.sku;
      if (data.barcode !== undefined) updatePayload.barcode = data.barcode;
      if (data.price !== undefined) updatePayload.price = data.price;
      if (data.cost !== undefined) updatePayload.cost = data.cost;
      if (data.stock !== undefined) updatePayload.stock = data.stock;
      if (data.categoryId !== undefined) updatePayload.category_id = data.categoryId;
      if (data.lowStockThreshold !== undefined) updatePayload.low_stock_threshold = data.lowStockThreshold;
      const { error } = await db.from('products').update(updatePayload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { addProduct, updateProduct, deleteProduct };
}
// ─── Orders ───
export function useOrders() {
  type OrderWithItems = OrderRow & {
    order_items: OrderItemRow[] | null;
  };

  return useQuery({
    queryKey: ['orders'],
    queryFn: async ({ signal }) => {
      const response = await supabase
        .from('orders')
        .select('*, order_items!order_items_order_id_fkey(*)')
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (response.error) throw response.error;

      const data = (response.data ?? []) as OrderWithItems[];

      console.log('RAW SUPABASE ORDERS RESPONSE:', data);

      return data.map((o) => ({
        id: o.order_number,
        dbId: o.id,
        items: (o.order_items ?? []).map((item) => ({
          productId: item.product_id,
          name: item.product_name,
          quantity: item.quantity,
          price: Number(item.price),
        })),
        subtotal: Number(o.subtotal),
        tax: Number(o.tax),
        discount: Number(o.discount),
        total: Number(o.total),
        paymentMethod: o.payment_method as 'cash' | 'card' | 'split',
        status: o.status as 'completed' | 'refunded' | 'partial-refund',
        date: o.created_at,
        customerName: o.customer_name ?? undefined,
        cashierId: o.cashier_id ?? undefined,
      }));
    },
  });
}
export function useOrderMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['orders'] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };

  const addOrder = useMutation({
    mutationFn: async (order: {
      orderNumber: string;
      items: { productId: string; name: string; quantity: number; price: number }[];
      subtotal: number; tax: number; discount: number; total: number;
      paymentMethod: string; customerName?: string;
    }) => {
      const { data, error } = await supabase.from('orders').insert({
        cashier_id: user?.id,
        order_number: order.orderNumber,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
        payment_method: order.paymentMethod,
        customer_name: order.customerName ?? null,
        status: 'completed',
      }).select().single();
      if (error) throw error;

      const items = order.items.map((i) => ({
        order_id: data.id,
        product_id: i.productId,
        product_name: i.name,
        quantity: i.quantity,
        price: i.price,
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(items);
      if (itemsError) throw itemsError;

      // Decrease stock
      for (const item of order.items) {
        const { error: rpcError } = await supabase.rpc('decrease_product_stock', {
          p_product_id: item.productId,
          p_quantity: item.quantity,
        });
        if (rpcError) throw rpcError;
      }
      return data;
    },
    onSuccess: invalidate,
  });

  const updateOrder = useMutation({
    mutationFn: async ({ dbId, ...data }: {
      dbId: string;
      status?: string;
      paymentMethod?: string;
      customerName?: string;
      items?: { productId: string; name: string; quantity: number; price: number }[];
      subtotal?: number;
      tax?: number;
      discount?: number;
      total?: number;
    }) => {
      const updatePayload: OrderUpdate = {};
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.paymentMethod !== undefined) updatePayload.payment_method = data.paymentMethod;
      if (data.customerName !== undefined) updatePayload.customer_name = data.customerName;

      if (data.items !== undefined) {
        const subtotal = data.subtotal ?? data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tax = data.tax ?? subtotal * 0.09;
        const total = data.total ?? subtotal + tax;

        updatePayload.subtotal = subtotal;
        updatePayload.tax = tax;
        updatePayload.discount = data.discount ?? 0;
        updatePayload.total = total;
      }

      console.log('Updating order:', dbId, updatePayload);
      const { data: updatedOrder, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', dbId)
        .select('id')
        .single();
      console.log('Update result:', { data: updatedOrder, error });

      if (error) {
        toast.error(error.message);
        throw error;
      }

      if (data.items !== undefined) {
        const { error: deleteItemsError } = await supabase.from('order_items').delete().eq('order_id', dbId);
        if (deleteItemsError) {
          toast.error(deleteItemsError.message);
          throw deleteItemsError;
        }

        const itemsToInsert = data.items.map((item) => ({
          order_id: dbId,
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price,
        }));

        const { data: insertedItems, error: insertItemsError } = await supabase.from('order_items').insert(itemsToInsert).select();
        console.log('Inserted order items:', { data: insertedItems, error: insertItemsError });
        if (insertItemsError) {
          toast.error(insertItemsError.message);
          throw insertItemsError;
        }
      }
    },
    onSuccess: invalidate,
  });

  const deleteOrder = useMutation({
    mutationFn: async (dbId: string) => {
      console.log('Deleting order:', dbId);
      const { data, error } = await supabase.from('orders').delete().eq('id', dbId).select('id').single();
      console.log('Delete result:', { data, error });
      if (error) {
        toast.error(error.message);
        throw error;
      }
    },
    onSuccess: invalidate,
  });

  const getNextOrderNumber = async () => {
    const { data, error } = await supabase.rpc('next_order_number');
    if (error) {
      const missingRpc = error.code === '42883' || error.code === 'PGRST202' || error.message.includes('next_order_number');
      if (missingRpc) return '1';
      throw error;
    }
    return (data ?? '1') as string;
  };

  return { addOrder, updateOrder, deleteOrder, getNextOrderNumber };
}

// ─── Employees ───
export function useEmployees(canViewSensitive: boolean = true) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel('employees-list');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
    });
    void channel.subscribe();
    return () => {
      void channel.unsubscribe();
    };
  }, [qc]);

  return useQuery({
    queryKey: ['employees', canViewSensitive ? 'full' : 'public'],
    queryFn: async ({ signal }) => {
      if (canViewSensitive) {
        const { data, error } = await supabase.from('employees').select('*').order('name').abortSignal(signal);
        if (error) throw error;
        return (data ?? []).map((e) => ({
          id: e.id,
          name: e.name,
          email: e.email,
          phone: e.phone,
          role: e.role,
          position: e.position,
          salary: Number(e.salary),
          deductions: Number(e.deductions),
          workingDays: Number(e.working_days),
          attendance: Number(e.attendance),
          absences: Number(e.absences),
          status: e.status,
          createdAt: e.created_at,
          restricted: false,
        })) as EmployeeListItem[];
      }

      const { data, error } = await supabase.from('employees_public').select('*').order('name').abortSignal(signal);
      if (error) throw error;
      return ((data ?? []) as EmployeePublicRow[]).map((e) => ({
        id: e.id ?? '',
        name: e.name ?? '',
        email: '',
        phone: null,
        role: (e.role ?? 'cashier') as AppRole,
        position: e.position ?? '',
        salary: 0,
        deductions: 0,
        workingDays: 0,
        attendance: 0,
        absences: 0,
        status: e.status ?? 'active',
        createdAt: e.created_at ?? '',
        restricted: true,
      })) as EmployeeListItem[];
    },
  });
}

export function useEmployeeMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['employees'] });

  const createEmployee = useMutation({
    mutationFn: async (payload: CreateEmployeePayload) => {
      const { data, error } = await supabase.functions.invoke<CreateEmployeeResponse>('create-employee', {
        body: payload,
      });
      if (error) throw error;
      if (!data?.success || !data.employee) {
        throw new Error(data?.error ?? 'Failed to create employee');
      }
      return data.employee;
    },
    onSuccess: invalidate,
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; email?: string; phone?: string | null; role?: AppRole; position?: string; salary?: number; deductions?: number; workingDays?: number; attendance?: number; absences?: number; status?: string }) => {
      const updatePayload: EmployeeUpdate = {};
      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.email !== undefined) updatePayload.email = data.email;
      if (data.phone !== undefined) updatePayload.phone = data.phone;
      if (data.role !== undefined) updatePayload.role = data.role;
      if (data.position !== undefined) updatePayload.position = data.position;
      if (data.salary !== undefined) updatePayload.salary = data.salary;
      if (data.deductions !== undefined) updatePayload.deductions = data.deductions;
      if (data.workingDays !== undefined) updatePayload.working_days = data.workingDays;
      if (data.attendance !== undefined) updatePayload.attendance = data.attendance;
      if (data.absences !== undefined) updatePayload.absences = data.absences;
      if (data.status !== undefined) updatePayload.status = data.status;
      const { error } = await supabase.from('employees').update(updatePayload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { createEmployee, updateEmployee, deleteEmployee };
}
