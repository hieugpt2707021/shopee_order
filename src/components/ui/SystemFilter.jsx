import React from 'react';

export const SystemFilter = ({ children, className = '' }) => {
  return (
    <div className={`flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-[#1a1b23] border border-gray-100 dark:border-gray-800 rounded ${className}`}>
      {children}
    </div>
  );
};
