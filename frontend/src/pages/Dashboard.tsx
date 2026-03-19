import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Package,
  TrendingUp,
  Search,
  Receipt,
  RefreshCw,
  ShoppingBag,
  CheckCircle2,
  Filter,
  Download,
  Truck,
  Plus,
  Trash2,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { dashboardApi, inventoryApi, salesApi, purchasesApi } from '../api/client';
import type {
  DashboardSummary,
  RecentSale,
  Medicine,
  SaleCartItem,
  InventoryOverview,
  PurchaseDirectRow,
  PurchaseDraft,
  RecentPurchase,
} from '../types';

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS_MAP: Record<string, string> = {
  active: 'Active', low_stock: 'Low Stock', expired: 'Expired', out_of_stock: 'Out of Stock',
  Active: 'Active', 'Low Stock': 'Low Stock', Expired: 'Expired', 'Out of Stock': 'Out of Stock',
};
const STATUS_BADGE: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  'Low Stock': 'bg-yellow-100 text-yellow-700',
  Expired: 'bg-red-100 text-red-700',
  'Out of Stock': 'bg-gray-100 text-gray-600',
};

const MedStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const label = STATUS_MAP[status] || status;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[label] || 'bg-gray-100 text-gray-600'}`}>{label}</span>;
};

const SaleBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    Completed: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || colors[label] || 'bg-gray-100 text-gray-600'}`}>{label}</span>;
};

type TabType = 'sales' | 'purchase' | 'inventory';

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Insurance'];

const emptyPurchaseRow = (): PurchaseDirectRow => ({
  id: Math.random().toString(36).slice(2),
  medicine_name: '',
  generic_name: '',
  category: 'General',
  batch_no: '',
  expiry_date: '',
  quantity: 1,
  unit_price: 0,
  mrp: 0,
  supplier: '',
});

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('sales');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // ── Sales tab ──
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [salePayment, setSalePayment] = useState('Cash');
  const [saleSearch, setSaleSearch] = useState('');
  const [saleResults, setSaleResults] = useState<Medicine[]>([]);
  const [saleSearching, setSaleSearching] = useState(false);
  const [showSaleResults, setShowSaleResults] = useState(false);
  const [saleCart, setSaleCart] = useState<SaleCartItem[]>([]);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingSuccess, setBillingSuccess] = useState<string | null>(null);
  const [billing, setBilling] = useState(false);

  // ── Purchase tab ──
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesLoaded, setPurchasesLoaded] = useState(false);
  const [purchasePayment, setPurchasePayment] = useState('Cash');
  const [purchaseRows, setPurchaseRows] = useState<PurchaseDirectRow[]>([emptyPurchaseRow()]);
  const [purchasingError, setPurchasingError] = useState<string | null>(null);
  const [purchasingSuccess, setPurchasingSuccess] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [pendingDrafts, setPendingDrafts] = useState<PurchaseDraft[]>([]);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Inventory tab ──
  const [invOverview, setInvOverview] = useState<InventoryOverview | null>(null);
  const [invMedicines, setInvMedicines] = useState<Medicine[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invLoaded, setInvLoaded] = useState(false);
  const [invStatusFilter, setInvStatusFilter] = useState('');
  const [showInvFilter, setShowInvFilter] = useState(false);

  // ── Fetchers ──
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true); setSummaryError(null);
    try { setSummary(await dashboardApi.getSummary()); }
    catch (e) { setSummaryError(e instanceof Error ? e.message : 'Failed'); }
    finally { setSummaryLoading(false); }
  }, []);

  const fetchRecentSales = useCallback(async () => {
    setSalesLoading(true); setSalesError(null);
    try { setRecentSales(await dashboardApi.getRecentSales()); }
    catch (e) { setSalesError(e instanceof Error ? e.message : 'Failed'); }
    finally { setSalesLoading(false); }
  }, []);

  const fetchRecentPurchases = useCallback(async () => {
    setPurchasesLoading(true);
    try {
      const [recent, pending] = await Promise.all([
        purchasesApi.listPurchases(),
        purchasesApi.listPending(),
      ]);
      setRecentPurchases(recent);
      setPendingDrafts(pending);
      setPurchasesLoaded(true);
    }
    catch { /* silent */ }
    finally { setPurchasesLoading(false); }
  }, []);

  const fetchInventory = useCallback(async () => {
    setInvLoading(true);
    try {
      const [ov, meds] = await Promise.all([inventoryApi.getOverview(), inventoryApi.getMedicines({ page_size: 100 })]);
      setInvOverview(ov); setInvMedicines(meds.items || []); setInvLoaded(true);
    } catch { /* silent */ }
    finally { setInvLoading(false); }
  }, []);

  useEffect(() => { fetchSummary(); fetchRecentSales(); }, [fetchSummary, fetchRecentSales]);
  useEffect(() => { if (activeTab === 'purchase' && !purchasesLoaded) fetchRecentPurchases(); }, [activeTab, purchasesLoaded, fetchRecentPurchases]);
  useEffect(() => { if (activeTab === 'inventory' && !invLoaded) fetchInventory(); }, [activeTab, invLoaded, fetchInventory]);

  // ── Sale handlers ──
  const handleSaleSearch = async () => {
    if (!saleSearch.trim()) return;
    setSaleSearching(true);
    try {
      const r = await salesApi.searchMedicines(saleSearch);
      setSaleResults(r); setShowSaleResults(true);
    } catch { setSaleResults([]); }
    finally { setSaleSearching(false); }
  };

  const addToSaleCart = (med: Medicine) => {
    setSaleCart(prev => {
      // Match by medicine_id AND batch_no so different batches are separate entries
      const ex = prev.find(i => i.medicine_id === med.id && i.batch_no === med.batch_no);
      if (ex) return prev.map(i => (i.medicine_id === med.id && i.batch_no === med.batch_no)
        ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, {
        medicine_id: med.id,
        medicine_name: med.name,
        generic_name: med.generic_name,
        quantity: 1,
        mrp: med.mrp,
        batch_no: med.batch_no,
        expiry_date: med.expiry_date,
        supplier: med.supplier,
        status: med.status,
      }];
    });
    setSaleSearch(''); setShowSaleResults(false);
  };

  const saleCartTotal = saleCart.reduce((s, i) => s + i.mrp * i.quantity, 0);

  const handleBill = async () => {
    if (saleCart.length === 0) return;
    setBillingError(null); setBilling(true);
    try {
      await salesApi.createSale({
        patient_name: patientName.trim() || 'Walk-in Customer',
        payment_mode: salePayment,
        items: saleCart.map(i => ({ medicine_id: i.medicine_id, quantity: i.quantity, unit_price: i.mrp })),
      });
      setBillingSuccess(`Sale of ${formatCurrency(saleCartTotal)} completed!`);
      setSaleCart([]); setPatientName(''); setSaleSearch('');
      fetchSummary(); fetchRecentSales();
      if (invLoaded) fetchInventory();
      setTimeout(() => setBillingSuccess(null), 4000);
    } catch (e) {
      setBillingError(e instanceof Error ? e.message : 'Sale failed');
    } finally { setBilling(false); }
  };

  // ── Purchase row handlers ──
  const updatePurchaseRow = (id: string, field: keyof PurchaseDirectRow, value: string | number) => {
    setPurchaseRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const purchaseRowsTotal = purchaseRows.reduce((s, r) => s + r.unit_price * r.quantity, 0);

  const validateRows = (): boolean => {
    for (const r of purchaseRows) {
      if (!r.medicine_name.trim()) { setPurchasingError('Medicine name is required for all rows'); return false; }
      if (!r.batch_no.trim()) { setPurchasingError('Batch No is required for all rows'); return false; }
      if (!r.expiry_date) { setPurchasingError('Expiry date is required for all rows'); return false; }
      if (!r.supplier.trim()) { setPurchasingError('Supplier is required for all rows'); return false; }
      if (r.quantity <= 0) { setPurchasingError('Quantity must be > 0 for all rows'); return false; }
      if (r.unit_price <= 0) { setPurchasingError('Unit price must be > 0 for all rows'); return false; }
      if (r.mrp <= 0) { setPurchasingError('MRP must be > 0 for all rows'); return false; }
    }
    return true;
  };

  const handlePurchase = async () => {
    if (!validateRows()) return;
    setPurchasingError(null); setPurchasing(true);
    try {
      await purchasesApi.createPurchase({ payment_mode: purchasePayment, items: purchaseRows });
      setPurchasingSuccess(`Purchase of ${formatCurrency(purchaseRowsTotal)} recorded!`);
      setPurchaseRows([emptyPurchaseRow()]);
      fetchSummary(); fetchRecentPurchases();
      if (invLoaded) { setInvLoaded(false); fetchInventory(); }
      setTimeout(() => setPurchasingSuccess(null), 4000);
    } catch (e) {
      setPurchasingError(e instanceof Error ? e.message : 'Purchase failed');
    } finally { setPurchasing(false); }
  };

  const handleSaveDraft = async () => {
    if (!validateRows()) return;
    setPurchasingError(null); setSavingDraft(true);
    try {
      await purchasesApi.saveDraft({ payment_mode: purchasePayment, items: purchaseRows });
      setPurchasingSuccess('Purchase saved as pending — complete it anytime.');
      setPurchaseRows([emptyPurchaseRow()]);
      fetchSummary(); fetchRecentPurchases();
      setTimeout(() => setPurchasingSuccess(null), 4000);
    } catch (e) {
      setPurchasingError(e instanceof Error ? e.message : 'Failed to save draft');
    } finally { setSavingDraft(false); }
  };

  const handleCompleteDraft = async (id: number) => {
    setCompletingId(id);
    try {
      await purchasesApi.completeDraft(id);
      setPurchasingSuccess('Purchase completed and stock updated!');
      fetchSummary(); fetchRecentPurchases();
      if (invLoaded) { setInvLoaded(false); fetchInventory(); }
      setTimeout(() => setPurchasingSuccess(null), 4000);
    } catch (e) {
      setPurchasingError(e instanceof Error ? e.message : 'Failed to complete purchase');
    } finally { setCompletingId(null); }
  };

  const handleDeleteDraft = async (id: number) => {
    setDeletingId(id);
    try {
      await purchasesApi.deleteDraft(id);
      setPurchasingSuccess('Pending purchase deleted successfully!');
      fetchSummary(); fetchRecentPurchases();
      setTimeout(() => setPurchasingSuccess(null), 4000);
    } catch (e) {
      setPurchasingError(e instanceof Error ? e.message : 'Failed to delete pending purchase');
    } finally { setDeletingId(null); }
  };

  const loadDraftIntoForm = (draft: PurchaseDraft) => {
    setPurchasePayment(draft.payment_mode);
    setPurchaseRows(draft.draft_items.length > 0 ? draft.draft_items.map(item => ({
      id: Math.random().toString(36).slice(2),
      medicine_name: item.medicine_name || '',
      generic_name: item.generic_name || '',
      category: item.category || 'General',
      batch_no: item.batch_no || '',
      expiry_date: typeof item.expiry_date === 'string' ? item.expiry_date : String(item.expiry_date || ''),
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      mrp: item.mrp || 0,
      supplier: item.supplier || '',
    })) : [
      {
        id: Math.random().toString(36).slice(2),
        medicine_name: '',
        generic_name: '',
        category: 'General',
        batch_no: '',
        expiry_date: new Date().toISOString().split('T')[0],
        quantity: 1,
        unit_price: 0,
        mrp: 0,
        supplier: draft.supplier || '',
      }
    ]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Inventory helpers ──
  const normalizeInvStatus = (s: string) => STATUS_MAP[s] || s;

  const handleInvExport = () => {
    const rows = invMedicines.map(m => [m.name, m.generic_name, m.category, m.batch_no, m.expiry_date, m.quantity, m.cost_price, m.mrp, m.supplier, m.status]);
    const csv = [['Name', 'Generic', 'Category', 'Batch', 'Expiry', 'Qty', 'Cost', 'MRP', 'Supplier', 'Status'], ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'inventory.csv'; a.click();
  };

  const filteredInv = invStatusFilter ? invMedicines.filter(m => m.status === invStatusFilter) : invMedicines;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'sales', label: 'Sales', icon: <DollarSign size={15} /> },
    { id: 'purchase', label: 'Purchase', icon: <ShoppingBag size={15} /> },
    { id: 'inventory', label: 'Inventory', icon: <Package size={15} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Today's Sales" value={summary ? formatCurrency(summary.today_sales) : '₹0'}
          badge={summary ? `+${summary.today_sales_change_pct}%` : '+0%'} badgeColor="green"
          iconBgColor="bg-green-500" loading={summaryLoading} icon={<DollarSign size={22} className="text-white" />} />
        <StatCard title="Items Sold Today" value={summary ? String(summary.items_sold_today) : '0'}
          badge={summary ? `${summary.items_sold_orders} Orders` : '0 Orders'} badgeColor="blue"
          iconBgColor="bg-teal-500" loading={summaryLoading} icon={<ShoppingCart size={22} className="text-white" />} />
        <StatCard title="Low Stock Items" value={summary ? String(summary.low_stock_count) : '0'}
          badge="Action Needed" badgeColor="orange"
          iconBgColor="bg-orange-500" loading={summaryLoading} icon={<AlertTriangle size={22} className="text-white" />} />
        <StatCard title="Purchase Orders" value={summary ? formatCurrency(summary.purchase_orders_total) : '₹0'}
          badge={summary ? `${summary.purchase_orders_pending} Pending` : '0 Pending'} badgeColor="purple"
          iconBgColor="bg-purple-500" loading={summaryLoading} icon={<Package size={22} className="text-white" />} />
      </div>

      {summaryError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{summaryError}</p>
          <button onClick={fetchSummary} className="ml-auto text-sm text-red-600 flex items-center gap-1"><RefreshCw size={14} /> Retry</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-0 border-b border-gray-200">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                  activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pb-2">
            <button onClick={() => setActiveTab('sales')}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              + New Sale
            </button>
            <button onClick={() => setActiveTab('purchase')}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              + New Purchase
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* ═══════════════ SALES TAB ═══════════════ */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              {billingSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 size={16} />{billingSuccess}
                </div>
              )}
              {billingError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle size={16} />{billingError}
                  <button onClick={() => setBillingError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
                </div>
              )}

              {/* Make a Sale */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <ShoppingCart size={16} /> Make a Sale
                </h3>

                <div className="flex flex-col sm:flex-row gap-3 mb-3">
                  <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)}
                    placeholder="Patient Id" className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <div className="flex flex-1 gap-2 relative">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={saleSearch} onChange={e => setSaleSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaleSearch()}
                        placeholder="Search medicines..." className="w-full pl-8 pr-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <button onClick={handleSaleSearch} disabled={saleSearching}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-70 flex items-center gap-1.5">
                      {saleSearching ? <RefreshCw size={14} className="animate-spin" /> : null} Enter
                    </button>
                  </div>
                  <select value={salePayment} onChange={e => setSalePayment(e.target.value)}
                    className="px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <button onClick={handleBill} disabled={billing || saleCart.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap">
                    {billing ? <RefreshCw size={14} className="animate-spin" /> : <Receipt size={14} />}
                    Bill {saleCart.length > 0 ? `(${formatCurrency(saleCartTotal)})` : ''}
                  </button>
                </div>

                {/* Search results */}
                {showSaleResults && saleResults.length > 0 && (
                  <div className="bg-white border border-blue-200 rounded-lg shadow-lg mb-3 max-h-48 overflow-y-auto">
                    {saleResults.map(med => (
                      <button key={`${med.id}-${med.batch_no}`} onClick={() => addToSaleCart(med)}
                        className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center justify-between text-sm border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{med.name}</span>
                          <span className="text-gray-400 text-xs">{med.generic_name}</span>
                          <span className="text-gray-400 text-xs font-mono">Batch: {med.batch_no}</span>
                          <span className="text-gray-400 text-xs">Exp: {med.expiry_date}</span>
                          <MedStatusBadge status={med.status} />
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-gray-500">Qty: {med.quantity}</span>
                          <span className="font-semibold text-blue-700">{formatCurrency(med.mrp)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showSaleResults && saleResults.length === 0 && !saleSearching && (
                  <p className="text-sm text-gray-500 mb-3 text-center py-2">No medicines found</p>
                )}

                {/* Cart table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-blue-200">
                        {['Medicine Name', 'Generic Name', 'Batch No', 'Expiry Date', 'Supplier', 'Quantity', 'MRP', 'Status', 'Actions'].map(col => (
                          <th key={col} className="text-left py-2 px-3 text-xs font-semibold text-blue-800 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {saleCart.length === 0 ? (
                        <tr><td colSpan={9} className="py-8 text-center text-sm text-gray-400">
                          <ShoppingCart size={24} className="mx-auto mb-2 opacity-30" />
                          Search and add medicines to create a sale
                        </td></tr>
                      ) : saleCart.map((item, idx) => (
                        <tr key={`${item.medicine_id}-${item.batch_no}-${idx}`} className="border-b border-blue-100 hover:bg-blue-50/50">
                          <td className="py-2 px-3 font-medium text-gray-900 whitespace-nowrap">{item.medicine_name}</td>
                          <td className="py-2 px-3 text-gray-500 text-xs">{item.generic_name}</td>
                          <td className="py-2 px-3 text-gray-600 font-mono text-xs">{item.batch_no}</td>
                          <td className="py-2 px-3 text-gray-600 text-xs whitespace-nowrap">{item.expiry_date}</td>
                          <td className="py-2 px-3 text-gray-600 text-xs whitespace-nowrap">{item.supplier}</td>
                          <td className="py-2 px-3">
                            <input type="number" value={item.quantity} min="1"
                              onChange={e => {
                                const q = parseInt(e.target.value) || 1;
                                setSaleCart(prev => q <= 0
                                  ? prev.filter((_i, i2) => i2 !== idx)
                                  : prev.map((_i, i2) => i2 === idx ? { ..._i, quantity: q } : _i));
                              }}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm" />
                          </td>
                          <td className="py-2 px-3 font-semibold text-gray-900">{formatCurrency(item.mrp)}</td>
                          <td className="py-2 px-3"><MedStatusBadge status={item.status} /></td>
                          <td className="py-2 px-3">
                            <button onClick={() => setSaleCart(prev => prev.filter((_, i2) => i2 !== idx))}
                              className="text-red-500 hover:text-red-700 text-xs font-medium">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Sales */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-gray-500" /> Recent Sales
                </h3>
                {salesLoading && (
                  <div className="space-y-3">{[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-3 py-3 border-b">
                      <div className="w-9 h-9 bg-gray-200 rounded-lg" />
                      <div className="flex-1 space-y-1.5"><div className="h-4 bg-gray-200 rounded w-1/3" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>
                      <div className="h-4 bg-gray-200 rounded w-20" />
                    </div>
                  ))}</div>
                )}
                {salesError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-500" />
                    <p className="text-sm text-red-700">{salesError}</p>
                    <button onClick={fetchRecentSales} className="ml-auto text-xs text-red-600 hover:underline">Retry</button>
                  </div>
                )}
                {!salesLoading && !salesError && recentSales.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <ShoppingCart size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No recent sales found</p>
                  </div>
                )}
                {!salesLoading && !salesError && recentSales.map(sale => (
                  <div key={sale.id} className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all">
                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                      <ShoppingCart size={16} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{sale.invoice_no}</p>
                      <p className="text-xs text-gray-500 truncate">{sale.patient_name} &bull; {sale.items_count} items &bull; {sale.payment_mode}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(sale.total_amount)}</p>
                      <p className="text-xs text-gray-400">{formatDate(sale.date)}</p>
                    </div>
                    <SaleBadge status={sale.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════ PURCHASE TAB ═══════════════ */}
          {activeTab === 'purchase' && (
            <div className="space-y-4">
              {purchasingSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 size={16} />{purchasingSuccess}
                </div>
              )}
              {purchasingError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle size={16} />{purchasingError}
                  <button onClick={() => setPurchasingError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
                </div>
              )}

              {/* Make a Purchase */}
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-teal-900 flex items-center gap-2">
                    <Truck size={16} /> Make a Purchase
                  </h3>
                  <div className="flex items-center gap-2">
                    <select value={purchasePayment} onChange={e => setPurchasePayment(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-teal-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                      {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                    </select>
                    <button onClick={handlePurchase} disabled={purchasing}
                      className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap">
                      {purchasing ? <RefreshCw size={14} className="animate-spin" /> : <Package size={14} />}
                      Receive {purchaseRowsTotal > 0 ? `(${formatCurrency(purchaseRowsTotal)})` : ''}
                    </button>
                  </div>
                </div>

                {/* Direct-input medicine rows */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-teal-200">
                        {['Medicine Name', 'Generic Name', 'Batch No', 'Expiry Date', 'Supplier', 'Category', 'Qty', 'Unit Price', 'MRP', 'Total', ''].map(col => (
                          <th key={col} className="text-left py-2 px-2 text-xs font-semibold text-teal-800 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseRows.map(row => (
                        <tr key={row.id} className="border-b border-teal-100">
                          <td className="py-1.5 px-2">
                            <input type="text" value={row.medicine_name}
                              onChange={e => updatePurchaseRow(row.id, 'medicine_name', e.target.value)}
                              placeholder="Medicine name *" className="w-36 px-2 py-1.5 text-xs border border-teal-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-400" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="text" value={row.generic_name}
                              onChange={e => updatePurchaseRow(row.id, 'generic_name', e.target.value)}
                              placeholder="Generic name" className="w-32 px-2 py-1.5 text-xs border border-teal-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-400" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="text" value={row.batch_no}
                              onChange={e => updatePurchaseRow(row.id, 'batch_no', e.target.value)}
                              placeholder="Batch No *" className="w-24 px-2 py-1.5 text-xs border border-teal-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-400 font-mono" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="date" value={row.expiry_date}
                              onChange={e => updatePurchaseRow(row.id, 'expiry_date', e.target.value)}
                              className="w-32 px-2 py-1.5 text-xs border border-teal-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-400" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="text" value={row.supplier}
                              onChange={e => updatePurchaseRow(row.id, 'supplier', e.target.value)}
                              placeholder="Supplier *" className="w-28 px-2 py-1.5 text-xs border border-teal-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-400" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="text" value={row.category}
                              onChange={e => updatePurchaseRow(row.id, 'category', e.target.value)}
                              placeholder="Category" className="w-24 px-2 py-1.5 text-xs border border-teal-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-400" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" value={row.quantity} min="1"
                              onChange={e => updatePurchaseRow(row.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1.5 text-xs border border-teal-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-400 text-center" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" value={row.unit_price} min="0" step="0.01"
                              onChange={e => updatePurchaseRow(row.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1.5 text-xs border border-teal-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-400 text-center" />
                          </td>
                          <td className="py-1.5 px-2">
                            <input type="number" value={row.mrp} min="0" step="0.01"
                              onChange={e => updatePurchaseRow(row.id, 'mrp', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1.5 text-xs border border-teal-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-400 text-center" />
                          </td>
                          <td className="py-1.5 px-2 font-semibold text-gray-800 text-xs whitespace-nowrap">
                            {formatCurrency(row.unit_price * row.quantity)}
                          </td>
                          {/* <td className="py-1.5 px-2">
                            <button onClick={() => removePurchaseRow(row.id)}
                              className="text-red-400 hover:text-red-600 p-1">
                              <Trash2 size={14} />
                            </button>
                          </td> */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => setPurchaseRows(prev => [...prev, emptyPurchaseRow()])}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-100 transition-colors">
                    <Plus size={13} /> Add Row
                  </button>
                  <button onClick={handleSaveDraft} disabled={savingDraft}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-700 border border-yellow-300 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-50">
                    {savingDraft ? <RefreshCw size={13} className="animate-spin" /> : null}
                    Save as Pending
                  </button>
                </div>
              </div>

              {/* Pending Drafts */}
              {pendingDrafts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-yellow-500" /> Pending Purchases
                    <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">{pendingDrafts.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {pendingDrafts.map(draft => (
                      <div key={draft.id} className="flex items-center gap-3 py-3 px-4 rounded-lg bg-yellow-50 border border-yellow-200">
                        <div className="w-9 h-9 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
                          <Truck size={16} className="text-yellow-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{draft.order_no}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {draft.supplier} &bull; {draft.draft_items.length} medicine(s) &bull; {draft.payment_mode} &bull; {formatDate(draft.created_at)}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-gray-900 shrink-0">{formatCurrency(draft.total_amount)}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => loadDraftIntoForm(draft)}
                            className="px-3 py-1.5 text-xs font-medium text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteDraft(draft.id)} disabled={deletingId === draft.id}
                            className="text-red-400 hover:text-red-600 p-1 flex items-center justify-center">
                            {deletingId === draft.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                          <button onClick={() => handleCompleteDraft(draft.id)} disabled={completingId === draft.id}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                            {completingId === draft.id ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Receive
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Purchases */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-gray-500" /> Recent Purchases
                </h3>
                {purchasesLoading && (
                  <div className="space-y-3">{[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-3 py-3 border-b">
                      <div className="w-9 h-9 bg-gray-200 rounded-lg" />
                      <div className="flex-1 space-y-1.5"><div className="h-4 bg-gray-200 rounded w-1/3" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>
                      <div className="h-4 bg-gray-200 rounded w-20" />
                    </div>
                  ))}</div>
                )}
                {!purchasesLoading && recentPurchases.filter(p => p.status === 'completed').length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Truck size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No completed purchases yet</p>
                  </div>
                )}
                {!purchasesLoading && recentPurchases.filter(p => p.status === 'completed').map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all">
                    <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
                      <Truck size={16} className="text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{p.order_no}</p>
                      <p className="text-xs text-gray-500 truncate">{p.supplier} &bull; {p.items_count} items &bull; {p.payment_mode}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(p.total_amount)}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.date)}</p>
                    </div>
                    <SaleBadge status={p.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════ INVENTORY TAB ═══════════════ */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              {/* Overview boxes */}
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-100 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Inventory Overview</h3>
                {invLoading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                    {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-xl p-4 space-y-2"><div className="h-7 bg-gray-200 rounded w-12" /><div className="h-3 bg-gray-200 rounded w-20" /></div>)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm flex items-start justify-between">
                      <div><p className="text-xs text-gray-500 mb-1">Total Items</p><p className="text-2xl font-bold text-gray-900">{invOverview?.total_items ?? 0}</p></div>
                      <Package size={18} className="text-blue-500 mt-0.5" />
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm flex items-start justify-between">
                      <div><p className="text-xs text-gray-500 mb-1">Active Stock</p><p className="text-2xl font-bold text-gray-900">{invOverview?.active_stock ?? 0}</p></div>
                      <CheckCircle2 size={18} className="text-green-500 mt-0.5" />
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm flex items-start justify-between">
                      <div><p className="text-xs text-gray-500 mb-1">Low Stock</p><p className="text-2xl font-bold text-gray-900">{invOverview?.low_stock ?? 0}</p></div>
                      <AlertTriangle size={18} className="text-orange-500 mt-0.5" />
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm flex items-start justify-between">
                      <div><p className="text-xs text-gray-500 mb-1">Total Value</p><p className="text-2xl font-bold text-gray-900">{invOverview ? formatCurrency(invOverview.total_value) : '₹0'}</p></div>
                      <DollarSign size={18} className="text-purple-500 mt-0.5" />
                    </div>
                  </div>
                )}
              </div>

              {/* Complete Inventory */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">Complete Inventory</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button onClick={() => setShowInvFilter(p => !p)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${invStatusFilter ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                        <Filter size={13} />{invStatusFilter ? normalizeInvStatus(invStatusFilter) : 'Filter'}
                      </button>
                      {showInvFilter && (
                        <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-40 py-1">
                          {[{ v: '', l: 'All' }, { v: 'active', l: 'Active' }, { v: 'low_stock', l: 'Low Stock' }, { v: 'expired', l: 'Expired' }, { v: 'out_of_stock', l: 'Out of Stock' }].map(({ v, l }) => (
                            <button key={v} onClick={() => { setInvStatusFilter(v); setShowInvFilter(false); }}
                              className={`w-full px-4 py-2 text-left text-xs hover:bg-gray-50 ${invStatusFilter === v ? 'font-semibold text-blue-600' : 'text-gray-700'}`}>{l}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={handleInvExport}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Download size={13} /> Export
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['Medicine Name', 'Generic Name', 'Category', 'Batch No', 'Expiry Date', 'Qty', 'Cost Price', 'MRP', 'Supplier', 'Status'].map(col => (
                        <th key={col} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{col}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invLoading ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">{Array.from({ length: 10 }).map((_2, j) => (
                          <td key={j} className="px-3 py-2.5"><div className="h-3 bg-gray-200 rounded w-full" /></td>
                        ))}</tr>
                      )) : filteredInv.length === 0 ? (
                        <tr><td colSpan={10} className="px-3 py-8 text-center text-gray-400">No medicines found</td></tr>
                      ) : filteredInv.map(med => {
                        const lbl = STATUS_MAP[med.status] || med.status;
                        const bc = STATUS_BADGE[lbl] || 'bg-gray-100 text-gray-600';
                        return (
                          <tr key={med.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{med.name}</td>
                            <td className="px-3 py-2.5 text-gray-500">{med.generic_name}</td>
                            <td className="px-3 py-2.5 text-gray-500">{med.category}</td>
                            <td className="px-3 py-2.5 font-mono text-gray-600">{med.batch_no}</td>
                            <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{med.expiry_date}</td>
                            <td className={`px-3 py-2.5 font-semibold ${med.quantity === 0 ? 'text-red-500' : med.quantity < 5 ? 'text-orange-500' : 'text-gray-800'}`}>{med.quantity}</td>
                            <td className="px-3 py-2.5 text-gray-600">{formatCurrency(med.cost_price)}</td>
                            <td className="px-3 py-2.5 font-semibold text-gray-900">{formatCurrency(med.mrp)}</td>
                            <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{med.supplier}</td>
                            <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${bc}`}>{lbl}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
