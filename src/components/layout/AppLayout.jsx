import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { LayoutGrid, FileText, Settings, Moon, Sun, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const routeInfo = {
  '/': { name: 'Tổng quan Shopee', icon: LayoutGrid, description: 'Phân tích dữ liệu tài chính đơn hàng' },
  '/orders': { name: 'Đơn hàng', icon: ShoppingBag, description: 'Quản lý và theo dõi tất cả đơn hàng từ các file Excel Shopee' },
  '/files': { name: 'Quản lý File', icon: FileText, description: 'Lịch sử upload file và dữ liệu nguồn' },
  '/settings': { name: 'Cài đặt hệ thống', icon: Settings, description: 'Cấu hình và tùy chỉnh ứng dụng' },
};

export const AppLayout = () => {
  const location = useLocation();
  const currentRoute = routeInfo[location.pathname] || { name: 'Dashboard', description: '' };
  const Icon = currentRoute.icon;
  
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  // Framer Motion + View Transitions toggle
  const toggleTheme = () => {
    const newIsDark = !isDark;
    
    // Smooth circle clip-path transition if supported by browser
    if (!document.startViewTransition) {
      document.documentElement.classList.toggle('dark', newIsDark);
      setIsDark(newIsDark);
      return;
    }

    // Use view transition API for full page wipe effect
    const transition = document.startViewTransition(() => {
      document.documentElement.classList.toggle('dark', newIsDark);
      setIsDark(newIsDark);
    });
    
    // Add cool circle expansion effect (optional, handled by CSS if defined)
  };

  return (
    <div className="flex h-screen bg-[#f4f5f7] dark:bg-[#131720] text-[#111827] dark:text-[#f3f4f6] overflow-hidden font-sans transition-colors duration-300">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#fbfbfa] dark:bg-[#131720]">
        
        {/* Page Content with Route Transition */}
        <div className="flex-1 flex flex-col overflow-hidden relative custom-scrollbar">
          <div className="flex-1 flex flex-col min-h-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
