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


export interface RestaurantSettings {
  id: number;
  restaurant_name: string;
  address?: string | null;
  phone?: string | null;
  gstin?: string | null;
  gst_percentage: number;
  currency: string;
  printer_name?: string | null;
  print_kot_automatically: boolean;
  enable_token_number: boolean;
  printer_ip?: string | null;
  printer_port: number;
  bill_printer_ip?: string | null;
  bill_printer_port: number;
  kot_printer_ip?: string | null;
  kot_printer_port: number;
  enable_gst: boolean;
  logo_url?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  kot_copies: number;
  paper_width: string;
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
