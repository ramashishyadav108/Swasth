import axios from 'axios';
import type {
  DashboardSummary,
  RecentSale,
  Medicine,
  MedicineFormData,
  InventoryOverview,
  InventoryResponse,
  MedicineStatus,
  RecentPurchase,
  PurchaseDirectRow,
  PurchaseDraft,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail;
    let message: string;
    if (Array.isArray(detail)) {
      // Pydantic validation errors: [{loc, msg, type}, ...]
      message = detail.map((e: { loc?: string[]; msg?: string }) =>
        e.loc ? `${e.loc.slice(1).join('.')}: ${e.msg}` : (e.msg ?? String(e))
      ).join('; ');
    } else {
      message = detail || error.response?.data?.message || error.message || 'An unexpected error occurred';
    }
    return Promise.reject(new Error(message));
  }
);

// Dashboard API
export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await api.get<DashboardSummary>('/api/dashboard/summary');
    return data;
  },

  getRecentSales: async (): Promise<RecentSale[]> => {
    const { data } = await api.get<RecentSale[]>('/api/dashboard/recent-sales');
    return data;
  },
};

// Inventory API
export const inventoryApi = {
  getOverview: async (): Promise<InventoryOverview> => {
    const { data } = await api.get<InventoryOverview>('/api/inventory/overview');
    return data;
  },

  getMedicines: async (params?: {
    search?: string;
    status?: string;
    category?: string;
    page?: number;
    page_size?: number;
  }): Promise<InventoryResponse> => {
    const { data } = await api.get<InventoryResponse>('/api/inventory/medicines', {
      params,
    });
    return data;
  },

  getMedicineById: async (id: number): Promise<Medicine> => {
    const { data } = await api.get<Medicine>(`/api/inventory/medicines/${id}`);
    return data;
  },

  createMedicine: async (medicine: MedicineFormData): Promise<Medicine> => {
    const { data } = await api.post<Medicine>('/api/inventory/medicines', medicine);
    return data;
  },

  updateMedicine: async (id: number, medicine: MedicineFormData): Promise<Medicine> => {
    const { data } = await api.put<Medicine>(`/api/inventory/medicines/${id}`, medicine);
    return data;
  },

  updateMedicineStatus: async (id: number, status: MedicineStatus): Promise<Medicine> => {
    const { data } = await api.patch<Medicine>(`/api/inventory/medicines/${id}/status`, {
      status,
    });
    return data;
  },

  deleteMedicine: async (id: number): Promise<void> => {
    await api.delete(`/api/inventory/medicines/${id}`);
  },
};

// Sales API
export const salesApi = {
  searchMedicines: async (query: string): Promise<Medicine[]> => {
    const { data } = await api.get<InventoryResponse>('/api/inventory/medicines', {
      params: { search: query, page_size: 100 },
    });
    return data.items || [];
  },

  createSale: async (saleData: {
    patient_name: string;
    payment_mode: string;
    items: Array<{ medicine_id: number; quantity: number; unit_price: number }>;
  }): Promise<RecentSale> => {
    const { data } = await api.post<RecentSale>('/api/sales', saleData);
    return data;
  },

  listSales: async (): Promise<RecentSale[]> => {
    const { data } = await api.get<RecentSale[]>('/api/sales');
    return data;
  },
};

// Purchases API
export const purchasesApi = {
  createPurchase: async (purchaseData: {
    payment_mode: string;
    items: PurchaseDirectRow[];
  }): Promise<RecentPurchase> => {
    const payload = {
      payment_mode: purchaseData.payment_mode,
      items: purchaseData.items.map(r => ({
        medicine_name: r.medicine_name,
        generic_name: r.generic_name,
        category: r.category,
        batch_no: r.batch_no,
        expiry_date: r.expiry_date,
        quantity: r.quantity,
        unit_price: r.unit_price,
        mrp: r.mrp,
        supplier: r.supplier,
      })),
    };
    const { data } = await api.post<RecentPurchase>('/api/purchases', payload);
    return data;
  },

  listPurchases: async (): Promise<RecentPurchase[]> => {
    const { data } = await api.get<RecentPurchase[]>('/api/purchases');
    return data;
  },

  saveDraft: async (purchaseData: {
    payment_mode: string;
    items: PurchaseDirectRow[];
  }): Promise<PurchaseDraft> => {
    const payload = {
      payment_mode: purchaseData.payment_mode,
      items: purchaseData.items.map(r => ({
        medicine_name: r.medicine_name,
        generic_name: r.generic_name,
        category: r.category,
        batch_no: r.batch_no,
        expiry_date: r.expiry_date,
        quantity: r.quantity,
        unit_price: r.unit_price,
        mrp: r.mrp,
        supplier: r.supplier,
      })),
    };
    const { data } = await api.post<PurchaseDraft>('/api/purchases/draft', payload);
    return data;
  },

  listPending: async (): Promise<PurchaseDraft[]> => {
    const { data } = await api.get<PurchaseDraft[]>('/api/purchases/pending');
    return data;
  },

  deleteDraft: async (id: number): Promise<void> => {
    await api.delete(`/api/purchases/${id}`);
  },

  completeDraft: async (id: number): Promise<RecentPurchase> => {
    const { data } = await api.post<RecentPurchase>(`/api/purchases/${id}/complete`);
    return data;
  },
};

export default api;
