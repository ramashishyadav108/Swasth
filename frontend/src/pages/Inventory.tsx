import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Search,
  Filter,
  Download,
  Pencil,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { inventoryApi } from '../api/client';
import AddMedicineModal from '../components/AddMedicineModal';
import type { Medicine, InventoryOverview, MedicineFormData } from '../types';

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Backend returns snake_case statuses; map to display labels
const normalizeStatus = (status: string): string => {
  const map: Record<string, string> = {
    active: 'Active',
    low_stock: 'Low Stock',
    expired: 'Expired',
    out_of_stock: 'Out of Stock',
    Active: 'Active',
    'Low Stock': 'Low Stock',
    Expired: 'Expired',
    'Out of Stock': 'Out of Stock',
  };
  return map[status] || status;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const label = normalizeStatus(status);
  const colors: Record<string, string> = {
    Active: 'bg-green-100 text-green-700',
    'Low Stock': 'bg-yellow-100 text-yellow-700',
    Expired: 'bg-red-100 text-red-700',
    'Out of Stock': 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
        colors[label] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {label}
    </span>
  );
};

// Filter options use backend snake_case values
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'expired', label: 'Expired' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

const PER_PAGE = 15;

interface OverviewCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  loading?: boolean;
}

const OverviewCard: React.FC<OverviewCardProps> = ({ title, value, icon, iconBg, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 animate-pulse">
        <div className="w-8 h-8 bg-white/40 rounded-lg" />
        <div className="h-6 bg-white/40 rounded w-16" />
        <div className="h-4 bg-white/30 rounded w-20" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-white/80">{title}</p>
    </div>
  );
};

interface InventoryProps {
  externalModalOpen?: boolean;
  onExternalModalClose?: () => void;
}

const Inventory: React.FC<InventoryProps> = ({
  externalModalOpen = false,
  onExternalModalClose,
}) => {
  const [overview, setOverview] = useState<InventoryOverview | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [medicinesLoading, setMedicinesLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [medicinesError, setMedicinesError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = internalModalOpen || externalModalOpen;
  const [editMedicine, setEditMedicine] = useState<Medicine | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await inventoryApi.getOverview();
      setOverview(data);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : 'Failed to load overview');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const fetchMedicines = useCallback(async () => {
    setMedicinesLoading(true);
    setMedicinesError(null);
    try {
      const response = await inventoryApi.getMedicines({
        search: searchQuery,
        status: statusFilter,
        page: currentPage,
        page_size: PER_PAGE,
      });
      setMedicines(response.items || []);
      setTotal(response.total || 0);
    } catch (err) {
      setMedicinesError(err instanceof Error ? err.message : 'Failed to load medicines');
      setMedicines([]);
    } finally {
      setMedicinesLoading(false);
    }
  }, [searchQuery, statusFilter, currentPage]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const handleSearch = () => {
    setCurrentPage(1);
    setSearchQuery(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
    setShowFilterPanel(false);
  };

  const handleOpenAdd = () => {
    setEditMedicine(null);
    setSaveError(null);
    setInternalModalOpen(true);
  };

  const handleOpenEdit = (medicine: Medicine) => {
    setEditMedicine(medicine);
    setSaveError(null);
    setInternalModalOpen(true);
  };

  const handleSave = async (data: MedicineFormData) => {
    setSaveError(null);
    try {
      if (editMedicine) {
        await inventoryApi.updateMedicine(editMedicine.id, data);
        setSaveSuccess('Medicine updated successfully');
      } else {
        await inventoryApi.createMedicine(data);
        setSaveSuccess('Medicine added successfully');
      }
      fetchOverview();
      fetchMedicines();
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save medicine';
      setSaveError(msg);
      throw err;
    }
  };

  const handleExport = () => {
    const headers = ['Name', 'Generic Name', 'Category', 'Batch No', 'Expiry Date', 'Quantity', 'Cost Price', 'MRP', 'Supplier', 'Status'];
    const rows = medicines.map((m) => [
      m.name, m.generic_name, m.category, m.batch_no,
      m.expiry_date, m.quantity, m.cost_price, m.mrp, m.supplier, m.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Save notifications */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 size={16} />
          {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle size={16} />
          {saveError}
          <button onClick={() => setSaveError(null)} className="ml-auto">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Inventory Overview Card */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-600 rounded-2xl p-6 shadow-lg">
        <h2 className="text-white font-bold text-lg mb-1">Inventory Overview</h2>
        <p className="text-white/70 text-sm mb-5">Real-time stock summary</p>

        {overviewError && (
          <div className="bg-white/20 rounded-lg p-3 mb-4 text-white text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            {overviewError}
            <button onClick={fetchOverview} className="ml-auto text-xs underline">Retry</button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <OverviewCard
            title="Total Items"
            value={overview?.total_items ?? 0}
            icon={<Package size={18} className="text-white" />}
            iconBg="bg-blue-500/60"
            loading={overviewLoading}
          />
          <OverviewCard
            title="Active Stock"
            value={overview?.active_stock ?? 0}
            icon={<CheckCircle2 size={18} className="text-white" />}
            iconBg="bg-green-500/60"
            loading={overviewLoading}
          />
          <OverviewCard
            title="Low Stock"
            value={overview?.low_stock ?? 0}
            icon={<AlertTriangle size={18} className="text-white" />}
            iconBg="bg-orange-400/60"
            loading={overviewLoading}
          />
          <OverviewCard
            title="Total Value"
            value={overview ? formatCurrency(overview.total_value) : '₹0'}
            icon={<DollarSign size={18} className="text-white" />}
            iconBg="bg-purple-500/60"
            loading={overviewLoading}
          />
        </div>
      </div>

      {/* Complete Inventory Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">Complete Inventory</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {medicinesLoading ? 'Loading...' : `${total} medicine${total !== 1 ? 's' : ''} total`}
            </p>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search medicines..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchInput && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>

          {/* Filter & Export */}
          <div className="flex items-center gap-2 flex-shrink-0 relative">
            <div className="relative">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${
                  statusFilter
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter size={14} />
                {statusFilter ? normalizeStatus(statusFilter) : 'Filter'}
              </button>
              {showFilterPanel && (
                <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-44 py-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusFilter(opt.value)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                        statusFilter === opt.value ? 'font-semibold text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* Active filters */}
        {(searchQuery || statusFilter) && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-blue-700 font-medium">Active filters:</span>
            {searchQuery && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 rounded-full text-xs text-blue-800">
                Search: "{searchQuery}"
                <button onClick={handleClearSearch} className="hover:text-blue-600">
                  <X size={10} />
                </button>
              </span>
            )}
            {statusFilter && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 rounded-full text-xs text-blue-800">
                Status: {normalizeStatus(statusFilter)}
                <button onClick={() => handleStatusFilter('')} className="hover:text-blue-600">
                  <X size={10} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  'Medicine Name',
                  'Generic Name',
                  'Category',
                  'Batch No',
                  'Expiry Date',
                  'Qty',
                  'Cost Price',
                  'MRP',
                  'Supplier',
                  'Status',
                  'Actions',
                ].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medicinesLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded" style={{ width: `${60 + (j * 7) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : medicinesError ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-red-500">
                      <AlertTriangle size={24} />
                      <p className="text-sm font-medium">{medicinesError}</p>
                      <button
                        onClick={fetchMedicines}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw size={12} /> Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <Package size={32} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium text-gray-500">No medicines found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {searchQuery || statusFilter
                        ? 'Try adjusting your search or filters'
                        : 'Add your first medicine to get started'}
                    </p>
                    {!searchQuery && !statusFilter && (
                      <button
                        onClick={handleOpenAdd}
                        className="mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        + Add Medicine
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                medicines.map((med, idx) => (
                  <tr
                    key={med.id}
                    className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {med.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{med.generic_name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{med.category}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{med.batch_no}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(med.expiry_date)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      <span
                        className={`${med.quantity <= 10 && med.quantity > 0 ? 'text-orange-600' : med.quantity === 0 ? 'text-red-500' : 'text-gray-800'}`}
                      >
                        {med.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatCurrency(med.cost_price)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(med.mrp)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{med.supplier}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={med.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleOpenEdit(med)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!medicinesLoading && !medicinesError && totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 text-sm rounded-lg border transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AddMedicineModal
        isOpen={isModalOpen}
        onClose={() => {
          setInternalModalOpen(false);
          onExternalModalClose?.();
          setEditMedicine(null);
          setSaveError(null);
        }}
        onSave={handleSave}
        editMedicine={editMedicine}
      />
    </div>
  );
};

export default Inventory;
