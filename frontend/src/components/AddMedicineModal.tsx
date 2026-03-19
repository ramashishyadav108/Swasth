import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Medicine, MedicineFormData } from '../types';

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MedicineFormData) => Promise<void>;
  editMedicine?: Medicine | null;
}

const CATEGORIES = [
  'Antibiotics',
  'Analgesics',
  'Antipyretics',
  'Antacids',
  'Vitamins & Supplements',
  'Antidiabetics',
  'Antihypertensives',
  'Antihistamines',
  'Antifungals',
  'Antivirals',
  'Cardiovascular',
  'Dermatology',
  'Gastrointestinal',
  'Hormones',
  'Neurology',
  'Ophthalmology',
  'Respiratory',
  'Other',
];

const emptyForm: MedicineFormData = {
  name: '',
  generic_name: '',
  category: '',
  batch_no: '',
  expiry_date: '',
  quantity: 0,
  cost_price: 0,
  mrp: 0,
  supplier: '',
};

const AddMedicineModal: React.FC<AddMedicineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editMedicine,
}) => {
  const [form, setForm] = useState<MedicineFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof MedicineFormData, string>>>({});

  useEffect(() => {
    if (editMedicine) {
      setForm({
        name: editMedicine.name,
        generic_name: editMedicine.generic_name,
        category: editMedicine.category,
        batch_no: editMedicine.batch_no,
        expiry_date: editMedicine.expiry_date,
        quantity: editMedicine.quantity,
        cost_price: editMedicine.cost_price,
        mrp: editMedicine.mrp,
        supplier: editMedicine.supplier,
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [editMedicine, isOpen]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof MedicineFormData, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Medicine name is required';
    if (!form.generic_name.trim()) newErrors.generic_name = 'Generic name is required';
    if (!form.category) newErrors.category = 'Category is required';
    if (!form.batch_no.trim()) newErrors.batch_no = 'Batch number is required';
    if (!form.expiry_date) newErrors.expiry_date = 'Expiry date is required';
    if (form.quantity < 0) newErrors.quantity = 'Quantity cannot be negative';
    if (form.cost_price <= 0) newErrors.cost_price = 'Cost price must be greater than 0';
    if (form.mrp <= 0) newErrors.mrp = 'MRP must be greater than 0';
    if (!form.supplier.trim()) newErrors.supplier = 'Supplier is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
    if (errors[name as keyof MedicineFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {editMedicine ? 'Edit Medicine' : 'Add New Medicine'}
            </h2>
            <p className="text-sm text-gray-500">
              {editMedicine ? 'Update medicine details' : 'Fill in the details to add a new medicine'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6 grid grid-cols-2 gap-4">
            {/* Medicine Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medicine Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Amoxicillin 500mg"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Generic Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generic Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="generic_name"
                value={form.generic_name}
                onChange={handleChange}
                placeholder="e.g. Amoxicillin"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.generic_name ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.generic_name && (
                <p className="text-xs text-red-500 mt-1">{errors.generic_name}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                  errors.category ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-xs text-red-500 mt-1">{errors.category}</p>
              )}
            </div>

            {/* Batch No */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="batch_no"
                value={form.batch_no}
                onChange={handleChange}
                placeholder="e.g. BATCH001"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.batch_no ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.batch_no && (
                <p className="text-xs text-red-500 mt-1">{errors.batch_no}</p>
              )}
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="expiry_date"
                value={form.expiry_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.expiry_date ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.expiry_date && (
                <p className="text-xs text-red-500 mt-1">{errors.expiry_date}</p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                min="0"
                placeholder="0"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.quantity ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.quantity && (
                <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>
              )}
            </div>

            {/* Cost Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="cost_price"
                value={form.cost_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.cost_price ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.cost_price && (
                <p className="text-xs text-red-500 mt-1">{errors.cost_price}</p>
              )}
            </div>

            {/* MRP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MRP (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="mrp"
                value={form.mrp}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.mrp ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.mrp && <p className="text-xs text-red-500 mt-1">{errors.mrp}</p>}
            </div>

            {/* Supplier */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="supplier"
                value={form.supplier}
                onChange={handleChange}
                placeholder="e.g. Sun Pharma"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.supplier ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.supplier && (
                <p className="text-xs text-red-500 mt-1">{errors.supplier}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Saving...' : editMedicine ? 'Update Medicine' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicineModal;
