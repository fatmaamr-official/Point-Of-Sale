export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  image?: string;
  variants?: { label: string; value: string }[];
  lowStockThreshold: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'split';
  status: 'completed' | 'refunded' | 'partial-refund';
  date: string;
  customerName?: string;
}

export const categories = ['Beverages', 'Snacks', 'Dairy', 'Bakery', 'Household', 'Personal Care'];

export const products: Product[] = [
  { id: '1', name: 'Espresso Blend Coffee', sku: 'BEV-001', price: 12.99, cost: 6.50, stock: 45, category: 'Beverages', lowStockThreshold: 10 },
  { id: '2', name: 'Organic Green Tea', sku: 'BEV-002', price: 8.49, cost: 3.20, stock: 62, category: 'Beverages', lowStockThreshold: 15 },
  { id: '3', name: 'Fresh Orange Juice 1L', sku: 'BEV-003', price: 5.99, cost: 2.80, stock: 8, category: 'Beverages', lowStockThreshold: 10 },
  { id: '4', name: 'Sea Salt Chips 200g', sku: 'SNK-001', price: 3.49, cost: 1.50, stock: 120, category: 'Snacks', lowStockThreshold: 20 },
  { id: '5', name: 'Dark Chocolate Bar 85%', sku: 'SNK-002', price: 4.99, cost: 2.10, stock: 78, category: 'Snacks', lowStockThreshold: 15 },
  { id: '6', name: 'Mixed Nuts 300g', sku: 'SNK-003', price: 7.99, cost: 4.00, stock: 3, category: 'Snacks', lowStockThreshold: 10 },
  { id: '7', name: 'Greek Yogurt 500g', sku: 'DRY-001', price: 4.29, cost: 2.00, stock: 34, category: 'Dairy', lowStockThreshold: 10 },
  { id: '8', name: 'Cheddar Cheese Block', sku: 'DRY-002', price: 6.99, cost: 3.50, stock: 22, category: 'Dairy', lowStockThreshold: 8 },
  { id: '9', name: 'Sourdough Bread Loaf', sku: 'BKR-001', price: 5.49, cost: 2.20, stock: 18, category: 'Bakery', lowStockThreshold: 5 },
  { id: '10', name: 'Croissant Pack (4)', sku: 'BKR-002', price: 6.99, cost: 3.00, stock: 25, category: 'Bakery', lowStockThreshold: 8 },
  { id: '11', name: 'Eco Dish Soap 500ml', sku: 'HSH-001', price: 3.99, cost: 1.80, stock: 56, category: 'Household', lowStockThreshold: 12 },
  { id: '12', name: 'Bamboo Toothbrush', sku: 'PRC-001', price: 2.99, cost: 0.90, stock: 92, category: 'Personal Care', lowStockThreshold: 20 },
];

export const recentOrders: Order[] = [
  { id: 'ORD-1847', items: [{ productId: '1', name: 'Espresso Blend Coffee', quantity: 2, price: 12.99 }, { productId: '5', name: 'Dark Chocolate Bar 85%', quantity: 1, price: 4.99 }], subtotal: 30.97, tax: 2.79, discount: 0, total: 33.76, paymentMethod: 'card', status: 'completed', date: '2026-03-21T14:32:00', customerName: 'Sarah Mitchell' },
  { id: 'ORD-1846', items: [{ productId: '9', name: 'Sourdough Bread Loaf', quantity: 1, price: 5.49 }, { productId: '7', name: 'Greek Yogurt 500g', quantity: 3, price: 4.29 }], subtotal: 18.36, tax: 1.65, discount: 2.00, total: 18.01, paymentMethod: 'cash', status: 'completed', date: '2026-03-21T13:15:00' },
  { id: 'ORD-1845', items: [{ productId: '4', name: 'Sea Salt Chips 200g', quantity: 4, price: 3.49 }], subtotal: 13.96, tax: 1.26, discount: 0, total: 15.22, paymentMethod: 'card', status: 'refunded', date: '2026-03-21T11:45:00', customerName: 'Tom Brennan' },
  { id: 'ORD-1844', items: [{ productId: '11', name: 'Eco Dish Soap 500ml', quantity: 2, price: 3.99 }, { productId: '12', name: 'Bamboo Toothbrush', quantity: 3, price: 2.99 }], subtotal: 16.95, tax: 1.53, discount: 1.50, total: 16.98, paymentMethod: 'split', status: 'completed', date: '2026-03-21T10:20:00' },
  { id: 'ORD-1843', items: [{ productId: '2', name: 'Organic Green Tea', quantity: 1, price: 8.49 }, { productId: '10', name: 'Croissant Pack (4)', quantity: 2, price: 6.99 }], subtotal: 22.47, tax: 2.02, discount: 0, total: 24.49, paymentMethod: 'card', status: 'completed', date: '2026-03-20T16:50:00', customerName: 'Lucy Fernandez' },
  { id: 'ORD-1842', items: [{ productId: '8', name: 'Cheddar Cheese Block', quantity: 1, price: 6.99 }], subtotal: 6.99, tax: 0.63, discount: 0, total: 7.62, paymentMethod: 'cash', status: 'completed', date: '2026-03-20T15:10:00' },
  { id: 'ORD-1841', items: [{ productId: '3', name: 'Fresh Orange Juice 1L', quantity: 2, price: 5.99 }, { productId: '6', name: 'Mixed Nuts 300g', quantity: 1, price: 7.99 }], subtotal: 19.97, tax: 1.80, discount: 3.00, total: 18.77, paymentMethod: 'card', status: 'partial-refund', date: '2026-03-20T12:30:00', customerName: 'James Okoro' },
];

export const dailyRevenue = [
  { day: 'Mon', revenue: 1247, orders: 34 },
  { day: 'Tue', revenue: 1583, orders: 41 },
  { day: 'Wed', revenue: 1102, orders: 28 },
  { day: 'Thu', revenue: 1891, orders: 47 },
  { day: 'Fri', revenue: 2234, orders: 58 },
  { day: 'Sat', revenue: 2687, orders: 72 },
  { day: 'Sun', revenue: 1934, orders: 51 },
];

export const topProducts = [
  { name: 'Espresso Blend Coffee', sold: 142, revenue: 1844.58 },
  { name: 'Sea Salt Chips 200g', sold: 98, revenue: 342.02 },
  { name: 'Sourdough Bread Loaf', sold: 87, revenue: 477.63 },
  { name: 'Greek Yogurt 500g', sold: 76, revenue: 326.04 },
  { name: 'Dark Chocolate Bar 85%', sold: 63, revenue: 314.37 },
];
