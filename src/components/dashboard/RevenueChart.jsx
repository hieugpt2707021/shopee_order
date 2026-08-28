import React from 'react';
import { Card } from '../Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const RevenueChart = ({ data }) => {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 p-3 rounded shadow-lg">
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Ngày {label}</p>
          <p className="text-[#3b82f6] font-bold text-sm">
            {payload[0].value.toLocaleString('vi-VN')} đ
          </p>
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (tickItem) => {
    if (tickItem === 0) return '0';
    if (tickItem >= 1000000) return (tickItem / 1000000) + 'M';
    if (tickItem >= 1000) return (tickItem / 1000) + 'K';
    return tickItem;
  };

  return (
    <Card className="bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-800 rounded p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          Doanh thu theo ngày 
          <span className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-[9px] text-gray-400 dark:text-gray-500 cursor-help" title="Doanh thu từ các đơn hoàn thành và đang giao">?</span>
        </h3>
        <div className="flex items-center gap-2">
          <select className="bg-gray-50 dark:bg-[#1c212a] text-gray-700 dark:text-gray-300 text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1 outline-none">
            <option>Theo ngày</option>
          </select>
          <button className="p-1.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </button>
        </div>
      </div>
      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9ca3af', fontSize: 10 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickFormatter={formatYAxis}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', stroke: '#3b82f6', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
