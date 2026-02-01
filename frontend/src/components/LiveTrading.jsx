import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Activity, Play, Square, Plus, Trash2, 
    Server, Cpu, FileText, X, Menu, AlertTriangle,
    BarChart3, CheckCircle2, XCircle, Shield, TrendingDown
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    Area, ComposedChart, ReferenceLine, BarChart, Bar, Cell
} from 'recharts';

const API_BASE = "http://127.0.0.1:8000/trading";

// ============================================
// Analysis Section Component (실투용: Rolling MDD)
// ============================================
const LiveAnalysisSection = ({ data, onClose }) => {
    if (!data) return null;
    
    const { equity_curve, mc_baseline, analysis, mode } = data;
    const mc_data = mc_baseline?.mc_data || mc_baseline;
    
    // MDD 분석 데이터
    const mddBreach = analysis?.mdd_breach;
    const rollingMDD = analysis?.rolling_mdd_30d || 0;
    const thresholdMDD = mddBreach?.threshold || mc_data?.stats?.worst_mdd || -30;
    
    // Equity Curve 차트 데이터
    const equityChartData = equity_curve?.map((e, idx) => ({
        trade_num: e.trade_num,
        equity: e.equity,
        profit_pct: e.profit_pct
    })) || [];

    // MDD 게이지 계산 (0~100%)
    const mddPercentage = Math.min(Math.abs(rollingMDD / thresholdMDD) * 100, 150);
    const isBreached = mddBreach?.is_breach || false;

    const statusColors = {
        'NORMAL': 'bg-green-900/50 text-green-400 border-green-500',
        'WARNING': 'bg-yellow-900/50 text-yellow-400 border-yellow-500',
        'DANGER': 'bg-red-900/50 text-red-400 border-red-500 animate-pulse'
    };

    return (
        <div className="border border-red-900/50 bg-black/80 p-4 mt-4 rounded-lg">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-red-500 font-bold text-sm flex items-center gap-2">
                    <Shield size={16} /> RISK MONITOR
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

            {/* MDD 위험 경고 배너 */}
            {isBreached && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg flex items-center gap-3 animate-pulse">
                    <AlertTriangle size={24} className="text-red-500" />
                    <div>
                        <div className="text-red-400 font-bold text-sm">⚠️ MDD THRESHOLD EXCEEDED</div>
                        <div className="text-red-300 text-xs">
                            Current Rolling MDD ({rollingMDD}%) exceeds backtest worst-case ({thresholdMDD}%)
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 좌측: MDD 게이지 */}
                <div className="bg-black border border-red-900/30 rounded-lg p-4">
                    <h4 className="text-xs text-gray-500 uppercase mb-4 flex items-center gap-2">
                        <TrendingDown size={14} className="text-red-500" />
                        Rolling MDD (30 Trades)
                    </h4>
                    
                    {/* 게이지 바 */}
                    <div className="relative mb-4">
                        <div className="w-full bg-gray-800 h-6 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                    isBreached ? 'bg-red-500' : 
                                    mddPercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(mddPercentage, 100)}%` }}
                            />
                        </div>
                        {/* 임계값 마커 */}
                        <div 
                            className="absolute top-0 h-6 w-0.5 bg-white"
                            style={{ left: '100%', transform: 'translateX(-2px)' }}
                        />
                        <div className="absolute -top-5 right-0 text-[9px] text-gray-500">
                            Threshold
                        </div>
                    </div>

                    {/* 수치 표시 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <div className="text-[9px] text-gray-500 uppercase mb-1">Current MDD</div>
                            <div className={`text-2xl font-black font-mono ${
                                isBreached ? 'text-red-500' : 'text-white'
                            }`}>
                                {rollingMDD}%
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-[9px] text-gray-500 uppercase mb-1">Threshold (BT Top 5%)</div>
                            <div className="text-2xl font-black font-mono text-gray-400">
                                {thresholdMDD}%
                            </div>
                        </div>
                    </div>

                    {/* 상태 메시지 */}
                    <div className={`mt-4 p-2 rounded text-center text-xs ${
                        isBreached 
                            ? 'bg-red-900/30 text-red-400 border border-red-900' 
                            : 'bg-green-900/30 text-green-400 border border-green-900'
                    }`}>
                        {isBreached 
                            ? '🚨 Strategy is underperforming beyond expected range'
                            : '✅ MDD within acceptable range'
                        }
                    </div>
                </div>

                {/* 우측: Equity Curve */}
                <div className="bg-black border border-red-900/30 rounded-lg p-4">
                    <h4 className="text-xs text-gray-500 uppercase mb-4 flex items-center gap-2">
                        <Activity size={14} className="text-red-500" />
                        Equity Curve
                    </h4>
                    
                    {equityChartData.length > 0 ? (
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={equityChartData}>
                                    <defs>
                                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    
                                    <XAxis 
                                        dataKey="trade_num" 
                                        stroke="#374151"
                                        tick={{ fill: '#6B7280', fontSize: 9 }}
                                    />
                                    <YAxis 
                                        stroke="#374151"
                                        tick={{ fill: '#6B7280', fontSize: 9 }}
                                        domain={['auto', 'auto']}
                                        tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#000', 
                                            border: '1px solid #ef4444',
                                            fontSize: '10px',
                                            borderRadius: '4px'
                                        }}
                                        formatter={(value, name) => [
                                            name === 'equity' ? `$${value?.toLocaleString()}` : `${value}%`,
                                            name === 'equity' ? 'Equity' : 'Profit'
                                        ]}
                                    />
                                    
                                    <Area
                                        type="monotone"
                                        dataKey="equity"
                                        stroke="none"
                                        fill="url(#equityGradient)"
                                    />
                                    
                                    <Line 
                                        type="monotone" 
                                        dataKey="equity" 
                                        stroke="#ef4444" 
                                        strokeWidth={2} 
                                        dot={false}
                                        name="equity"
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-gray-600 text-xs border border-dashed border-gray-800 rounded">
                            <div className="text-center">
                                <Activity size={24} className="mx-auto mb-2 opacity-50" />
                                <p>No trades yet</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 하단: MC 기준 정보 */}
            {mc_data && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                    <div className="bg-black border border-red-900/30 p-2 text-center rounded">
                        <div className="text-[9px] text-gray-500 uppercase">BT Trades</div>
                        <div className="text-sm font-bold text-white font-mono">
                            {mc_baseline?.total_trades || '-'}
                        </div>
                    </div>
                    <div className="bg-black border border-red-900/30 p-2 text-center rounded">
                        <div className="text-[9px] text-gray-500 uppercase">BT Avg MDD</div>
                        <div className="text-sm font-bold text-gray-400 font-mono">
                            {mc_data?.stats?.avg_mdd || '-'}%
                        </div>
                    </div>
                    <div className="bg-black border border-red-900/30 p-2 text-center rounded">
                        <div className="text-[9px] text-gray-500 uppercase">BT Worst MDD</div>
                        <div className="text-sm font-bold text-red-400 font-mono">
                            {mc_data?.stats?.worst_mdd || '-'}%
                        </div>
                    </div>
                    <div className="bg-black border border-red-900/30 p-2 text-center rounded">
                        <div className="text-[9px] text-gray-500 uppercase">Ruin Prob</div>
                        <div className="text-sm font-bold text-yellow-400 font-mono">
                            {mc_data?.ruin_probability || 0}%
                        </div>
                    </div>
                </div>
            )}

            {/* MC 연결 안됨 경고 */}
            {!mc_baseline && (
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-900/50 rounded-lg text-xs text-yellow-400">
                    ⚠️ No backtest linked. MDD threshold comparison is unavailable.
                    <br />
                    <span className="text-yellow-600">Create a new bot with a linked backtest for full risk monitoring.</span>
                </div>
            )}
        </div>
    );
};


// ============================================
// Main Component
// ============================================
function LiveTrading() {
    // --- [State Definitions] ---
    const [bots, setBots] = useState([]);
    const [selectedBotId, setSelectedBotId] = useState(null);
    const [statusData, setStatusData] = useState(null);
    const [logs, setLogs] = useState([]);
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBotConfig, setNewBotConfig] = useState({ 
        name: "", 
        strategy: "", 
        pair: "BTC/USDT",
        backtest_file: ""
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
            const liveBots = res.data.filter(bot => bot.mode === 'live');
            setBots(liveBots); 
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
            const res = await axios.get(`${API_BASE}/backtest-options`);
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
        if (!newBotConfig.name || !newBotConfig.strategy) return alert("빈칸을 확인해주세요.");
        
        // ★ 실전 투자 경고
        if (!window.confirm("⚠️ [경고] 실전 투자 봇을 생성합니다.\n실제 자금이 사용됩니다. 계속하시겠습니까?")) return;
        
        try {
            await axios.post(`${API_BASE}/bots`, { ...newBotConfig, mode: "live" });
            alert("✅ 실전 투자 봇이 생성되었습니다.");
            setShowCreateModal(false);
            setNewBotConfig({ name: "", strategy: "", pair: "BTC/USDT", backtest_file: "" });
            fetchBots();
        } catch (e) { alert("생성 실패: " + e.message); }
    };

    const handleDeleteBot = async (e, botId) => {
        e.stopPropagation();
        if (!window.confirm("⚠️ 경고: 실전 봇을 삭제하시겠습니까?\n거래 기록도 함께 삭제됩니다.")) return;
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
        if (!window.confirm("⚠️ [경고] 정말로 실전 매매를 시작하시겠습니까?\n실제 자산이 사용되며 손실이 발생할 수 있습니다.")) return;
        
        try { 
            await axios.post(`${API_BASE}/start`, { bot_id: selectedBotId }); 
            fetchBotDetails(); 
            fetchBots(); 
        } catch (e) { alert("실행 실패: " + (e.response?.data?.detail || e.message)); }
    };

    const handleStop = async () => {
        if (!window.confirm("매매를 중단하시겠습니까?")) return;
        try { 
            await axios.post(`${API_BASE}/stop`, { bot_id: selectedBotId }); 
            fetchBotDetails(); 
            fetchBots(); 
        } catch (e) { alert("정지 실패: " + (e.response?.data?.detail || e.message)); }
    };

    // --- [Effects] ---
    useEffect(() => { 
        fetchBots(); 
        fetchBacktestOptions();
    }, []);
    
    useEffect(() => {
        if (selectedBotId) {
            fetchBotDetails();
            const interval = setInterval(fetchBotDetails, 1000);
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

    // 테마 색상 (Red)
    const themeColor = "text-red-500";
    const borderColor = "border-red-900";
    const hoverBg = "hover:bg-red-900/10";

    return (
        <div className="flex flex-col md:flex-row h-screen w-screen bg-black text-gray-300 font-mono overflow-hidden selection:bg-red-500 selection:text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            
            <style>{`html, body, #root { margin: 0; padding: 0; height: 100%; overflow: hidden; }`}</style>

            {/* ================================================= */}
            {/* [좌측 사이드바]                                     */}
            {/* ================================================= */}
            <div className={`
                flex flex-col border-b md:border-b-0 md:border-r ${borderColor}/50 bg-black z-20 transition-all duration-300
                w-full md:w-[280px] shrink-0
                ${isSidebarOpen ? 'h-[50vh] md:h-full' : 'h-14 md:h-full'} 
            `}>
                <div className={`h-14 flex items-center justify-between px-4 sm:px-6 border-b ${borderColor}/50 shrink-0 bg-black`}>
                    <div className={`flex items-center gap-2 ${themeColor} font-bold tracking-wider`}>
                        <Activity size={18} />
                        <span className="text-sm md:text-base">LIVE_TRADING</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-red-700 p-2">
                        {isSidebarOpen ? <X size={18}/> : <Menu size={18}/>}
                    </button>
                </div>

                <div className={`p-3 border-b ${borderColor}/50 shrink-0 bg-black ${!isSidebarOpen && 'hidden md:block'}`}>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className={`w-full py-2 bg-red-900/10 hover:bg-red-600 hover:text-white ${themeColor} border border-red-600/50 transition-all flex justify-center items-center gap-2 text-xs font-bold uppercase tracking-wider`}
                    >
                        <Plus size={14} /> New Live Bot
                    </button>
                </div>

                <div className={`flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-red-900 min-h-0 ${!isSidebarOpen && 'hidden md:block'}`}>
                    {bots.map(bot => (
                        <div 
                            key={bot.id}
                            onClick={() => { setSelectedBotId(bot.id); setIsSidebarOpen(false); setShowAnalysis(false); }}
                            className={`group relative p-3 border cursor-pointer transition-all ${hoverBg}
                                ${selectedBotId === bot.id 
                                    ? 'border-red-500 bg-red-900/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                                    : 'border-red-900/30 hover:border-red-500/50 text-gray-500'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className={`font-bold text-sm truncate pr-2 ${selectedBotId === bot.id ? 'text-red-400' : 'group-hover:text-red-300'}`}>
                                    {bot.name}
                                </div>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${bot.status === 'RUNNING' ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`} />
                            </div>
                            <div className="text-[10px] font-mono opacity-70 flex justify-between items-center">
                                <span className="truncate max-w-[80px]">{bot.pair}</span>
                                {bot.backtest_file && (
                                    <span className="text-red-600 text-[8px]">MC</span>
                                )}
                                <Trash2 size={12} className="hover:text-white transition-colors z-10" onClick={(e) => handleDeleteBot(e, bot.id)}/>
                            </div>
                        </div>
                    ))}
                    {bots.length === 0 && (
                        <div className="text-center py-10 text-xs text-gray-700">NO LIVE BOTS</div>
                    )}
                </div>
            </div>

            {/* ================================================= */}
            {/* [우측 대시보드]                                     */}
            {/* ================================================= */}
            <div className="flex-1 flex flex-col bg-black min-w-0 h-full overflow-hidden relative">
                
                {!selectedBotId ? (
                    <div className={`flex-1 flex flex-col items-center justify-center text-red-900/30 gap-4 p-4 text-center`}>
                        <Server size={48} strokeWidth={1} />
                        <span className="text-base tracking-widest uppercase">Select a bot to trade real money</span>
                    </div>
                ) : (
                    <>
                        {/* 상단 정보바 */}
                        <div className={`min-h-14 border-b ${borderColor}/50 flex flex-row items-center justify-between px-4 py-2 bg-black/50 backdrop-blur-sm z-10 gap-2 shrink-0`}>
                            <div className="overflow-hidden flex-1">
                                <div className="text-[9px] text-red-700 font-bold uppercase tracking-wider mb-0.5">Real-Time Market</div>
                                <h2 className={`text-base sm:text-lg font-bold ${themeColor} flex items-center gap-2 truncate`}>
                                    {selectedBot?.name} 
                                    <span className="text-[10px] font-normal text-gray-500 bg-red-900/10 px-1.5 border border-red-900/30 rounded hidden sm:inline-block">
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
                                            ? 'bg-red-500 text-black border-red-500' 
                                            : 'bg-red-900/20 text-red-500 border-red-900 hover:border-red-500'
                                    }`}
                                >
                                    <BarChart3 size={12} /> Risk
                                </button>

                                {isRunning ? (
                                    <button onClick={handleStop} className="bg-gray-800 text-gray-400 border border-gray-600 px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase flex items-center gap-1 hover:bg-gray-700">
                                        <Square size={10} fill="currentColor" /> Stop
                                    </button>
                                ) : (
                                    <button onClick={handleStart} className="bg-red-600 text-black border border-red-500 px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase flex items-center gap-1 hover:bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                                        <Play size={10} fill="currentColor" /> Start Live
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 스탯 카드 */}
                        <div className="p-3 sm:p-6 pb-0 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 shrink-0">
                            <StatCard 
                                title="Total Return" 
                                value={`${statusData?.total_roi || 0}%`} 
                                color={(statusData?.total_roi || 0) >= 0 ? "text-green-400" : "text-red-500"} 
                                borderColor={borderColor}
                            />
                            <StatCard 
                                title="Win / Loss" 
                                value={`${statusData?.win_count || 0} / ${statusData?.loss_count || 0}`} 
                                color="text-white" 
                                borderColor={borderColor}
                            />
                            <StatCard 
                                title="Trades" 
                                value={statusData?.total_trade_count || 0} 
                                color="text-red-400" 
                                borderColor={borderColor}
                            />
                            <StatCard 
                                title="Active" 
                                value={statusData?.active_trade_count || 0} 
                                color="text-yellow-500" 
                                borderColor={borderColor}
                            />
                        </div>

                        {/* ★ Risk 분석 섹션 (토글) */}
                        {showAnalysis && (
                            <div className="px-3 sm:px-6">
                                <LiveAnalysisSection 
                                    data={analysisData} 
                                    onClose={() => setShowAnalysis(false)}
                                />
                            </div>
                        )}

                        {/* 로그 테이블 */}
                        <div className="flex-1 p-3 sm:p-6 overflow-hidden flex flex-col min-h-0">
                            <div className={`flex items-center justify-between mb-2 border-b ${borderColor}/50 pb-2 shrink-0`}>
                                <h3 className={`text-red-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2`}>
                                    <FileText size={14}/> Live Logs
                                </h3>
                            </div>
                            
                            <div className={`flex-1 overflow-auto border ${borderColor}/30 bg-black scrollbar-thin scrollbar-thumb-red-900`}>
                                <table className="w-full text-left text-xs min-w-[350px]">
                                    <thead className="bg-red-900/10 text-red-500 sticky top-0 font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="p-2">Time</th>
                                            <th className="p-2">Type</th>
                                            <th className="p-2 text-right">Profit %</th>
                                            <th className="p-2 text-right">Profit $</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-red-900/20">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-red-900/5 transition-colors font-mono">
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
                                {logs.length === 0 && <div className="p-10 text-center text-gray-700 text-xs">NO LIVE TRADES</div>}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ================================================= */}
            {/* [모달] 봇 생성                                      */}
            {/* ================================================= */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-black border border-red-500 w-full max-w-sm shadow-[0_0_30px_rgba(239,68,68,0.2)] p-6 relative">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-red-700 hover:text-red-400">
                            <X size={20}/>
                        </button>
                        
                        <h2 className="text-lg font-bold text-red-500 mb-4 flex items-center gap-2">
                            <AlertTriangle size={20}/> DEPLOY LIVE BOT
                        </h2>
                        
                        <div className="bg-red-900/20 border border-red-900/50 p-3 mb-4 text-[10px] text-red-300">
                            ⚠️ CAUTION: This bot will use REAL FUNDS.<br/>
                            Ensure your strategy is thoroughly tested.
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] text-red-700 font-bold mb-1 uppercase">Bot Name</label>
                                <input 
                                    className={`w-full bg-black border ${borderColor} text-red-400 px-3 py-2 text-sm focus:border-red-500 outline-none`}
                                    placeholder="e.g. BTC Live Trader"
                                    value={newBotConfig.name}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, name: e.target.value})}
                                />
                            </div>

                            {/* 백테스트 선택 */}
                            <div>
                                <label className="block text-[10px] text-red-700 font-bold mb-1 uppercase">
                                    Link Backtest Result (Required for Risk Monitoring)
                                </label>
                                <select
                                    className={`w-full bg-black border ${borderColor} text-red-400 px-3 py-2 text-sm focus:border-red-500 outline-none`}
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
                                    Required for MDD threshold monitoring
                                </p>
                            </div>

                            <div>
                                <label className="block text-[10px] text-red-700 font-bold mb-1 uppercase">Strategy</label>
                                <input 
                                    className={`w-full bg-black border ${borderColor} text-red-400 px-3 py-2 text-sm focus:border-red-500 outline-none`}
                                    placeholder="e.g. MyStrategy"
                                    value={newBotConfig.strategy}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, strategy: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-red-700 font-bold mb-1 uppercase">Pair</label>
                                <input 
                                    className={`w-full bg-black border ${borderColor} text-red-400 px-3 py-2 text-sm focus:border-red-500 outline-none`}
                                    placeholder="e.g. BTC/USDT"
                                    value={newBotConfig.pair}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, pair: e.target.value})}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleCreateBot}
                            className="mt-6 w-full bg-red-600 hover:bg-red-500 text-black font-bold py-3 text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-900/20"
                        >
                            ⚠️ Confirm Live Deployment
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const StatCard = ({ title, value, color, borderColor }) => (
    <div className={`bg-black border ${borderColor}/30 p-2 sm:p-3 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{title}</div>
        <div className={`text-base sm:text-xl font-bold ${color} font-mono truncate`}>{value}</div>
    </div>
);

export default LiveTrading;