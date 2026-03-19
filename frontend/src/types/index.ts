// Dashboard types - field names match backend DashboardSummary schema
export interface DashboardSummary {
  today_sales: number;
  today_sales_change_pct: number;
  items_sold_today: number;
  items_sold_orders: number;
  low_stock_count: number;
  purchase_orders_total: number; // total purchase amount (float)
  purchase_orders_pending: number;
}

// RecentSale - field names match backend RecentSaleOut schema
export interface RecentSale {
  id: number;
  invoice_no: string;
  patient_name: string;
  items_count: number;
  payment_mode: string;
  total_amount: number;
  date: string;
  status: string;
}

export interface SaleMedicineItem {
  medicine_id: number;
  medicine_name: string;
  generic_name: string;
  batch_no: string;
  expiry_date: string;
  quantity: number;
  mrp: number;
  supplier: string;
  status: string;
}

export interface SaleCartItem {
  medicine_id: number;
  medicine_name: string;
  generic_name: string;
  quantity: number;
  mrp: number;
  batch_no: string;
  expiry_date: string;
  supplier: string;
  status: string;
}

// Inventory types
export type MedicineStatus = 'Active' | 'Low Stock' | 'Expired' | 'Out of Stock';

export interface Medicine {
  id: number;
  name: string;
  generic_name: string;
  category: string;
  batch_no: string;
  expiry_date: string;
  quantity: number;
  cost_price: number;
  mrp: number;
  supplier: string;
  status: MedicineStatus;
  created_at?: string;
  updated_at?: string;
}

export interface MedicineFormData {
  name: string;
  generic_name: string;
  category: string;
  batch_no: string;
  expiry_date: string;
  quantity: number;
  cost_price: number;
  mrp: number;
  supplier: string;
}

export interface InventoryOverview {
  total_items: number;
  active_stock: number;
  low_stock: number;
  total_value: number;
}

export interface InventoryResponse {
  items: Medicine[];
  total: number;
  page: number;
  page_size: number;
}

// Purchase types
export interface PurchaseCartItem {
  medicine_id: number;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  batch_no: string;
}

// Direct purchase row (no medicine_id lookup needed)
export interface PurchaseDirectRow {
  id: string; // client-side unique key
  medicine_name: string;
  generic_name: string;
  category: string;
  batch_no: string;
  expiry_date: string;
  quantity: number;
  unit_price: number;
  mrp: number;
  supplier: string;
}

export interface RecentPurchase {
  id: number;
  order_no: string;
  supplier: string;
  items_count: number;
  payment_mode: string;
  total_amount: number;
  date: string;
  status: string;
}

export interface PurchaseDraft {
  id: number;
  order_no: string;
  supplier: string;
  total_amount: number;
  payment_mode: string;
  status: string;
  created_at: string;
  draft_items: PurchaseDirectRow[];
}

// API error type
export interface ApiError {
  message: string;
  detail?: string;
}
