import React from 'react';

export const SettingsPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full animate-slide-up text-center">
      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        Tính năng đang phát triển
      </h3>
      <p style={{ maxWidth: '400px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Khu vực cài đặt hệ thống sẽ sớm được ra mắt trong phiên bản tiếp theo.
      </p>
    </div>
  );
};
