import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Activity, Play, Square, Plus, Trash2, 
    Server, Cpu, FileText, X, Menu, BarChart3, AlertTriangle,
    CheckCircle2, XCircle, ShieldAlert
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    ReferenceLine 
} from 'recharts';

const API_BASE = "/api/trading";

// ============================================
// 분석 섹션 컴포넌트 (실전투자: Rolling MDD 추적)
// ============================================
const LiveAnalysisSection = ({ data, onClose }) => {
    if (!data) return null;
    
    const { equity_curve, analysis } = data;
    const { rolling_mdd_30d, mdd_breach, status } = analysis;

    const statusStyles = {
        'NORMAL': 'text-stealth-accent border-stealth-accent/30 bg-stealth-accent/5',
        'DANGER': 'text-red-400 border-red-500/30 bg-red-500/5'
    };

    return (
        <div className="glass-card p-6 mt-6 animate-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded text-white">
                        <ShieldAlert size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">실전 리스크 모니터링</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">최근 30일 Rolling MDD 및 한계점 추적</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`stealth-badge ${statusStyles[status || 'NORMAL']}`}>
                        {status || 'N/A'}
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* 메인 차트 (Equity Curve) */}
            <div className="h-64 mb-8 bg-black/40 rounded border border-white/5 p-4 shadow-inner">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={equity_curve}>
                        <XAxis dataKey="trade_num" hide />
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
                                color: '#fff'
                            }}
                            formatter={(value) => [`$${value?.toLocaleString()}`, "현재 자산"]}
                        />
                        <Line type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* 리스크 지표 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-white/[0.02] border border-stealth-border rounded">
                    <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-2">현재 Rolling MDD</span>
                    <div className={`text-2xl font-black font-mono ${mdd_breach?.is_breach ? 'text-red-500' : 'text-white'}`}>
                        {rolling_mdd_30d}%
                    </div>
                </div>
                <div className="p-5 bg-white/[0.02] border border-stealth-border rounded">
                    <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-2">허용 한계치 (MC Worst)</span>
                    <div className="text-2xl font-black font-mono text-slate-400">
                        {mdd_breach?.threshold?.toFixed(2)}%
                    </div>
                </div>
                <div className={`p-5 rounded border flex flex-col justify-center items-center text-center ${
                    mdd_breach?.is_breach ? 'border-red-500/50 bg-red-500/5 animate-pulse' : 'border-stealth-border bg-white/[0.02]'
                }`}>
                    <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1.5">시스템 무결성</span>
                    <div className={`text-sm font-black flex items-center gap-2 ${
                        mdd_breach?.is_breach ? 'text-red-500' : 'text-stealth-accent'
                    }`}>
                        {mdd_breach?.is_breach ? <><AlertTriangle size={14}/> 한계 돌파 (위험)</> : <><CheckCircle2 size={14}/> 정상 작동 중</>}
                    </div>
                </div>
            </div>

            {mdd_breach?.is_breach && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] text-red-400 font-bold leading-relaxed">
                    ⚠️ 최근 낙폭이 몬테카를로 시뮬레이션의 최악의 시나리오(Worst 5%)를 초과했습니다. 즉시 매매 로직을 점검하고 운용 중단을 검토하십시오.
                </div>
            )}
        </div>
    );
};

// ============================================
// 메인 컴포넌트
// ============================================
function LiveTrading() {
    const [bots, setBots] = useState([]);
    const [selectedBotId, setSelectedBotId] = useState(null);
    const [statusData, setStatusData] = useState(null);
    const [logs, setLogs] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBotConfig, setNewBotConfig] = useState({ 
        name: "", strategy: "", pair: "BTC/USDT", mode: "live", backtest_file: "" 
    });
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [backtestOptions, setBacktestOptions] = useState([]);

    const fetchBots = async () => {
        try { 
            const res = await axios.get(`${API_BASE}/bots`);
            setBots(res.data.filter(bot => bot.mode === 'live'));
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
            setNewBotConfig({ name: "", strategy: "", pair: "BTC/USDT", mode: "live", backtest_file: "" });
            fetchBots();
        } catch (e) { alert("생성 실패: " + e.message); }
    };

    const handleDeleteBot = async (e, botId) => {
        e.stopPropagation();
        if (!window.confirm("정말 이 봇을 삭제하시겠습니까? 실전 투자 데이터가 유실됩니다.")) return;
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
                        className="cyber-button w-full flex items-center justify-center gap-2 text-[11px] py-2.5 bg-stealth-accent text-black border-stealth-accent hover:bg-white hover:border-white"
                    >
                        <Plus size={14} strokeWidth={3} /> 실전 봇 신규 가동
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {bots.map(bot => (
                        <div 
                            key={bot.id}
                            onClick={() => { setSelectedBotId(bot.id); setShowAnalysis(false); }}
                            className={`group p-4 rounded-lg border cursor-pointer transition-all ${
                                selectedBotId === bot.id 
                                    ? 'border-stealth-accent bg-stealth-accent/5 shadow-lg' 
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
                                <Trash2 size={12} className="hover:text-red-500 transition-colors" onClick={(e) => handleDeleteBot(e, bot.id)}/>
                            </div>
                        </div>
                    ))}
                    {bots.length === 0 && (
                        <div className="text-center py-20 text-[10px] font-black text-slate-700 uppercase tracking-widest font-mono">NO_LIVE_NODES_ACTIVE</div>
                    )}
                </div>
            </div>

            {/* [메인] 대시보드 */}
            <div className="flex-1 flex flex-col min-w-0 bg-stealth-bg overflow-auto">
                {!selectedBotId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-6">
                        <Server size={48} strokeWidth={1} className="opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">가동 중인 실전 노드를 선택하세요</span>
                    </div>
                ) : (
                    <div className="p-8 space-y-8 max-w-6xl w-full mx-auto">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-stealth-border pb-8">
                            <div>
                                <div className="flex items-center gap-2 text-[9px] font-black text-red-500/70 uppercase tracking-[0.3em] mb-2">
                                    <ShieldAlert size={12} /> Live_Production_Node: {selectedBotId}
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
                                    <BarChart3 size={14} /> 리스크 분석
                                </button>

                                {isRunning ? (
                                    <button onClick={handleStop} className="bg-red-500/10 text-red-500 border border-red-500/30 px-5 py-2 text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all">
                                        <Square size={12} fill="currentColor" /> 노드 중단
                                    </button>
                                ) : (
                                    <button onClick={handleStart} className="cyber-button px-5 py-2 text-[10px] flex items-center gap-2">
                                        <Play size={12} fill="currentColor" /> 노드 가동
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="실전 수익률" value={`${statusData?.total_roi || 0}%`} color={(statusData?.total_roi || 0) >= 0 ? "text-stealth-accent" : "text-red-500"} />
                            <StatCard title="승리 횟수" value={`${statusData?.win_count || 0}회`} color="text-white" />
                            <StatCard title="패배 횟수" value={`${statusData?.loss_count || 0}회`} color="text-slate-500" />
                            <StatCard title="미청산 포지션" value={`${statusData?.active_trade_count || 0}개`} color="text-amber-400" />
                        </div>

                        {showAnalysis && (
                            <LiveAnalysisSection 
                                data={analysisData} 
                                onClose={() => setShowAnalysis(false)}
                            />
                        )}

                        <div className="glass-card flex flex-col h-[400px]">
                            <div className="p-5 border-b border-stealth-border bg-white/[0.01] flex items-center gap-3">
                                <FileText size={16} className="text-slate-500" />
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">실시간 체결 로그</h3>
                            </div>
                            <div className="flex-1 overflow-auto bg-black/20">
                                <table className="w-full text-left">
                                    <thead className="text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 sticky top-0 bg-[#1a1a1a]">
                                        <tr>
                                            <th className="p-4">시간</th>
                                            <th className="p-4">유형</th>
                                            <th className="p-4 text-right">수익률(%)</th>
                                            <th className="p-4 text-right">실현손익($)</th>
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
                                    <div className="p-20 text-center text-slate-700 text-[10px] font-black uppercase tracking-widest">체결된 매매 기록이 없습니다</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* [모달] 실전 봇 생성 */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="glass-card w-full max-w-md p-10 border-red-500/20 shadow-2xl">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                                <ShieldAlert size={18} className="text-red-500" /> 실전 투자 유닛 배치
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-600 hover:text-white transition-colors">
                                <X size={24}/>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg mb-6">
                                <p className="text-[10px] text-red-400 font-bold leading-relaxed uppercase tracking-tight">
                                    주의: 실제 자산이 거래소 API를 통해 운영됩니다. 전략 검증이 완료되었는지 반드시 재확인하십시오.
                                </p>
                            </div>

                            <div>
                                <label className="block text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2.5">봇 프로필 이름</label>
                                <input 
                                    className="cyber-input w-full"
                                    placeholder="예: 실전_바이낸스_01"
                                    value={newBotConfig.name}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, name: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2.5">검증 데이터 연결 (MC)</label>
                                <select
                                    className="cyber-input w-full appearance-none cursor-pointer border-red-500/30 focus:border-red-500"
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
                                <label className="block text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2.5">전략 클래스</label>
                                <input 
                                    className="cyber-input w-full font-mono"
                                    placeholder="예: ProStrategy_v1"
                                    value={newBotConfig.strategy}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, strategy: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2.5">타겟 페어</label>
                                <input 
                                    className="cyber-input w-full font-mono"
                                    placeholder="예: ETH/USDT"
                                    value={newBotConfig.pair}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, pair: e.target.value})}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleCreateBot}
                            className="mt-10 w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded text-xs tracking-[0.2em] transition-all shadow-lg"
                        >
                            실전 환경 배치
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

export default LiveTrading;
