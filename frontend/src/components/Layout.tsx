import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Settings,
  PlusCircle,
  Download,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showAddButton?: boolean;
  addButtonLabel?: string;
  onAddClick?: () => void;
  showExport?: boolean;
  onExportClick?: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const Layout: React.FC<LayoutProps> = ({
  children,
  title = 'Pharmacy CRM',
  subtitle = 'Manage your pharmacy efficiently',
  showAddButton = true,
  addButtonLabel = '+ Add Medicine',
  onAddClick,
  showExport = true,
  onExportClick,
}) => {
  const handleAddClick = () => {
    if (onAddClick) {
      onAddClick();
    }
  };

  const handleExportClick = () => {
    if (onExportClick) {
      onExportClick();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar — icon-only, matches reference */}
      <aside className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-3 flex-shrink-0 shadow-sm">
        {/* Logo */}
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center mb-5 flex-shrink-0">
          <span className="text-white font-bold text-xs">Rx</span>
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col items-center gap-0.5 flex-1 w-full px-1.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={label}
              className={({ isActive }) =>
                `w-full flex items-center justify-center p-2.5 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`
              }
              onClick={(e) => {
                if (to !== '/' && to !== '/inventory') {
                  e.preventDefault();
                }
              }}
            >
              {({ isActive }) => (
                <Icon size={20} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Settings at bottom */}
        <div className="mb-1">
          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Settings">
            <Settings size={20} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {showExport && (
              <button
                onClick={handleExportClick}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download size={16} />
                Export
              </button>
            )}
            {showAddButton && (
              <button
                onClick={handleAddClick}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusCircle size={16} />
                {addButtonLabel}
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
