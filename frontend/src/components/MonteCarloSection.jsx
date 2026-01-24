import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X } from 'lucide-react';

const MonteCarloSection = ({ data, onClose }) => {
  if (!data || !data.chart_data) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-gray-800 w-full max-w-5xl rounded-2xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* 모달 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-black/40">
          <div>
            <h2 className="text-xl font-black text-white tracking-tighter">STRATEGY STRESS TEST</h2>
            <p className="text-[10px] text-gray-500 font-mono">5,000 SCENARIOS / 95% CONFIDENCE INTERVAL</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2">
            <X size={24} />
          </button>
        </div>

        {/* 차트 영역 */}
        <div className="p-8">
          <div className="h-[400px] w-full bg-black/20 rounded-xl border border-gray-900 p-4 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chart_data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="trade_num" hide />
                <YAxis 
                  stroke="#444" 
                  fontSize={10} 
                  tickFormatter={(v) => `$${v.toLocaleString()}`} 
                  axisLine={false} 
                  tickLine={false} 
                />
                
                {/* ★ Tooltip 수정: 순서 + 소수점 2자리 */}
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000', 
                    border: '1px solid #333', 
                    borderRadius: '8px' 
                  }}
                  itemSorter={(item) => {
                    const order = { 'Upper 95%': 1, 'Median': 2, 'Lower 95%': 3 };
                    return order[item.name] || 99;
                  }}
                  formatter={(value, name) => [
                    value != null ? `$${value.toFixed(2)}` : '-', 
                    name
                  ]}
                />
                
                {/* ★ 배경 영역 - Tooltip에서 숨김 */}
                <Area 
                  type="monotone" 
                  dataKey="upper" 
                  stroke="none" 
                  fill="#10b981" 
                  fillOpacity={0.05} 
                  tooltipType="none"
                />
                <Area 
                  type="monotone" 
                  dataKey="lower" 
                  stroke="none" 
                  fill="#10b981" 
                  fillOpacity={0.05} 
                  tooltipType="none"
                />
                
                {/* ★ 라인 - Tooltip에 표시 (순서: Upper → Median → Lower) */}
                <Area 
                  type="monotone" 
                  dataKey="upper" 
                  stroke="#10b981" 
                  strokeDasharray="5 5"
                  fill="none" 
                  strokeWidth={1}
                  name="Upper 95%"
                />
                <Area 
                  type="monotone" 
                  dataKey="median" 
                  stroke="#10b981" 
                  fill="none" 
                  strokeWidth={2}
                  name="Median"
                />
                <Area 
                  type="monotone" 
                  dataKey="lower" 
                  stroke="#10b981" 
                  strokeDasharray="5 5"
                  fill="none" 
                  strokeWidth={1}
                  name="Lower 95%"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 파산 확률 카드 */}
          <div className="p-4 bg-black border border-gray-800 rounded-lg w-fit">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Ruin Probability</span>
            <div className={`text-2xl font-black ${data.ruin_probability > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {data.ruin_probability}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonteCarloSection;