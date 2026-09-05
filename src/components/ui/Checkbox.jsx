import React from 'react';
import { Check } from 'lucide-react';

export const Checkbox = ({ checked, onChange, className = '' }) => {
  return (
    <div 
      className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-colors border ${
        checked 
          ? 'bg-[#5865f2] border-[#5865f2]' 
          : 'bg-transparent border-gray-300 dark:border-gray-600 hover:border-[#5865f2] dark:hover:border-[#5865f2]'
      } ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange && onChange({ target: { checked: !checked } });
      }}
    >
      {checked && <Check size={12} strokeWidth={4} className="text-white" />}
    </div>
  );
};
