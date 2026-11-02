export interface User {
  id: number;
  email: string;
  created_at: Date;
}

export interface Category {
  id: number;
  name: string;
  name_gu?: string | null;
  name_hi?: string | null;
  description?: string;
  description_gu?: string | null;
  description_hi?: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface MenuItem {
  id: number;
  category_id: number;
  category_name?: string; // Hydrated field
  category_name_gu?: string | null;
  category_name_hi?: string | null;
  name: string;
  name_gu?: string;
  name_hi?: string;
  description?: string;
  description_gu?: string;
  description_hi?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_veg: boolean;
  preparation_time?: number;
  allow_spice?: boolean;
  allow_prep?: boolean;
  allow_notes?: boolean;
  allow_texture?: boolean;
  default_spice?: string;
  default_prep?: string;
  default_texture?: string;
  show_popup?: boolean;
  has_variants?: boolean;
  variants?: { name: string; price: number }[];
  custom_options?: { name: string; options: string[]; defaultOption?: string; variantPrices?: Record<string, number> }[];
  allow_sitting?: boolean;
  allow_parcel?: boolean;
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
  notes?: string | null;
}

export type OrderType = 'Dine-In' | 'Takeaway';
export type OrderStatus = 'Pending' | 'Preparing' | 'Completed' | 'Cancelled';
export type PaymentType = 'Cash' | 'UPI' | 'Card';

export interface Order {
  id: number;
  token_no?: number | null;
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
  unit: string;
  current_stock: number;
  reorder_level: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  supplier_id?: number | null;
  supplier_name?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface PurchaseRecord {
  id: number;
  inventory_item_id: number;
  supplier_id?: number | null;
  supplier_name?: string | null;
  inventory_name?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  total_cost?: number;
  purchase_date: Date;
  notes?: string | null;
  created_at?: Date;
}


export interface RestaurantSettings {
  id: number;
  restaurant_name: string;
  address?: string | null;
  phone?: string | null;
  gstin?: string | null;
  gst_percentage: number;
  currency: string;
  enable_token_number: boolean;
  enable_gst: boolean;
  logo_url?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;

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
  average_order_value: number;
  cancelled_orders: number;
  top_item: string;
}



