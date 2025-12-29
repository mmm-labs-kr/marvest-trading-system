import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Activity, Play, Square, Plus, Trash2, 
    Server, Cpu, FileText, X, Menu, AlertTriangle 
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000/paper"; // 백엔드 엔드포인트는 동일하게 사용

function LiveTrading() {
    // --- [State Definitions] ---
    const [bots, setBots] = useState([]);
    const [selectedBotId, setSelectedBotId] = useState(null);
    const [statusData, setStatusData] = useState(null);
    const [logs, setLogs] = useState([]);
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBotConfig, setNewBotConfig] = useState({ name: "", strategy: "", pair: "BTC/USDT" });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // --- [API Functions] ---
    
    // [중요] 봇 목록을 가져와서 'live' 모드인 것만 필터링합니다.
    const fetchBots = async () => {
        try { 
            const res = await axios.get(`${API_BASE}/bots`); 
            // ★ 핵심: Live 봇만 남김
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

    const handleCreateBot = async () => {
        if (!newBotConfig.name || !newBotConfig.strategy) return alert("빈칸을 확인해주세요.");
        try {
            // ★ 핵심: 생성 시 mode를 'live'로 고정
            await axios.post(`${API_BASE}/bots`, { ...newBotConfig, mode: "live" });
            alert("실전 투자 봇이 생성되었습니다.");
            setShowCreateModal(false);
            setNewBotConfig({ name: "", strategy: "", pair: "BTC/USDT" });
            fetchBots();
        } catch (e) { alert("생성 실패: " + e.message); }
    };

    const handleDeleteBot = async (e, botId) => {
        e.stopPropagation();
        if (!window.confirm("⚠️ 경고: 실전 봇을 삭제하시겠습니까? 거래 기록도 함께 삭제됩니다.")) return;
        try {
            await axios.delete(`${API_BASE}/bots/${botId}`);
            fetchBots();
            if (selectedBotId === botId) {
                setSelectedBotId(null);
                setStatusData(null);
            }
        } catch (e) { alert("삭제 실패: " + e.message); }
    };

    const handleStart = async () => {
        // ★ 핵심: 실전 투자 시작 전 강력한 경고창
        if (!window.confirm("⚠️ [경고] 정말로 실전 매매를 시작하시겠습니까?\n실제 자산이 사용되며 손실이 발생할 수 있습니다.")) return;
        
        try { await axios.post(`${API_BASE}/start`, { bot_id: selectedBotId }); fetchBotDetails(); fetchBots(); } 
        catch (e) { alert("실행 실패: " + (e.response?.data?.detail || e.message)); }
    };

    const handleStop = async () => {
        if (!window.confirm("매매를 중단하시겠습니까?")) return;
        try { await axios.post(`${API_BASE}/stop`, { bot_id: selectedBotId }); fetchBotDetails(); fetchBots(); } 
        catch (e) { alert("정지 실패: " + (e.response?.data?.detail || e.message)); }
    };

    // --- [Effects] ---
    useEffect(() => { fetchBots(); }, []);
    
    useEffect(() => {
        if (selectedBotId) {
            fetchBotDetails();
            const interval = setInterval(fetchBotDetails, 1000);
            return () => clearInterval(interval);
        }
    }, [selectedBotId]);

    const selectedBot = bots.find(b => b.id === selectedBotId);
    const isRunning = statusData?.status === "RUNNING";

    // --- [Theme Colors] ---
    // 실전 모드는 'Red' 계열을 사용하여 긴장감을 줍니다.
    const themeColor = "text-red-500";
    const borderColor = "border-red-900";
    const hoverBg = "hover:bg-red-900/10";
    const selectionColor = "selection:bg-red-500";

    return (
        <div className={`flex flex-col md:flex-row h-screen w-screen bg-black text-gray-300 font-mono overflow-hidden ${selectionColor} selection:text-white`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            
            <style>{`html, body, #root { margin: 0; padding: 0; height: 100%; overflow: hidden; }`}</style>

            {/* 좌측 사이드바 */}
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
                            onClick={() => { setSelectedBotId(bot.id); setIsSidebarOpen(false); }}
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
                                <span className="truncate max-w-[120px]">{bot.pair}</span>
                                <Trash2 size={12} className="hover:text-white transition-colors z-10" onClick={(e) => handleDeleteBot(e, bot.id)}/>
                            </div>
                        </div>
                    ))}

                    {bots.length === 0 && (
                        <div className="text-center py-10 text-xs text-gray-700">NO LIVE BOTS</div>
                    )}
                </div>
            </div>

            {/* 우측 대시보드 */}
            <div className="flex-1 flex flex-col bg-black min-w-0 h-full overflow-hidden relative">
                
                {!selectedBotId ? (
                    <div className={`flex-1 flex flex-col items-center justify-center text-red-900/30 gap-4 p-4 text-center`}>
                        <Server size={48} strokeWidth={1} />
                        <span className="text-base tracking-widest uppercase">Select a bot to trade real money</span>
                    </div>
                ) : (
                    <>
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
                                {isRunning ? (
                                    <button onClick={handleStop} className="bg-gray-800 text-gray-400 border border-gray-600 px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase flex items-center gap-1 hover:bg-gray-700">
                                        <Square size={10} fill="currentColor" /> Stop
                                    </button>
                                ) : (
                                    <button onClick={handleStart} className="bg-red-600 text-black border border-red-500 px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase flex items-center gap-1 hover:bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse">
                                        <Play size={10} fill="currentColor" /> Start Live
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-3 sm:p-6 pb-0 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 shrink-0">
                            <StatCard title="Total Return" value={`${statusData?.total_roi || 0}%`} color={(statusData?.total_roi || 0) >= 0 ? "text-red-400" : "text-blue-500"} borderColor={borderColor} />
                            <StatCard title="Win / Loss" value={`${statusData?.win_count || 0} / ${statusData?.loss_count || 0}`} color="text-white" borderColor={borderColor} />
                            <StatCard title="Trades" value={statusData?.total_trade_count || 0} color="text-red-400" borderColor={borderColor} />
                            <StatCard title="Active" value={statusData?.active_trade_count || 0} color="text-yellow-500" borderColor={borderColor} />
                        </div>

                        <div className="flex-1 p-3 sm:p-6 overflow-hidden flex flex-col min-h-0">
                            <div className={`flex items-center justify-between mb-2 border-b ${borderColor}/50 pb-2 shrink-0`}>
                                <h3 className={`text-red-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2`}>
                                    <FileText size={14}/> Live Logs
                                </h3>
                                <div className="text-[10px] text-gray-600 hidden sm:block">ID: {selectedBotId?.substring(0,8)}</div>
                            </div>
                            
                            <div className={`flex-1 overflow-auto border ${borderColor}/30 bg-black scrollbar-thin scrollbar-thumb-red-900`}>
                                <table className="w-full text-left text-xs min-w-[350px]">
                                    <thead className="bg-red-900/10 text-red-500 sticky top-0 font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="p-2 whitespace-nowrap">Time</th>
                                            <th className="p-2 whitespace-nowrap">Type</th>
                                            <th className="p-2 whitespace-nowrap text-right">Profit %</th>
                                            <th className="p-2 whitespace-nowrap text-right">Profit $</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-red-900/20">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-red-900/5 transition-colors font-mono">
                                                <td className="p-2 text-gray-500 whitespace-nowrap">{log.timestamp.substring(5, 16)}</td>
                                                <td className="p-2">
                                                    <span className={`px-1 py-0.5 text-[9px] border ${log.is_win ? 'border-red-600 text-red-400' : 'border-blue-600 text-blue-500'}`}>
                                                        {log.is_win ? "WIN" : "LOSS"}
                                                    </span>
                                                </td>
                                                <td className={`p-2 font-bold text-right ${log.profit_percent >= 0 ? 'text-red-400' : 'text-blue-500'}`}>
                                                    {log.profit_percent}%
                                                </td>
                                                <td className={`p-2 text-right ${log.profit_abs >= 0 ? 'text-red-400' : 'text-blue-500'}`}>
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

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-black border border-red-500 w-full max-w-xs shadow-[0_0_30px_rgba(239,68,68,0.2)] p-6 relative">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-red-700 hover:text-red-400"><X size={20}/></button>
                        
                        <h2 className="text-lg font-bold text-red-500 mb-4 flex items-center gap-2">
                            <AlertTriangle size={20}/> DEPLOY LIVE BOT
                        </h2>
                        
                        <div className="bg-red-900/20 border border-red-900/50 p-3 mb-4 text-[10px] text-red-300">
                            ⚠️ CAUTION: This bot will use REAL FUNDS. Ensure your strategy is tested.
                        </div>

                        <div className="space-y-3">
                            <input 
                                className={`w-full bg-black border ${borderColor} text-red-400 px-3 py-2 text-sm focus:border-red-500 outline-none placeholder-red-900/50`}
                                placeholder="Bot Name" value={newBotConfig.name} onChange={(e) => setNewBotConfig({...newBotConfig, name: e.target.value})} 
                            />
                            <input 
                                className={`w-full bg-black border ${borderColor} text-red-400 px-3 py-2 text-sm focus:border-red-500 outline-none placeholder-red-900/50`}
                                placeholder="Strategy File" value={newBotConfig.strategy} onChange={(e) => setNewBotConfig({...newBotConfig, strategy: e.target.value})} 
                            />
                            <input 
                                className={`w-full bg-black border ${borderColor} text-red-400 px-3 py-2 text-sm focus:border-red-500 outline-none placeholder-red-900/50`}
                                placeholder="Pair (e.g. BTC/USDT)" value={newBotConfig.pair} onChange={(e) => setNewBotConfig({...newBotConfig, pair: e.target.value})} 
                            />
                        </div>

                        <button 
                            onClick={handleCreateBot}
                            className="mt-6 w-full bg-red-600 hover:bg-red-500 text-black font-bold py-3 text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-900/20"
                        >
                            Confirm Live Deployment
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