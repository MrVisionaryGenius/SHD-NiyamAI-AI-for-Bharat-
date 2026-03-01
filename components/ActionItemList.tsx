'use client';

import { Recommendation } from '@/types';

interface ActionItemListProps {
  items: Recommendation[];
}

export function ActionItemList({ items }: ActionItemListProps) {
  const getPriorityBadge = (priority: number) => {
    if (priority <= 3) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
          High Priority
        </span>
      );
    } else if (priority <= 6) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
          Medium Priority
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          Low Priority
        </span>
      );
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <p className="text-gray-500">No action items at this time. Great job!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Action Items</h3>
        <p className="text-sm text-gray-600 mt-1">
          {items.length} recommendation{items.length !== 1 ? 's' : ''} to improve your risk posture
        </p>
      </div>
      <ul className="divide-y divide-gray-200">
        {items.map((item, index) => (
          <li key={item.id || index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {getPriorityBadge(item.priority)}
                  <span className="text-xs text-gray-500">Priority {item.priority}</span>
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">{item.issue}</h4>
                <p className="text-sm text-gray-600">{item.suggestion}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
