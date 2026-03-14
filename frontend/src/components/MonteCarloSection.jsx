import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, Activity, AlertCircle } from 'lucide-react';

const MonteCarloSection = ({ data, onClose }) => {
  if (!data || !data.chart_data) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* max-h-[95vh]와 overflow-y-auto를 추가하여 화면 잘림 방지 */}
      <div className="glass-card w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/10 relative animate-in zoom-in-95 duration-200">
        
        {/* 모달 헤더 - 상단 고정 느낌을 위해 sticky 적용 가능하나 일단 기본 배치 */}
        <div className="flex justify-between items-center p-6 md:p-8 border-b border-stealth-border bg-white/[0.01]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded flex items-center justify-center text-black">
                <Activity size={20} />
            </div>
            <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tighter">전략 스트레스 테스트 (Monte Carlo)</h2>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">5,000개 시나리오 시뮬레이션 / 95% 신뢰 구간 분석</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2">
            <X size={28} />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 md:p-10 space-y-8">
          
          {/* 요약 정보 카드 섹션 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-lg">
                <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] block mb-2">파산 확률 (Ruin Probability)</span>
                <div className="flex items-baseline gap-2">
                    <div className={`text-3xl font-mono font-black ${data.ruin_probability > 0 ? 'text-red-500' : 'text-stealth-accent'}`}>
                        {data.ruin_probability}%
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{data.ruin_probability > 0 ? '위험' : '안전'}</span>
                </div>
              </div>
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-lg">
                <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] block mb-2">예상 최종 잔고 (Median)</span>
                <div className="text-3xl font-mono font-black text-white">
                    ${data.stats?.median_final_balance?.toLocaleString()}
                </div>
              </div>
              <div className="p-6 bg-white/[0.02] border border-white/5 rounded-lg">
                <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] block mb-2">최악의 낙폭 (Worst MDD)</span>
                <div className="text-3xl font-mono font-black text-red-500">
                    {data.stats?.worst_mdd}%
                </div>
              </div>
          </div>

          {/* 차트 영역 - 높이 최적화 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-stealth-accent"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">자산 성장 시뮬레이션 투영</span>
            </div>
            <div className="h-[350px] md:h-[450px] w-full bg-black/40 rounded border border-white/5 p-4 md:p-6 shadow-inner relative">
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
                    
                    <Tooltip 
                    contentStyle={{ 
                        backgroundColor: '#121212', 
                        border: '1px solid #2e2e2e', 
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                        color: '#fff'
                    }}
                    itemSorter={(item) => {
                        const order = { '상위 95%': 1, '중간값': 2, '하위 95%': 3 };
                        return order[item.name] || 99;
                    }}
                    formatter={(value, name) => [
                        value != null ? `$${value.toFixed(2)}` : '-', 
                        name
                    ]}
                    />
                    
                    <Area 
                    type="monotone" 
                    dataKey="upper" 
                    stroke="none" 
                    fill="#ffffff" 
                    fillOpacity={0.03} 
                    tooltipType="none"
                    />
                    <Area 
                    type="monotone" 
                    dataKey="lower" 
                    stroke="none" 
                    fill="#ffffff" 
                    fillOpacity={0.03} 
                    tooltipType="none"
                    />
                    
                    <Area 
                    type="monotone" 
                    dataKey="upper" 
                    stroke="#ffffff" 
                    strokeDasharray="4 4"
                    fill="none" 
                    strokeWidth={1}
                    strokeOpacity={0.3}
                    name="상위 95%"
                    />
                    <Area 
                    type="monotone" 
                    dataKey="median" 
                    stroke="#10b981" 
                    fill="none" 
                    strokeWidth={2}
                    name="중간값"
                    />
                    <Area 
                    type="monotone" 
                    dataKey="lower" 
                    stroke="#ef4444" 
                    strokeDasharray="4 4"
                    fill="none" 
                    strokeWidth={1}
                    strokeOpacity={0.3}
                    name="하위 95%"
                    />
                </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>

          {/* 가이드 문구 */}
          <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-4">
              <AlertCircle className="text-blue-400 shrink-0" size={20} />
              <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-tight">통계적 해석 가이드</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    이 시뮬레이션은 과거 매매 수익률의 분포를 바탕으로 5,000번의 미래 시나리오를 재구성한 결과입니다. 
                    <span className="text-red-400"> 하위 95% (Lower Bound)</span> 선은 통계적으로 발생 가능한 매우 보수적인 위험 지점을 의미하며, 
                    자산 곡선이 이 영역을 하향 돌파할 경우 전략의 근본적인 수정이 필요함을 시사합니다.
                  </p>
              </div>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="p-6 border-t border-stealth-border bg-white/[0.01] flex justify-end">
            <button 
                onClick={onClose}
                className="px-8 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-black uppercase tracking-widest transition-all"
            >
                분석 창 닫기
            </button>
        </div>
      </div>
    </div>
  );
};

export default MonteCarloSection;
