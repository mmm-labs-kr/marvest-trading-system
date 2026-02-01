import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Terminal, Activity, Play, Square, Plus, Trash2, 
    Server, Cpu, FileText, X, Menu, BarChart3, AlertTriangle,
    CheckCircle2, XCircle
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    Area, ComposedChart, ReferenceLine 
} from 'recharts';

const API_BASE = "/trading";

// ============================================
// Analysis Section Component (모투용: 95% 신뢰구간)
// ============================================
const AnalysisSection = ({ data, onClose }) => {
    if (!data) return null;
    
    const { equity_curve, mc_baseline, analysis, mode } = data;
    const mc_data = mc_baseline?.mc_data || mc_baseline;
    
    // 차트 데이터 병합
    const chartData = mc_data?.chart_data?.map((mc, idx) => ({
        trade_num: mc.trade_num,
        upper: mc.upper,
        median: mc.median,
        lower: mc.lower,
        actual: equity_curve?.[idx]?.equity || null
    })) || [];

    // 현재 위치 표시용
    const currentTradeNum = equity_curve?.length || 0;
    const currentEquity = equity_curve?.[equity_curve.length - 1]?.equity || null;

    const statusColors = {
        'NORMAL': 'bg-green-900/50 text-green-400 border-green-500',
        'WARNING': 'bg-yellow-900/50 text-yellow-400 border-yellow-500',
        'DANGER': 'bg-red-900/50 text-red-400 border-red-500'
    };

    return (
        <div className="border border-green-900/50 bg-black/80 p-4 mt-4 rounded-lg">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-green-500 font-bold text-sm flex items-center gap-2">
                    <Activity size={16} /> MONTE CARLO ANALYSIS
                </h3>
                <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 text-[10px] font-bold rounded border ${statusColors[analysis?.status || 'NORMAL']}`}>
                        {analysis?.status || 'N/A'}
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* 차트 */}
            {chartData.length > 0 ? (
                <div className="h-64 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <defs>
                                <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05}/>
                                </linearGradient>
                            </defs>
                            
                            <XAxis 
                                dataKey="trade_num" 
                                stroke="#374151"
                                tick={{ fill: '#6B7280', fontSize: 10 }}
                                label={{ value: 'Trade #', position: 'bottom', fill: '#6B7280', fontSize: 10 }}
                            />
                            <YAxis 
                                stroke="#374151"
                                tick={{ fill: '#6B7280', fontSize: 10 }}
                                domain={['auto', 'auto']}
                                tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#000', 
                                    border: '1px solid #22c55e',
                                    fontSize: '11px',
                                    borderRadius: '4px'
                                }}
                                itemSorter={(item) => {
                                    const order = { 'Upper 95%': 1, 'Median': 2, 'Lower 95%': 3, 'Actual': 4 };
                                    return order[item.name] || 99;
                                }}
                                formatter={(value, name) => [
                                    value != null ? `$${value.toFixed(2)}` : '-', 
                                    name
                                ]}
                            />
                            {/* 신뢰구간 영역 */}
                            <Area
                                type="monotone"
                                dataKey="upper"
                                stroke="none"
                                fill="url(#confidenceBand)"
                                fillOpacity={1}
                                tooltipType="none"
                            />
                            
                            {/* 상한/하한 라인 */}
                            <Line 
                                type="monotone" 
                                dataKey="upper" 
                                stroke="#22c55e" 
                                strokeDasharray="5 5" 
                                dot={false} 
                                strokeWidth={1}
                                name="Upper 95%"
                            />
                            {/* 중앙값 */}
                            <Line 
                                type="monotone" 
                                dataKey="median" 
                                stroke="#6B7280" 
                                dot={false} 
                                strokeWidth={1}
                                name="Median"
                            />                           
                            <Line 
                                type="monotone" 
                                dataKey="lower" 
                                stroke="#22c55e" 
                                strokeDasharray="5 5" 
                                dot={false} 
                                strokeWidth={1}
                                name="Lower 95%"
                            />
                            {/* 실제 자산 곡선 (노란색) */}
                            <Line 
                                type="monotone" 
                                dataKey="actual" 
                                stroke="#facc15" 
                                strokeWidth={2} 
                                dot={false}
                                connectNulls
                                name="Actual"
                            />
                            
                            {/* 현재 위치 표시 */}
                            {currentTradeNum > 0 && (
                                <ReferenceLine 
                                    x={currentTradeNum} 
                                    stroke="#facc15" 
                                    strokeDasharray="3 3"
                                    label={{ value: 'NOW', fill: '#facc15', fontSize: 9 }}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-48 flex items-center justify-center text-gray-600 text-xs border border-dashed border-gray-800 rounded mb-4">
                    <div className="text-center">
                        <AlertTriangle size={24} className="mx-auto mb-2 opacity-50" />
                        <p>No Monte Carlo baseline linked.</p>
                        <p className="text-[10px] text-gray-700 mt-1">Select a backtest when creating the bot.</p>
                    </div>
                </div>
            )}

            {/* 범례 */}
            <div className="flex justify-center gap-6 mb-4 text-[10px]">
                <div className="flex items-center gap-1">
                    <div className="w-4 h-0.5 bg-yellow-400"></div>
                    <span className="text-gray-400">Actual Equity</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-0.5 bg-green-500 opacity-50" style={{borderStyle: 'dashed'}}></div>
                    <span className="text-gray-400">95% Confidence</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-4 h-0.5 bg-gray-500"></div>
                    <span className="text-gray-400">Median</span>
                </div>
            </div>

            {/* 분석 결과 카드 */}
            <div className="grid grid-cols-4 gap-2">
                <div className="bg-black border border-green-900/30 p-2 text-center rounded">
                    <div className="text-[9px] text-gray-500 uppercase">Trades</div>
                    <div className="text-lg font-bold text-white font-mono">
                        {currentTradeNum}
                    </div>
                </div>
                <div className="bg-black border border-green-900/30 p-2 text-center rounded">
                    <div className="text-[9px] text-gray-500 uppercase">Equity</div>
                    <div className="text-lg font-bold text-green-400 font-mono">
                        ${currentEquity?.toLocaleString() || '-'}
                    </div>
                </div>
                <div className="bg-black border border-green-900/30 p-2 text-center rounded">
                    <div className="text-[9px] text-gray-500 uppercase">Expected</div>
                    <div className="text-lg font-bold text-gray-400 font-mono">
                        ${analysis?.confidence_breach?.median?.toLocaleString() || '-'}
                    </div>
                </div>
                <div className={`bg-black border p-2 text-center rounded ${
                    analysis?.confidence_breach?.is_breach 
                        ? 'border-red-500 bg-red-900/10' 
                        : 'border-green-900/30'
                }`}>
                    <div className="text-[9px] text-gray-500 uppercase">Band Status</div>
                    <div className={`text-lg font-bold font-mono flex items-center justify-center gap-1 ${
                        analysis?.confidence_breach?.is_breach ? 'text-red-500' : 'text-green-400'
                    }`}>
                        {analysis?.confidence_breach?.is_breach 
                            ? <><XCircle size={14} /> BREACH</> 
                            : <><CheckCircle2 size={14} /> OK</>
                        }
                    </div>
                </div>
            </div>

            {/* 경고 메시지 */}
            {analysis?.confidence_breach?.is_breach && (
                <div className="mt-3 p-2 bg-red-900/20 border border-red-900/50 rounded text-xs text-red-400">
                    ⚠️ Current equity is {analysis.confidence_breach.breach_type === 'below' ? 'BELOW' : 'ABOVE'} the 95% confidence band.
                    {analysis.confidence_breach.breach_type === 'below' && ' Consider reviewing your strategy.'}
                </div>
            )}
        </div>
    );
};


// ============================================
// Main Component
// ============================================
function PaperTrading() {
    // --- [State Definitions] ---
    const [bots, setBots] = useState([]);
    const [selectedBotId, setSelectedBotId] = useState(null);
    const [statusData, setStatusData] = useState(null);
    const [logs, setLogs] = useState([]);
    
    // UI States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBotConfig, setNewBotConfig] = useState({ 
        name: "", 
        strategy: "", 
        pair: "BTC/USDT",
        backtest_file: ""  // ★ 추가
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    // ★ 분석 관련 State
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [backtestOptions, setBacktestOptions] = useState([]);

    // --- [API Functions] ---
    const fetchBots = async () => {
        try { 
            const res = await axios.get(`${API_BASE}/bots`);
            setBots(res.data.filter(bot => bot.mode === 'paper' || !bot.mode));
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

    // ★ 백테스트 옵션 로드
    const fetchBacktestOptions = async () => {
        try {
            const res = await axios.get(`${API_BASE}/backtest-options`);
            setBacktestOptions(res.data);
        } catch (e) { console.error(e); }
    };

    // ★ 분석 데이터 로드
    const fetchAnalysis = async () => {
        if (!selectedBotId) return;
        try {
            const res = await axios.get(`${API_BASE}/analysis/${selectedBotId}`);
            setAnalysisData(res.data);
        } catch (e) { console.error(e); }
    };

    const handleCreateBot = async () => {
        if (!newBotConfig.name || !newBotConfig.strategy) return alert("빈칸을 확인해주세요.");
        try {
            await axios.post(`${API_BASE}/bots`, newBotConfig);
            setShowCreateModal(false);
            setNewBotConfig({ name: "", strategy: "", pair: "BTC/USDT", backtest_file: "" });
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

    // --- [Effects] ---
    useEffect(() => { 
        fetchBots(); 
        fetchBacktestOptions();  // ★ 추가
    }, []);
    
    useEffect(() => {
        if (selectedBotId) {
            fetchBotDetails();
            const interval = setInterval(fetchBotDetails, 1000);
            return () => clearInterval(interval);
        }
    }, [selectedBotId]);

    // ★ 분석 데이터 로드 (토글 시 + 주기적 갱신)
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
        <div className="flex flex-col md:flex-row h-screen w-screen bg-black text-gray-300 font-mono overflow-hidden selection:bg-green-500 selection:text-black" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            
            <style>{`html, body, #root { margin: 0; padding: 0; height: 100%; overflow: hidden; }`}</style>

            {/* ================================================= */}
            {/* [좌측 사이드바] Bot Registry                        */}
            {/* ================================================= */}
            <div className={`
                flex flex-col border-b md:border-b-0 md:border-r border-green-900/50 bg-black z-20 transition-all duration-300
                w-full md:w-[280px] shrink-0
                ${isSidebarOpen ? 'h-[50vh] md:h-full' : 'h-14 md:h-full'} 
            `}>
                <div className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-green-900/50 shrink-0 bg-black">
                    <div className="flex items-center gap-2 text-green-500 font-bold tracking-wider">
                        <Terminal size={18} />
                        <span className="text-sm md:text-base">PAPER_TRADING</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-green-700 p-2">
                        {isSidebarOpen ? <X size={18}/> : <Menu size={18}/>}
                    </button>
                </div>

                <div className={`p-3 border-b border-green-900/50 shrink-0 bg-black ${!isSidebarOpen && 'hidden md:block'}`}>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="w-full py-2 bg-green-900/10 hover:bg-green-500 hover:text-black text-green-500 border border-green-600/50 transition-all flex justify-center items-center gap-2 text-xs font-bold uppercase tracking-wider"
                    >
                        <Plus size={14} /> New Bot
                    </button>
                </div>

                <div className={`flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-green-900 min-h-0 ${!isSidebarOpen && 'hidden md:block'}`}>
                    {bots.map(bot => (
                        <div 
                            key={bot.id}
                            onClick={() => { setSelectedBotId(bot.id); setIsSidebarOpen(false); setShowAnalysis(false); }}
                            className={`group relative p-3 border cursor-pointer transition-all hover:bg-green-900/10
                                ${selectedBotId === bot.id 
                                    ? 'border-green-500 bg-green-900/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                                    : 'border-green-900/30 hover:border-green-500/50 text-gray-500'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className={`font-bold text-sm truncate pr-2 ${selectedBotId === bot.id ? 'text-green-400' : 'group-hover:text-green-300'}`}>
                                    {bot.name}
                                </div>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${bot.status === 'RUNNING' ? 'bg-green-500 animate-pulse' : 'bg-red-900'}`} />
                            </div>
                            <div className="text-[10px] font-mono opacity-70 flex justify-between items-center">
                                <span className="truncate max-w-[80px]">{bot.pair}</span>
                                {bot.backtest_file && (
                                    <span className="text-green-600 text-[8px]">MC</span>
                                )}
                                <Trash2 size={12} className="hover:text-red-500 transition-colors z-10" onClick={(e) => handleDeleteBot(e, bot.id)}/>
                            </div>
                        </div>
                    ))}
                    {bots.length === 0 && (
                        <div className="text-center py-10 text-xs text-gray-700">NO BOTS DEPLOYED</div>
                    )}
                </div>
            </div>

            {/* ================================================= */}
            {/* [우측 메인] Dashboard Area                          */}
            {/* ================================================= */}
            <div className="flex-1 flex flex-col bg-black min-w-0 h-full overflow-hidden relative">
                
                {!selectedBotId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-green-900/30 gap-4 p-4 text-center">
                        <Server size={48} strokeWidth={1} />
                        <span className="text-base tracking-widest uppercase">Select a bot to view status</span>
                    </div>
                ) : (
                    <>
                        {/* 1. 상단 정보바 */}
                        <div className="min-h-14 border-b border-green-900/50 flex flex-row items-center justify-between px-4 py-2 bg-black/50 backdrop-blur-sm z-10 gap-2 shrink-0">
                            <div className="overflow-hidden flex-1">
                                <div className="text-[9px] text-green-700 font-bold uppercase tracking-wider mb-0.5">Target System</div>
                                <h2 className="text-base sm:text-lg font-bold text-green-500 flex items-center gap-2 truncate">
                                    {selectedBot?.name} 
                                    <span className="text-[10px] font-normal text-gray-500 bg-green-900/10 px-1.5 border border-green-900/30 rounded hidden sm:inline-block">
                                        {selectedBot?.pair}
                                    </span>
                                </h2>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                                {/* ★ 분석 토글 버튼 */}
                                <button 
                                    onClick={() => setShowAnalysis(!showAnalysis)}
                                    className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase flex items-center gap-1 border transition-all ${
                                        showAnalysis 
                                            ? 'bg-green-500 text-black border-green-500' 
                                            : 'bg-green-900/20 text-green-500 border-green-900 hover:border-green-500'
                                    }`}
                                >
                                    <BarChart3 size={12} /> MC
                                </button>

                                {isRunning ? (
                                    <button onClick={handleStop} className="bg-red-900/20 text-red-500 border border-red-900 px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase flex items-center gap-1">
                                        <Square size={10} fill="currentColor" /> Stop
                                    </button>
                                ) : (
                                    <button onClick={handleStart} className="bg-green-900/20 text-green-500 border border-green-900 px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase flex items-center gap-1">
                                        <Play size={10} fill="currentColor" /> Start
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 2. 스탯 카드 */}
                        <div className="p-3 sm:p-6 pb-0 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 shrink-0">
                            <StatCard title="Total Return" value={`${statusData?.total_roi || 0}%`} color={(statusData?.total_roi || 0) >= 0 ? "text-green-400" : "text-red-500"} />
                            <StatCard title="Win / Loss" value={`${statusData?.win_count || 0} / ${statusData?.loss_count || 0}`} color="text-white" />
                            <StatCard title="Total Trades" value={statusData?.total_trade_count || 0} color="text-blue-400" />
                            <StatCard title="Active Positions" value={statusData?.active_trade_count || 0} color="text-yellow-400" />
                        </div>

                        {/* ★ 3. MC 분석 섹션 (토글) */}
                        {showAnalysis && (
                            <div className="px-3 sm:px-6">
                                <AnalysisSection 
                                    data={analysisData} 
                                    onClose={() => setShowAnalysis(false)}
                                />
                            </div>
                        )}

                        {/* 4. 로그 테이블 */}
                        <div className="flex-1 p-3 sm:p-6 overflow-hidden flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-2 border-b border-green-900/30 pb-2 shrink-0">
                                <h3 className="text-green-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={14}/> Execution Logs
                                </h3>
                            </div>
                            
                            <div className="flex-1 overflow-auto border border-green-900/30 bg-black scrollbar-thin scrollbar-thumb-green-900">
                                <table className="w-full text-left text-xs min-w-[350px]">
                                    <thead className="bg-green-900/10 text-green-500 sticky top-0 font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="p-2">Time</th>
                                            <th className="p-2">Type</th>
                                            <th className="p-2 text-right">Profit %</th>
                                            <th className="p-2 text-right">Profit $</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-green-900/20">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-green-900/5 transition-colors font-mono">
                                                <td className="p-2 text-gray-500">{log.timestamp?.substring(5, 16)}</td>
                                                <td className="p-2">
                                                    <span className={`px-1 py-0.5 text-[9px] border ${log.is_win ? 'border-green-600 text-green-400' : 'border-red-600 text-red-500'}`}>
                                                        {log.is_win ? "WIN" : "LOSS"}
                                                    </span>
                                                </td>
                                                <td className={`p-2 font-bold text-right ${log.profit_percent >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                                    {log.profit_percent}%
                                                </td>
                                                <td className={`p-2 text-right ${log.profit_abs >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                                    {log.profit_abs}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {logs.length === 0 && <div className="p-10 text-center text-gray-700 text-xs">NO TRADES RECORDED</div>}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ================================================= */}
            {/* [모달] 봇 생성 팝업 (백테스트 선택 추가)              */}
            {/* ================================================= */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-black border border-green-500 w-full max-w-sm shadow-[0_0_30px_rgba(34,197,94,0.2)] p-6 relative">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-green-700 hover:text-green-400">
                            <X size={20}/>
                        </button>
                        
                        <h2 className="text-lg font-bold text-green-500 mb-4 flex items-center gap-2">
                            <Cpu size={20}/> DEPLOY NEW UNIT
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] text-green-700 font-bold mb-1 uppercase">Unit Name</label>
                                <input 
                                    className="w-full bg-black border border-green-900 text-green-400 px-3 py-2 text-sm focus:border-green-500 outline-none"
                                    placeholder="e.g. BTC Scalper"
                                    value={newBotConfig.name}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, name: e.target.value})}
                                />
                            </div>

                            {/* ★ 백테스트 결과 선택 */}
                            <div>
                                <label className="block text-[10px] text-green-700 font-bold mb-1 uppercase">
                                    Link Backtest Result
                                </label>
                                <select
                                    className="w-full bg-black border border-green-900 text-green-400 px-3 py-2 text-sm focus:border-green-500 outline-none"
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
                                    <option value="">-- Select Backtest --</option>
                                    {backtestOptions.map(opt => (
                                        <option key={opt.filename} value={opt.filename}>
                                            {opt.strategy} ({opt.date}) {opt.has_mc ? '✓MC' : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[9px] text-gray-600 mt-1">
                                    Links Monte Carlo analysis for performance tracking
                                </p>
                            </div>

                            <div>
                                <label className="block text-[10px] text-green-700 font-bold mb-1 uppercase">Strategy File</label>
                                <input 
                                    className="w-full bg-black border border-green-900 text-green-400 px-3 py-2 text-sm focus:border-green-500 outline-none"
                                    placeholder="e.g. MyStrategy"
                                    value={newBotConfig.strategy}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, strategy: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-green-700 font-bold mb-1 uppercase">Target Pair</label>
                                <input 
                                    className="w-full bg-black border border-green-900 text-green-400 px-3 py-2 text-sm focus:border-green-500 outline-none"
                                    placeholder="e.g. BTC/USDT"
                                    value={newBotConfig.pair}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, pair: e.target.value})}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleCreateBot}
                            className="mt-6 w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 text-xs uppercase tracking-wider transition-all"
                        >
                            Confirm Deployment
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const StatCard = ({ title, value, color }) => (
    <div className="bg-black border border-green-900/30 p-2 sm:p-3 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{title}</div>
        <div className={`text-base sm:text-xl font-bold ${color} font-mono truncate`}>{value}</div>
    </div>
);

export default PaperTrading;