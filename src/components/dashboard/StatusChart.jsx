import React from 'react';
import { Card } from '../Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export const StatusChart = ({ metrics }) => {
  const data = [
    { name: 'Hoàn thành', value: metrics.completedCount, color: '#10b981' },
    { name: 'Đang giao', value: metrics.deliveringCount, color: '#3b82f6' },
    { name: 'Đã hủy', value: metrics.cancelledCount, color: '#ef4444' },
    { name: 'Hoàn tiền', value: metrics.returnedCount, color: '#f59e0b' },
  ].filter(item => item.value > 0);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 p-2 rounded shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }}></div>
          <span className="text-gray-700 dark:text-gray-300 text-xs">{data.name}:</span>
          <span className="text-gray-900 dark:text-white font-bold text-xs">{data.value}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-800 rounded p-5 h-full flex flex-col">
      <h3 className="text-[14px] font-bold text-gray-900 dark:text-white mb-4">Tỷ lệ trạng thái đơn hàng</h3>
      
      <div className="flex-1 flex items-center gap-4">
        {/* Donut Chart */}
        <div className="relative w-[140px] h-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-gray-900 dark:text-white">{total}</span>
            <span className="text-[10px] text-gray-500">Tổng đơn</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 flex flex-col justify-center gap-3">
          {data.map((item, index) => {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            return (
              <div key={index} className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: item.color }}></div>
                  <div>
                    <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 leading-none mb-1">{item.name}</p>
                    <p className="text-[10px] text-gray-500 leading-none">
                      {item.value} ({percentage}%)
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
