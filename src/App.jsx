import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/Dashboard/page';
import { ImportedFilesPage } from './pages/ImportedFiles/page';
import { OrdersPage } from './pages/Orders/page';
import { SettingsPage } from './pages/Settings/page';
import { AccessDeniedPage } from './pages/AccessDenied/page';
import { useAuth } from './hooks/useAuth';

// Auth Guard Component
const ProtectedRoute = ({ children }) => {
  const { isAuthorized, isLoading, hwid, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 text-sm font-medium">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return <AccessDeniedPage hwid={hwid} error={error} />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/access-denied" element={<AccessDeniedPage />} />
        
        <Route 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/files" element={<ImportedFilesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
