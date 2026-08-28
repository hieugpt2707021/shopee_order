import React from 'react';

export const Card = ({ children, className = '', style, ...props }) => {
  return (
    <div className={`rounded border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1c212a] ${className}`} style={style} {...props}>
      {children}
    </div>
  );
};
