import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Terminal, Activity, Play, Square, Plus, Trash2, 
    Server, Cpu, FileText, X, Menu, BarChart3, AlertTriangle,
    CheckCircle2, XCircle, ShieldCheck, Search
} from 'lucide-react';
import { 
    XAxis, YAxis, Tooltip, ResponsiveContainer, 
    Area, ComposedChart, ReferenceLine, Line 
} from 'recharts';

const API_BASE = "/api/trading";

// ============================================
// 분석 섹션 컴포넌트 (모의투자: 95% 신뢰구간 분석)
// ============================================
const AnalysisSection = ({ data, onClose }) => {
    if (!data) return null;
    
    const { equity_curve, mc_baseline, analysis } = data;
    const mc_data = mc_baseline?.mc_data || mc_baseline;
    
    // 차트 데이터 병합
    const chartData = mc_data?.chart_data?.map((mc, idx) => ({
        trade_num: mc.trade_num,
        upper: mc.upper,
        median: mc.median,
        lower: mc.lower,
        actual: equity_curve?.[idx]?.equity || null
    })) || [];

    const currentTradeNum = equity_curve?.length || 0;
    const currentEquity = equity_curve?.[equity_curve.length - 1]?.equity || null;

    const statusStyles = {
        'NORMAL': 'text-stealth-accent border-stealth-accent/30 bg-stealth-accent/5',
        'WARNING': 'text-amber-400 border-amber-500/30 bg-amber-500/5',
        'DANGER': 'text-red-400 border-red-500/30 bg-red-500/5'
    };

    return (
        <div className="glass-card p-6 mt-6 animate-in slide-in-from-top-4 duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded text-white">
                        <Activity size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">몬테카를로 실시간 검증</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">백테스트 신뢰 구간 대비 현재 성과 추적</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`stealth-badge ${statusStyles[analysis?.status || 'NORMAL']}`}>
                        {analysis?.status || 'N/A'}
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* 차트 */}
            {chartData.length > 0 ? (
                <div className="h-72 mb-8 bg-black/40 rounded border border-white/5 p-4 shadow-inner">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <XAxis 
                                dataKey="trade_num" 
                                hide
                            />
                            <YAxis 
                                stroke="#444" 
                                fontSize={10} 
                                domain={['auto', 'auto']}
                                tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#121212', 
                                    border: '1px solid #2e2e2e',
                                    fontSize: '11px',
                                    borderRadius: '4px',
                                    color: '#fff'
                                }}
                                formatter={(value, name) => [`$${value?.toFixed(2)}`, name]}
                            />
                            <Area
                                type="monotone"
                                dataKey="upper"
                                stroke="none"
                                fill="#ffffff"
                                fillOpacity={0.03}
                                tooltipType="none"
                            />
                            <Line type="monotone" dataKey="upper" stroke="#ffffff" strokeDasharray="4 4" dot={false} strokeWidth={1} strokeOpacity={0.2} name="상위 95%" />
                            <Line type="monotone" dataKey="median" stroke="#ffffff" dot={false} strokeWidth={1} strokeOpacity={0.1} name="중간값" />
                            <Line type="monotone" dataKey="lower" stroke="#ffffff" strokeDasharray="4 4" dot={false} strokeWidth={1} strokeOpacity={0.2} name="하위 95%" />
                            <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} dot={false} connectNulls name="현재 성과" />
                            
                            {currentTradeNum > 0 && (
                                <ReferenceLine x={currentTradeNum} stroke="#10b981" strokeDasharray="3 3" />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-48 flex items-center justify-center text-slate-600 text-[10px] font-black border border-dashed border-stealth-border rounded mb-6 uppercase tracking-widest">
                    연결된 몬테카를로 기준 데이터가 없습니다.
                </div>
            )}

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="현재 거래" value={`${currentTradeNum}회`} />
                <StatBox label="현재 자산" value={`$${currentEquity?.toLocaleString() || '-'}`} color="text-white" />
                <StatBox label="시뮬레이션 기대치" value={`$${analysis?.confidence_breach?.median?.toLocaleString() || '-'}`} />
                <div className={`p-4 rounded border transition-all ${
                    analysis?.confidence_breach?.is_breach 
                        ? 'border-red-500/50 bg-red-500/5' 
                        : 'border-stealth-border bg-white/[0.02]'
                }`}>
                    <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-1.5">신뢰구간 상태</span>
                    <div className={`text-lg font-black font-mono flex items-center gap-2 ${
                        analysis?.confidence_breach?.is_breach ? 'text-red-500' : 'text-stealth-accent'
                    }`}>
                        {analysis?.confidence_breach?.is_breach ? 'BREACH' : 'STABLE'}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value, color = "text-slate-400" }) => (
    <div className="p-4 bg-white/[0.02] border border-stealth-border rounded">
        <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-1.5">{label}</span>
        <div className={`text-lg font-black font-mono ${color}`}>{value}</div>
    </div>
);


// ============================================
// 메인 컴포넌트
// ============================================
function PaperTrading() {
    const [bots, setBots] = useState([]);
    const [selectedBotId, setSelectedBotId] = useState(null);
    const [statusData, setStatusData] = useState(null);
    const [logs, setLogs] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBotConfig, setNewBotConfig] = useState({ 
        name: "", strategy: "", pair: "BTC/USDT", mode: "paper", backtest_file: "" 
    });
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [backtestOptions, setBacktestOptions] = useState([]);

    const fetchBots = async () => {
        try { 
            const res = await axios.get(`${API_BASE}/bots`);
            setBots(res.data.filter(bot => bot.mode === 'paper'));
        } catch (e) { console.error(e); }
    };

    const fetchBotDetails = async () => {
        if (!selectedBotId) return;
        try {
            const statusRes = await axios.get(`${API_BASE}/status?bot_id=${selectedBotId}`);
            const logsRes = await axios.get(`${API_BASE}/trades?bot_id=${selectedBotId}`);
            setStatusData(statusRes.data);
            setLogs(logsRes.data);
        } catch (e) { console.error(e); }
    };

    const fetchBacktestOptions = async () => {
        try {
            const res = await axios.get(`/api/trading/backtest-options`);
            setBacktestOptions(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchAnalysis = async () => {
        if (!selectedBotId) return;
        try {
            const res = await axios.get(`${API_BASE}/analysis/${selectedBotId}`);
            setAnalysisData(res.data);
        } catch (e) { console.error(e); }
    };

    const handleCreateBot = async () => {
        if (!newBotConfig.name || !newBotConfig.strategy) return alert("필수 정보를 입력해주세요.");
        try {
            await axios.post(`${API_BASE}/bots`, newBotConfig);
            setShowCreateModal(false);
            setNewBotConfig({ name: "", strategy: "", pair: "BTC/USDT", mode: "paper", backtest_file: "" });
            fetchBots();
        } catch (e) { alert("생성 실패: " + e.message); }
    };

    const handleDeleteBot = async (e, botId) => {
        e.stopPropagation();
        if (!window.confirm("정말 이 봇을 삭제하시겠습니까?")) return;
        try {
            await axios.delete(`${API_BASE}/bots/${botId}`);
            fetchBots();
            if (selectedBotId === botId) {
                setSelectedBotId(null);
                setStatusData(null);
                setAnalysisData(null);
            }
        } catch (e) { alert("삭제 실패: " + e.message); }
    };

    const handleStart = async () => {
        try { 
            await axios.post(`${API_BASE}/start`, { bot_id: selectedBotId }); 
            fetchBotDetails(); 
            fetchBots(); 
        } catch (e) { alert("실행 실패: " + (e.response?.data?.detail || e.message)); }
    };

    const handleStop = async () => {
        try { 
            await axios.post(`${API_BASE}/stop`, { bot_id: selectedBotId }); 
            fetchBotDetails(); 
            fetchBots(); 
        } catch (e) { alert("정지 실패: " + (e.response?.data?.detail || e.message)); }
    };

    useEffect(() => { 
        fetchBots(); 
        fetchBacktestOptions();
    }, []);
    
    useEffect(() => {
        if (selectedBotId) {
            fetchBotDetails();
            const interval = setInterval(fetchBotDetails, 2000);
            return () => clearInterval(interval);
        }
    }, [selectedBotId]);

    useEffect(() => {
        if (showAnalysis && selectedBotId) {
            fetchAnalysis();
            const interval = setInterval(fetchAnalysis, 5000);
            return () => clearInterval(interval);
        }
    }, [showAnalysis, selectedBotId]);

    const selectedBot = bots.find(b => b.id === selectedBotId);
    const isRunning = statusData?.status === "RUNNING";

    return (
        <div className="flex h-[calc(100vh-73px)] animate-in fade-in duration-500">
            
            {/* [사이드바] 봇 레지스트리 */}
            <div className="w-72 border-r border-stealth-border flex flex-col bg-stealth-card/30">
                <div className="p-6 border-b border-stealth-border">
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="cyber-button w-full flex items-center justify-center gap-2 text-[11px] py-2.5"
                    >
                        <Plus size={14} strokeWidth={3} /> 새로운 봇 등록
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {bots.map(bot => (
                        <div 
                            key={bot.id}
                            onClick={() => { setSelectedBotId(bot.id); setShowAnalysis(false); }}
                            className={`group p-4 rounded-lg border cursor-pointer transition-all ${
                                selectedBotId === bot.id 
                                    ? 'border-white bg-white/5 shadow-lg' 
                                    : 'border-white/5 hover:border-white/20'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-sm font-bold truncate pr-2 ${selectedBotId === bot.id ? 'text-white' : 'text-slate-400'}`}>
                                    {bot.name}
                                </span>
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${bot.status === 'RUNNING' ? 'bg-stealth-accent animate-pulse shadow-[0_0_8px_var(--color-stealth-accent)]' : 'bg-slate-700'}`} />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-tighter">
                                <span>{bot.pair}</span>
                                <div className="flex items-center gap-2">
                                    {bot.backtest_file && <span className="text-stealth-accent font-black">MC</span>}
                                    <Trash2 size={12} className="hover:text-red-500 transition-colors" onClick={(e) => handleDeleteBot(e, bot.id)}/>
                                </div>
                            </div>
                        </div>
                    ))}
                    {bots.length === 0 && (
                        <div className="text-center py-20 text-[10px] font-black text-slate-700 uppercase tracking-widest">봇이 없습니다</div>
                    )}
                </div>
            </div>

            {/* [메인] 대시보드 */}
            <div className="flex-1 flex flex-col min-w-0 bg-stealth-bg overflow-auto">
                {!selectedBotId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-6">
                        <Server size={48} strokeWidth={1} className="opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">현황을 보려면 봇을 선택하세요</span>
                    </div>
                ) : (
                    <div className="p-8 space-y-8 max-w-6xl w-full mx-auto">
                        {/* 상단 헤더 */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-stealth-border pb-8">
                            <div>
                                <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2">
                                    <Cpu size={12} /> Unit_Identifier: {selectedBotId}
                                </div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                                    {selectedBot?.name}
                                </h2>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setShowAnalysis(!showAnalysis)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 border rounded transition-all ${
                                        showAnalysis 
                                            ? 'bg-white text-black border-white' 
                                            : 'border-stealth-border text-slate-500 hover:text-white hover:border-white/30'
                                    }`}
                                >
                                    <BarChart3 size={14} /> 분석 지표
                                </button>

                                {isRunning ? (
                                    <button onClick={handleStop} className="bg-red-500/10 text-red-500 border border-red-500/30 px-5 py-2 text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all">
                                        <Square size={12} fill="currentColor" /> 중지
                                    </button>
                                ) : (
                                    <button onClick={handleStart} className="cyber-button px-5 py-2 text-[10px] flex items-center gap-2">
                                        <Play size={12} fill="currentColor" /> 실행
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 통계 섹션 */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="누적 수익률" value={`${statusData?.total_roi || 0}%`} color={(statusData?.total_roi || 0) >= 0 ? "text-stealth-accent" : "text-red-500"} />
                            <StatCard title="승 / 패" value={`${statusData?.win_count || 0} / ${statusData?.loss_count || 0}`} color="text-white" />
                            <StatCard title="전체 거래" value={`${statusData?.total_trade_count || 0}회`} color="text-slate-400" />
                            <StatCard title="활성 포지션" value={`${statusData?.active_trade_count || 0}개`} color="text-amber-400" />
                        </div>

                        {/* MC 분석 섹션 (토글) */}
                        {showAnalysis && (
                            <AnalysisSection 
                                data={analysisData} 
                                onClose={() => setShowAnalysis(false)}
                            />
                        )}

                        {/* 실행 로그 */}
                        <div className="glass-card flex flex-col h-[400px]">
                            <div className="p-5 border-b border-stealth-border bg-white/[0.01] flex items-center gap-3">
                                <FileText size={16} className="text-slate-500" />
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">최근 실행 기록</h3>
                            </div>
                            <div className="flex-1 overflow-auto bg-black/20">
                                <table className="w-full text-left">
                                    <thead className="text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 sticky top-0 bg-[#1a1a1a]">
                                        <tr>
                                            <th className="p-4">시간</th>
                                            <th className="p-4">결과</th>
                                            <th className="p-4 text-right">수익률(%)</th>
                                            <th className="p-4 text-right">수익금($)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors font-mono text-[11px]">
                                                <td className="p-4 text-slate-500">{log.timestamp?.substring(5, 16)}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black border ${log.is_win ? 'border-stealth-accent/30 text-stealth-accent' : 'border-red-500/30 text-red-500'}`}>
                                                        {log.is_win ? "WIN" : "LOSS"}
                                                    </span>
                                                </td>
                                                <td className={`p-4 font-bold text-right ${log.profit_percent >= 0 ? 'text-stealth-accent' : 'text-red-500'}`}>
                                                    {log.profit_percent}%
                                                </td>
                                                <td className={`p-4 text-right font-medium ${log.profit_abs >= 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                                                    {log.profit_abs}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {logs.length === 0 && (
                                    <div className="p-20 text-center text-slate-700 text-[10px] font-black uppercase tracking-widest">기록된 매매가 없습니다</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* [모달] 봇 생성 */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="glass-card w-full max-w-md p-10 border-white/10 shadow-2xl">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                                <Plus size={18} /> 유닛 신규 배치
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-600 hover:text-white transition-colors">
                                <X size={24}/>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2.5">봇 이름</label>
                                <input 
                                    className="cyber-input w-full"
                                    placeholder="예: 스캘퍼_01"
                                    value={newBotConfig.name}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, name: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2.5">백테스트 데이터 연결</label>
                                <select
                                    className="cyber-input w-full appearance-none cursor-pointer"
                                    value={newBotConfig.backtest_file}
                                    onChange={(e) => {
                                        const selected = backtestOptions.find(o => o.filename === e.target.value);
                                        setNewBotConfig({
                                            ...newBotConfig, 
                                            backtest_file: e.target.value,
                                            strategy: selected?.strategy || newBotConfig.strategy
                                        });
                                    }}
                                >
                                    <option value="">데이터 선택 안 함</option>
                                    {backtestOptions.map(opt => (
                                        <option key={opt.filename} value={opt.filename}>
                                            {opt.strategy} ({opt.date}) {opt.has_mc ? '✓MC' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2.5">전략 식별자 (Class)</label>
                                <input 
                                    className="cyber-input w-full font-mono"
                                    placeholder="예: MyStrategy"
                                    value={newBotConfig.strategy}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, strategy: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2.5">거래 페어</label>
                                <input 
                                    className="cyber-input w-full font-mono"
                                    placeholder="예: BTC/USDT"
                                    value={newBotConfig.pair}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, pair: e.target.value})}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleCreateBot}
                            className="mt-10 w-full cyber-button py-4 text-xs tracking-[0.2em]"
                        >
                            배치 시작
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const StatCard = ({ title, value, color }) => (
    <div className="bg-white/[0.02] border border-stealth-border p-5 rounded">
        <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-2">{title}</div>
        <div className={`text-2xl font-black ${color} font-mono truncate`}>{value}</div>
    </div>
);

export default PaperTrading;
