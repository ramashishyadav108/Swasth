import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  badge: string;
  badgeColor?: 'green' | 'yellow' | 'orange' | 'blue' | 'purple' | 'gray';
  icon: React.ReactNode;
  iconBgColor: string;
  loading?: boolean;
}

const badgeColorMap: Record<string, string> = {
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-600',
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  badge,
  badgeColor = 'green',
  icon,
  iconBgColor,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-gray-200" />
          <div className="h-5 bg-gray-200 rounded w-1/3" />
        </div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-5 bg-gray-200 rounded w-1/4" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
      {/* Top row: icon left, badge right */}
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBgColor}`}>
          {icon}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColorMap[badgeColor]}`}>
          {badge}
        </span>
      </div>
      {/* Value */}
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      {/* Title */}
      <p className="text-sm text-gray-500 mt-1">{title}</p>
    </div>
  );
};

export default StatCard;
