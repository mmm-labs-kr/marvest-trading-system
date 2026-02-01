import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Activity, Play, Square, Plus, Trash2, 
    Server, FileText, X, Menu, AlertTriangle,
    BarChart3, Shield, Award, TrendingUp
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    Area, ComposedChart
} from 'recharts';

const API_BASE = "http://127.0.0.1:8000/trading";

// ============================================
// [컴포넌트] 점수 게이지바 (백테스트와 동일 스타일)
// ============================================
const ScoreProgressBar = ({ name, value, score, full_mark, target }) => {
    const percentage = full_mark > 0 ? Math.min((score / full_mark) * 100, 100) : 0;
    
    const getBarColor = (pct) => {
        if (pct >= 70) return 'bg-green-500';
        if (pct >= 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="mb-4 last:mb-0">
            <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    {name}
                </span>
                <div className="text-right">
                    <span className="text-xs text-white font-mono mr-2 font-bold">{value}</span>
                    <span className="text-[10px] text-gray-500">
                        ({score.toFixed(1)} / {full_mark})
                    </span>
                </div>
            </div>
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full ${getBarColor(percentage)} transition-all duration-500 ease-out shadow-[0_0_10px_rgba(34,197,94,0.3)]`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="text-[9px] text-gray-600 mt-1 text-right font-mono">
                Target: {target}
            </div>
        </div>
    );
};

// ============================================
// [컴포넌트] 필터 배지
// ============================================
const FilterBadge = ({ label, value, pass, target }) => (
    <div className={`border ${pass ? 'border-green-900 bg-green-900/10' : 'border-red-900 bg-red-900/10'} rounded p-2 flex flex-col items-center justify-center text-center`}>
        <span className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">{label}</span>
        <span className={`text-xs font-bold font-mono ${pass ? 'text-green-400' : 'text-red-400'}`}>{value}</span>
        <span className="text-[8px] text-gray-600 mt-0.5">Target: {target}</span>
    </div>
);

// ============================================
// [컴포넌트] 점수 상세 대시보드 (백테스팅 분석 상세)
// ============================================
const ScoreDashboard = ({ scoreData }) => {
    if (!scoreData || !scoreData.details) return null;
    
    const { phase1, phase2, filters } = scoreData.details;

    return (
        <div className="border border-green-900/50 bg-black/80 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center mb-6 border-b border-green-900/30 pb-2">
                <h3 className="text-green-500 font-bold text-sm flex items-center gap-2 uppercase tracking-widest">
                    <Award size={16} /> Strategy Score Breakdown
                </h3>
            </div>

            {/* Phase 1 & 2 Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                {/* Phase 1: Risk */}
                <div className="bg-black border border-green-900/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold text-gray-300 flex items-center gap-2 uppercase">
                            <Shield size={14} className="text-blue-500" /> Phase 1: Risk Management
                        </h4>
                        <span className="text-sm font-mono text-blue-400 font-bold">
                            {(Number(phase1?.score)).toFixed(1)} / 66.7
                        </span>
                    </div>
                    <div className="space-y-3">
                        {phase1?.items?.map((item, idx) => (
                            <ScoreProgressBar key={idx} {...item} />
                        ))}
                    </div>
                </div>

                {/* Phase 2: Performance */}
                <div className="bg-black border border-green-900/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-bold text-gray-300 flex items-center gap-2 uppercase">
                            <BarChart3 size={14} className="text-purple-500" /> Phase 2: Performance
                        </h4>
                        <span className="text-sm font-mono text-purple-400 font-bold">
                            {(Number(phase2?.score)).toFixed(1)} / 33.3
                        </span>
                    </div>
                    <div className="space-y-3">
                        {phase2?.items?.map((item, idx) => (
                            <ScoreProgressBar key={idx} {...item} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-2">
                 <FilterBadge label="Min Trades" value={filters?.trades?.value} pass={filters?.trades?.pass} target=">150" />
                 <FilterBadge label="Expectancy" value={filters?.expectancy?.value} pass={filters?.expectancy?.pass} target=">0.5%" />
                 <FilterBadge label="Monte Carlo" value={filters?.monte_carlo?.value} pass={filters?.monte_carlo?.pass} target="0% Ruin" />
            </div>
        </div>
    );
};

// ============================================
// [컴포넌트] 수익 곡선 및 신뢰구간 분석 (기존 그래프)
// ============================================
const PaperAnalysisSection = ({ data }) => {
    if (!data) return null;
    
    const { equity_curve, analysis } = data;
    
    const equityChartData = equity_curve?.map((e) => ({
        trade_num: e.trade_num,
        equity: e.equity,
        profit_pct: e.profit_pct
    })) || [];

    const confidenceBreach = analysis?.confidence_breach;
    const isBreach = confidenceBreach?.is_breach;

    return (
        <div className="border border-green-900/50 bg-black/80 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-green-500 font-bold text-sm flex items-center gap-2 uppercase tracking-widest">
                    <Activity size={16} /> Equity Curve & Confidence Interval
                </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-black border border-green-900/30 rounded-lg p-4">
                    {equityChartData.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={equityChartData}>
                                    <defs>
                                        <linearGradient id="equityGradientPaper" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="trade_num" stroke="#374151" tick={{ fill: '#6B7280', fontSize: 9 }} />
                                    <YAxis stroke="#374151" tick={{ fill: '#6B7280', fontSize: 9 }} domain={['auto', 'auto']} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #22c55e', fontSize: '10px' }}
                                    />
                                    <Area type="monotone" dataKey="equity" stroke="none" fill="url(#equityGradientPaper)" />
                                    <Line type="monotone" dataKey="equity" stroke="#22c55e" strokeWidth={2} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-600 text-xs">
                            No trades data available
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="bg-black border border-green-900/30 rounded-lg p-4">
                        <h4 className="text-xs text-gray-500 uppercase mb-2">Confidence Interval Status</h4>
                        <div className={`text-sm font-bold ${isBreach ? 'text-red-500' : 'text-green-500'}`}>
                            {isBreach ? '⚠️ DEVIATION DETECTED' : '✅ WITHIN EXPECTED RANGE'}
                        </div>
                        {isBreach && (
                            <div className="text-[10px] text-gray-400 mt-1">
                                Current equity is {confidenceBreach.breach_type} the 95% confidence interval.
                            </div>
                        )}
                        {!isBreach && (
                            <div className="text-[10px] text-gray-400 mt-1">
                                The strategy is performing within the statistically expected range based on Monte Carlo simulations.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// [메인 페이지] PaperTrading
// ============================================
function PaperTrading() {
    const [bots, setBots] = useState([]);
    const [selectedBotId, setSelectedBotId] = useState(null);
    const [statusData, setStatusData] = useState(null);
    const [scoreData, setScoreData] = useState(null);
    const [logs, setLogs] = useState([]);
    const [analysisData, setAnalysisData] = useState(null);
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBotConfig, setNewBotConfig] = useState({ 
        name: "", 
        strategy: "", 
        pair: "BTC/USDT",
        backtest_file: ""
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [backtestOptions, setBacktestOptions] = useState([]);

    const fetchBots = async () => {
        try { 
            const res = await axios.get(`${API_BASE}/bots`); 
            const paperBots = res.data.filter(bot => bot.mode === 'paper');
            setBots(paperBots); 
        } catch (e) { console.error(e); }
    };

    const fetchBotDetails = async () => {
        if (!selectedBotId) return;
        try {
            const statusRes = await axios.get(`${API_BASE}/status?bot_id=${selectedBotId}`);
            const logsRes = await axios.get(`${API_BASE}/trades?bot_id=${selectedBotId}`);
            const scoreRes = await axios.get(`${API_BASE}/score/${selectedBotId}`);
            
            setStatusData(statusRes.data);
            setLogs(logsRes.data);
            setScoreData(scoreRes.data.score);
        } catch (e) { console.error(e); }
    };

    const fetchAnalysis = async () => {
        if (!selectedBotId) return;
        try {
            const res = await axios.get(`${API_BASE}/analysis/${selectedBotId}`);
            setAnalysisData(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchBacktestOptions = async () => {
        try {
            const res = await axios.get(`${API_BASE}/backtest-options`);
            setBacktestOptions(res.data);
        } catch (e) { console.error(e); }
    };

    const handleCreateBot = async () => {
        if (!newBotConfig.name || !newBotConfig.strategy) return alert("Check fields");
        try {
            await axios.post(`${API_BASE}/bots`, { ...newBotConfig, mode: "paper" });
            setShowCreateModal(false);
            setNewBotConfig({ name: "", strategy: "", pair: "BTC/USDT", backtest_file: "" });
            fetchBots();
        } catch (e) { alert("Failed: " + e.message); }
    };

    const handleDeleteBot = async (e, botId) => {
        e.stopPropagation();
        if (!window.confirm("Delete this bot?")) return;
        try {
            await axios.delete(`${API_BASE}/bots/${botId}`);
            fetchBots();
            if (selectedBotId === botId) {
                setSelectedBotId(null);
                setStatusData(null);
                setScoreData(null);
                setAnalysisData(null);
                setShowAnalysis(false);
            }
        } catch (e) { alert("Failed: " + e.message); }
    };

    const handleStart = async () => {
        try { 
            await axios.post(`${API_BASE}/start`, { bot_id: selectedBotId }); 
            fetchBotDetails(); 
            fetchBots(); 
        } catch (e) { alert("Start failed: " + e.message); }
    };

    const handleStop = async () => {
        try { 
            await axios.post(`${API_BASE}/stop`, { bot_id: selectedBotId }); 
            fetchBotDetails(); 
            fetchBots(); 
        } catch (e) { alert("Stop failed: " + e.message); }
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

    const themeColor = "text-green-500";
    const borderColor = "border-green-900";
    const hoverBg = "hover:bg-green-900/10";

    const getGradeColor = (grade) => {
        const colors = {
            'S': 'text-purple-400',
            'A': 'text-green-400',
            'B': 'text-blue-400',
            'C': 'text-yellow-400',
            'Fail': 'text-red-400'
        };
        return colors[grade] || 'text-gray-400';
    };

    return (
        <div className="flex flex-col md:flex-row h-screen w-screen bg-black text-gray-300 font-mono overflow-hidden selection:bg-green-500 selection:text-black" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            
            <div className={`
                flex flex-col border-b md:border-b-0 md:border-r ${borderColor}/50 bg-black z-20 transition-all duration-300
                w-full md:w-[280px] shrink-0
                ${isSidebarOpen ? 'h-[50vh] md:h-full' : 'h-14 md:h-full'} 
            `}>
                <div className={`h-14 flex items-center justify-between px-4 sm:px-6 border-b ${borderColor}/50 shrink-0 bg-black`}>
                    <div className={`flex items-center gap-2 ${themeColor} font-bold tracking-wider`}>
                        <Activity size={18} />
                        <span className="text-sm md:text-base">PAPER_TRADING</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-green-700 p-2">
                        {isSidebarOpen ? <X size={18}/> : <Menu size={18}/>}
                    </button>
                </div>

                <div className={`p-3 border-b ${borderColor}/50 shrink-0 bg-black ${!isSidebarOpen && 'hidden md:block'}`}>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className={`w-full py-2 bg-green-900/10 hover:bg-green-600 hover:text-white ${themeColor} border border-green-600/50 transition-all flex justify-center items-center gap-2 text-xs font-bold uppercase tracking-wider`}
                    >
                        <Plus size={14} /> New Paper Bot
                    </button>
                </div>

                <div className={`flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-green-900 min-h-0 ${!isSidebarOpen && 'hidden md:block'}`}>
                    {bots.map(bot => (
                        <div 
                            key={bot.id}
                            onClick={() => { setSelectedBotId(bot.id); setIsSidebarOpen(false); setShowAnalysis(false); }}
                            className={`group relative p-3 border cursor-pointer transition-all ${hoverBg}
                                ${selectedBotId === bot.id 
                                    ? 'border-green-500 bg-green-900/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                                    : 'border-green-900/30 hover:border-green-500/50 text-gray-500'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className={`font-bold text-sm truncate pr-2 ${selectedBotId === bot.id ? 'text-green-400' : 'group-hover:text-green-300'}`}>
                                    {bot.name}
                                </div>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${bot.status === 'RUNNING' ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`} />
                            </div>
                            <div className="text-[10px] font-mono opacity-70 flex justify-between items-center">
                                <span className="truncate max-w-[80px]">{bot.pair}</span>
                                {bot.backtest_file && (
                                    <span className="text-green-600 text-[8px]">MC</span>
                                )}
                                <Trash2 size={12} className="hover:text-white transition-colors z-10" onClick={(e) => handleDeleteBot(e, bot.id)}/>
                            </div>
                        </div>
                    ))}
                    {bots.length === 0 && (
                        <div className="text-center py-10 text-xs text-gray-700">NO PAPER BOTS</div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-black min-w-0 h-full overflow-hidden relative">
                {!selectedBotId ? (
                    <div className={`flex-1 flex flex-col items-center justify-center text-green-900/30 gap-4 p-4 text-center`}>
                        <Server size={48} strokeWidth={1} />
                        <span className="text-base tracking-widest uppercase">Select a bot to simulate trading</span>
                    </div>
                ) : (
                    <>
                        <div className={`min-h-14 border-b ${borderColor}/50 flex flex-row items-center justify-between px-4 py-2 bg-black/50 backdrop-blur-sm z-10 gap-2 shrink-0`}>
                            <div className="overflow-hidden flex-1">
                                <div className="text-[9px] text-green-700 font-bold uppercase tracking-wider mb-0.5">Simulation Market</div>
                                <h2 className={`text-base sm:text-lg font-bold ${themeColor} flex items-center gap-2 truncate`}>
                                    {selectedBot?.name} 
                                    <span className="text-[10px] font-normal text-gray-500 bg-green-900/10 px-1.5 border border-green-900/30 rounded hidden sm:inline-block">
                                        {selectedBot?.pair}
                                    </span>
                                </h2>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                                <button 
                                    onClick={() => setShowAnalysis(!showAnalysis)}
                                    className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase flex items-center gap-1 border transition-all ${
                                        showAnalysis 
                                            ? 'bg-green-500 text-black border-green-500' 
                                            : 'bg-green-900/20 text-green-500 border-green-900 hover:border-green-500'
                                    }`}
                                >
                                    <BarChart3 size={12} /> Analysis
                                </button>

                                {isRunning ? (
                                    <button onClick={handleStop} className="bg-gray-800 text-gray-400 border border-gray-600 px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase flex items-center gap-1 hover:bg-gray-700">
                                        <Square size={10} fill="currentColor" /> Stop
                                    </button>
                                ) : (
                                    <button onClick={handleStart} className="bg-green-600 text-black border border-green-500 px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase flex items-center gap-1 hover:bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                                        <Play size={10} fill="currentColor" /> Start Sim
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-green-900 p-3 sm:p-6 space-y-4">
                            
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 shrink-0">
                                 <div className={`bg-black border ${borderColor}/30 p-2 sm:p-3 shadow-[0_0_10px_rgba(0,0,0,0.5)] flex flex-col justify-between`}>
                                    <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Award size={10} /> Score
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <div className={`text-2xl sm:text-3xl font-black font-mono leading-none ${getGradeColor(scoreData?.grade)}`}>
                                            {scoreData ? scoreData.grade : '-'}
                                        </div>
                                        <div className="text-xs font-bold text-gray-500 mb-1">
                                            {scoreData ? scoreData.total_score : 0}
                                        </div>
                                    </div>
                                </div>
                                
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
                                    color="text-green-400" 
                                    borderColor={borderColor}
                                />
                                <StatCard 
                                    title="Active" 
                                    value={statusData?.active_trade_count || 0} 
                                    color="text-yellow-500" 
                                    borderColor={borderColor}
                                />
                            </div>

                            {/* Analysis 섹션 (Score 상세 + 그래프) */}
                            {showAnalysis && (
                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                    {scoreData && (
                                        <ScoreDashboard scoreData={scoreData} />
                                    )}
                                    {analysisData && (
                                        <PaperAnalysisSection data={analysisData} />
                                    )}
                                </div>
                            )}

                            <div className="flex-1 min-h-[300px] flex flex-col">
                                <div className={`flex items-center justify-between mb-2 border-b ${borderColor}/50 pb-2 shrink-0`}>
                                    <h3 className={`text-green-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2`}>
                                        <FileText size={14}/> Paper Logs
                                    </h3>
                                </div>
                                
                                <div className={`flex-1 border ${borderColor}/30 bg-black rounded overflow-hidden flex flex-col`}>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs min-w-[350px]">
                                            <thead className="bg-green-900/10 text-green-500 font-bold uppercase text-[10px]">
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
                                    </div>
                                    {logs.length === 0 && <div className="p-10 text-center text-gray-700 text-xs">NO TRADES YET</div>}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-black border border-green-500 w-full max-w-sm shadow-[0_0_30px_rgba(34,197,94,0.2)] p-6 relative">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-green-700 hover:text-green-400">
                            <X size={20}/>
                        </button>
                        
                        <h2 className="text-lg font-bold text-green-500 mb-4 flex items-center gap-2">
                            <Server size={20}/> DEPLOY PAPER BOT
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] text-green-700 font-bold mb-1 uppercase">Bot Name</label>
                                <input 
                                    className={`w-full bg-black border ${borderColor} text-green-400 px-3 py-2 text-sm focus:border-green-500 outline-none`}
                                    placeholder="e.g. Test Bot 01"
                                    value={newBotConfig.name}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, name: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-green-700 font-bold mb-1 uppercase">
                                    Link Backtest (Optional)
                                </label>
                                <select
                                    className={`w-full bg-black border ${borderColor} text-green-400 px-3 py-2 text-sm focus:border-green-500 outline-none`}
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
                                    <option value="">-- No Link --</option>
                                    {backtestOptions.map(opt => (
                                        <option key={opt.filename} value={opt.filename}>
                                            {opt.strategy} ({opt.date})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] text-green-700 font-bold mb-1 uppercase">Strategy</label>
                                <input 
                                    className={`w-full bg-black border ${borderColor} text-green-400 px-3 py-2 text-sm focus:border-green-500 outline-none`}
                                    placeholder="e.g. MyStrategy"
                                    value={newBotConfig.strategy}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, strategy: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] text-green-700 font-bold mb-1 uppercase">Pair</label>
                                <input 
                                    className={`w-full bg-black border ${borderColor} text-green-400 px-3 py-2 text-sm focus:border-green-500 outline-none`}
                                    placeholder="e.g. BTC/USDT"
                                    value={newBotConfig.pair}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, pair: e.target.value})}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleCreateBot}
                            className="mt-6 w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 text-xs uppercase tracking-wider transition-all shadow-lg shadow-green-900/20"
                        >
                            Create Bot
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

export default PaperTrading;