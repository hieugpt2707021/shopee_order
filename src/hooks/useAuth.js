import { useState, useEffect } from 'react';

// Generate a random UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get or create HWID
export function getHWID() {
  let hwid = localStorage.getItem('app_hwid');
  if (!hwid) {
    hwid = generateUUID();
    localStorage.setItem('app_hwid', hwid);
  }
  return hwid;
}

export function useAuth() {
  const [hwid, setHwid] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentHwid = getHWID();
        setHwid(currentHwid);

        const csvUrl = import.meta.env.VITE_GOOGLE_SHEET_CSV_URL;
        if (!csvUrl) {
          throw new Error('Thiếu cấu hình VITE_GOOGLE_SHEET_CSV_URL trong file .env');
        }

        // Fetch CSV data
        const response = await fetch(csvUrl);
        if (!response.ok) {
          throw new Error('Không thể kết nối tới Google Sheet (Lỗi mạng hoặc File không công khai)');
        }

        const csvText = await response.text();
        
        // Simple CSV parser (assuming comma separated, simple structure)
        const lines = csvText.split('\n');
        let authorized = false;
        
        // Skip header line (index 0)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Split by comma. We expect: HWID, Status, Name, ...
          const columns = line.split(',');
          if (columns.length >= 2) {
            const sheetHwid = columns[0].trim();
            const status = columns[1].trim();
            
            if (sheetHwid === currentHwid && status === 'ACTIVE') {
              authorized = true;
              break;
            }
          }
        }

        setIsAuthorized(authorized);
        setIsLoading(false);
      } catch (err) {
        console.error('Auth check error:', err);
        setError(err.message);
        setIsAuthorized(false); // Deny access on error
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  return { hwid, isAuthorized, isLoading, error };
}
