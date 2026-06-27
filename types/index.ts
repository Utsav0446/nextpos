export interface User {
  id: number;
  email: string;
  created_at: Date;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface MenuItem {
  id: number;
  category_id: number;
  category_name?: string; // Hydrated field
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_veg: boolean;
  preparation_time?: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  name: string;
  quantity: number;
  price: number; // Price at purchase time
  total_price: number;
}

export type OrderType = 'Dine-In' | 'Takeaway' | 'Delivery';
export type OrderStatus = 'Pending' | 'Preparing' | 'Completed' | 'Cancelled';
export type PaymentType = 'Cash' | 'UPI' | 'Card';

export interface Order {
  id: number;
  customer_name?: string | null;
  table_number?: string | null;
  order_type: OrderType;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  tax: number; // GST
  grand_total: number;
  paid_amount: number;
  remaining_amount: number;
  payment_type?: PaymentType | null;
  notes?: string | null;
  created_at: Date;
  completed_at?: Date | null;
  updated_at: Date;
  items?: OrderItem[]; // Hydrated in server actions/queries
}

export interface Expense {
  id: number;
  category: string; // 'Salary', 'Vegetables', 'Milk', 'Gas', 'Rent', 'Electricity', 'Internet', 'Misc'
  amount: number;
  reason: string;
  notes?: string | null;
  expense_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Supplier {
  id: number;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryItem {
  id: number;
  name: string;
  stock_quantity: number;
  unit: string; // 'kg', 'ltr', 'pcs', 'packet'
  low_stock_threshold: number;
  supplier_id?: number | null;
  supplier_name?: string | null; // Hydrated field
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseRecord {
  id: number;
  inventory_id: number;
  inventory_name?: string; // Hydrated field
  supplier_id?: number | null;
  supplier_name?: string | null; // Hydrated field
  quantity: number;
  unit_price: number;
  total_cost: number;
  purchase_date: Date;
  created_at: Date;
}

export interface RestaurantSettings {
  id: number;
  restaurant_name: string;
  address?: string | null;
  phone?: string | null;
  gstin?: string | null;
  gst_percentage: number;
  currency: string;
  printer_name?: string | null;
  updated_at: Date;
}

export interface AuditLog {
  id: number;
  action: string;
  details?: string | null;
  created_at: Date;
}

export interface DashboardStats {
  todaySales: number;
  yesterdaySales: number;
  last7DaysSales: number;
  last30DaysSales: number;
  todayOrdersCount: number;
  pendingOrdersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  averageOrderValue: number;
  topSellingItems: { name: string; quantity: number; revenue: number }[];
  bestCategory: string;
  salesGraphData: { date: string; sales: number }[];
}

export interface DailyReportRow {
  date: string;
  orders: number;
  revenue: number;
  expenses: number;
  profit: number;
  average_order_val: number;
  cancelled_orders: number;
  top_item: string;
}
