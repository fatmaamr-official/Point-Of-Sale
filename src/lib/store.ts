import { create } from 'zustand';
import { products as initialProducts, recentOrders as initialOrders, type Product, type Order, type OrderItem } from './mock-data';

// ─── Product Store ───
interface ProductStore {
  products: Product[];
  setProducts: (products: Product[]) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  addProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  decreaseStock: (productId: string, qty: number) => void;
}

export const useProductStore = create<ProductStore>((set) => ({
  products: initialProducts,
  setProducts: (products) => set({ products }),
  updateProduct: (id, data) =>
    set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...data } : p)) })),
  addProduct: (product) => set((s) => ({ products: [...s.products, product] })),
  deleteProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
  decreaseStock: (productId, qty) =>
    set((s) => ({
      products: s.products.map((p) =>
        p.id === productId ? { ...p, stock: Math.max(0, p.stock - qty) } : p
      ),
    })),
}));

// ─── Order Store ───
interface OrderStore {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrder: (id: string, data: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  nextOrderId: () => string;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: initialOrders,
  addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
  updateOrder: (id, data) =>
    set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...data } : o)) })),
  deleteOrder: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),
  nextOrderId: () => {
    const orders = get().orders;
    const maxNum = orders.reduce((max, o) => {
      const num = parseInt(o.id.replace('ORD-', ''));
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    return `ORD-${maxNum + 1}`;
  },
}));

// ─── Notification Store ───
export interface Notification {
  id: string;
  message: string;
  type: 'order' | 'stock' | 'update';
  read: boolean;
  createdAt: string;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  addNotification: (n) =>
    set((s) => ({
      notifications: [
        { ...n, id: Date.now().toString(), read: false, createdAt: new Date().toISOString() },
        ...s.notifications,
      ],
    })),
  markAsRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  markAllRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));

// ─── Cart Store ───
interface CartItem extends OrderItem {
  productId: string;
}

interface CartProduct {
  id: string;
  name: string;
  price: number;
}

interface CartStore {
  items: CartItem[];
  discount: number;
  discountType: 'fixed' | 'percentage';
  addItem: (product: CartProduct) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (amount: number, type: 'fixed' | 'percentage') => void;
  clearCart: () => void;
  subtotal: () => number;
  taxAmount: () => number;
  discountAmount: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  discount: 0,
  discountType: 'fixed',
  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return {
        items: [...state.items, { productId: product.id, name: product.name, quantity: 1, price: product.price }],
      };
    }),
  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: quantity <= 0
        ? state.items.filter((i) => i.productId !== productId)
        : state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    })),
  setDiscount: (amount, type) => set({ discount: amount, discountType: type }),
  clearCart: () => set({ items: [], discount: 0, discountType: 'fixed' }),
  subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  taxAmount: () => get().subtotal() * 0.09,
  discountAmount: () => {
    const { discount, discountType } = get();
    const sub = get().subtotal();
    return discountType === 'percentage' ? sub * (discount / 100) : discount;
  },
  total: () => get().subtotal() + get().taxAmount() - get().discountAmount(),
}));

// ─── Employee Store ───
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'cashier';
  position: string;
  salary: number;
  deductions: number;
  workingDays: number;
  attendance: number;
  absences: number;
  status: 'active' | 'inactive';
  joinDate: string;
}

interface EmployeeStore {
  employees: Employee[];
  addEmployee: (e: Employee) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
}

const initialEmployees: Employee[] = [
  { id: '1', name: 'Ahmed Hassan', email: 'ahmed@swiftpos.com', phone: '+1-555-0101', role: 'admin', position: 'Store Manager', salary: 5500, deductions: 200, workingDays: 26, attendance: 25, absences: 1, status: 'active', joinDate: '2024-01-15' },
  { id: '2', name: 'Sara Ali', email: 'sara@swiftpos.com', phone: '+1-555-0102', role: 'manager', position: 'Shift Supervisor', salary: 4200, deductions: 150, workingDays: 26, attendance: 24, absences: 2, status: 'active', joinDate: '2024-03-10' },
  { id: '3', name: 'Omar Khalil', email: 'omar@swiftpos.com', phone: '+1-555-0103', role: 'cashier', position: 'Senior Cashier', salary: 3200, deductions: 100, workingDays: 26, attendance: 26, absences: 0, status: 'active', joinDate: '2024-06-01' },
  { id: '4', name: 'Layla Ibrahim', email: 'layla@swiftpos.com', phone: '+1-555-0104', role: 'cashier', position: 'Cashier', salary: 2800, deductions: 50, workingDays: 26, attendance: 22, absences: 4, status: 'active', joinDate: '2025-01-20' },
];

export const useEmployeeStore = create<EmployeeStore>((set) => ({
  employees: initialEmployees,
  addEmployee: (e) => set((s) => ({ employees: [...s.employees, e] })),
  updateEmployee: (id, data) =>
    set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, ...data } : e)) })),
  deleteEmployee: (id) => set((s) => ({ employees: s.employees.filter((e) => e.id !== id) })),
}));

// ─── Theme Store ───
interface ThemeStore {
  isDark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: false,
  toggle: () =>
    set((state) => {
      const next = !state.isDark;
      document.documentElement.classList.toggle('dark', next);
      return { isDark: next };
    }),
}));
