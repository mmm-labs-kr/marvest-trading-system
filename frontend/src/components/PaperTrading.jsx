import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Terminal, Activity, Play, Square, Plus, Trash2, 
    Server, Cpu, FileText, X, Menu 
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000/paper";

function PaperTrading() {
    // --- [State Definitions] ---
    const [bots, setBots] = useState([]);
    const [selectedBotId, setSelectedBotId] = useState(null);
    const [statusData, setStatusData] = useState(null);
    const [logs, setLogs] = useState([]);
    
    // UI States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBotConfig, setNewBotConfig] = useState({ name: "", strategy: "", pair: "BTC/USDT" });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

    const handleCreateBot = async () => {
        if (!newBotConfig.name || !newBotConfig.strategy) return alert("빈칸을 확인해주세요.");
        try {
            await axios.post(`${API_BASE}/bots`, newBotConfig);
            setShowCreateModal(false);
            setNewBotConfig({ name: "", strategy: "", pair: "BTC/USDT" });
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
            }
        } catch (e) { alert("삭제 실패: " + e.message); }
    };

    const handleStart = async () => {
        try { await axios.post(`${API_BASE}/start`, { bot_id: selectedBotId }); fetchBotDetails(); fetchBots(); } 
        catch (e) { alert("실행 실패: " + (e.response?.data?.detail || e.message)); }
    };

    const handleStop = async () => {
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

    return (
        <div className="flex flex-col md:flex-row h-screen w-screen bg-black text-gray-300 font-mono overflow-hidden selection:bg-green-500 selection:text-black" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            
            {/* ▼▼▼ [핵심 수정] 브라우저 기본 마진 제거 스타일 주입 ▼▼▼ */}
            <style>{`
                html, body, #root {
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    overflow: hidden; /* 전체 화면 스크롤 방지 */
                }
            `}</style>

            {/* ================================================= */}
            {/* [좌측 사이드바] Bot Registry                        */}
            {/* ================================================= */}
            <div className={`
                flex flex-col border-b md:border-b-0 md:border-r border-green-900/50 bg-black z-20 transition-all duration-300
                w-full md:w-[280px] shrink-0
                ${isSidebarOpen ? 'h-[50vh] md:h-full' : 'h-14 md:h-full'} 
            `}>
                {/* 헤더 */}
                <div className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-green-900/50 shrink-0 bg-black">
                    <div className="flex items-center gap-2 text-green-500 font-bold tracking-wider">
                        <Terminal size={18} />
                        <span className="text-sm md:text-base">BOT_REGISTRY</span>
                    </div>
                    {/* 모바일용 토글 버튼 */}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden text-green-700 p-2">
                        {isSidebarOpen ? <X size={18}/> : <Menu size={18}/>}
                    </button>
                </div>

                {/* 생성 버튼 (항상 보임) */}
                <div className={`p-3 border-b border-green-900/50 shrink-0 bg-black ${!isSidebarOpen && 'hidden md:block'}`}>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="w-full py-2 bg-green-900/10 hover:bg-green-500 hover:text-black text-green-500 border border-green-600/50 transition-all flex justify-center items-center gap-2 text-xs font-bold uppercase tracking-wider"
                    >
                        <Plus size={14} /> New Bot
                    </button>
                </div>

                {/* 봇 리스트 (스크롤 영역) */}
                {/* min-h-0: Flex 컨테이너 내에서 스크롤이 정상 작동하도록 함 */}
                <div className={`flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-green-900 min-h-0 ${!isSidebarOpen && 'hidden md:block'}`}>
                    {bots.map(bot => (
                        <div 
                            key={bot.id}
                            onClick={() => { setSelectedBotId(bot.id); setIsSidebarOpen(false); }}
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
                                <span className="truncate max-w-[120px]">{bot.pair}</span>
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

                        {/* 2. 스탯 카드 (Grid) */}
                        <div className="p-3 sm:p-6 pb-0 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 shrink-0">
                            <StatCard title="Total Return" value={`${statusData?.total_roi || 0}%`} color={(statusData?.total_roi || 0) >= 0 ? "text-green-400" : "text-red-500"} />
                            <StatCard title="Win / Loss" value={`${statusData?.win_count || 0} / ${statusData?.loss_count || 0}`} color="text-white" />
                            <StatCard title="Total Trades" value={statusData?.total_trade_count || 0} color="text-blue-400" />
                            <StatCard title="Active Positions" value={statusData?.active_trade_count || 0} color="text-yellow-400" />
                        </div>

                        {/* 3. 로그 테이블 */}
                        {/* min-h-0: 여기도 중요합니다. 부모 높이를 넘어가지 않게 함 */}
                        <div className="flex-1 p-3 sm:p-6 overflow-hidden flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-2 border-b border-green-900/30 pb-2 shrink-0">
                                <h3 className="text-green-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={14}/> Execution Logs
                                </h3>
                                <div className="text-[10px] text-gray-600 hidden sm:block">ID: {selectedBotId?.substring(0,8)}...</div>
                            </div>
                            
                            <div className="flex-1 overflow-auto border border-green-900/30 bg-black scrollbar-thin scrollbar-thumb-green-900">
                                <table className="w-full text-left text-xs min-w-[350px]">
                                    <thead className="bg-green-900/10 text-green-500 sticky top-0 font-bold uppercase text-[10px]">
                                        <tr>
                                            <th className="p-2 whitespace-nowrap">Time</th>
                                            <th className="p-2 whitespace-nowrap">Type</th>
                                            <th className="p-2 whitespace-nowrap text-right">Profit %</th>
                                            <th className="p-2 whitespace-nowrap text-right">Profit $</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-green-900/20">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-green-900/5 transition-colors font-mono">
                                                <td className="p-2 text-gray-500 whitespace-nowrap">{log.timestamp.substring(5, 16)}</td>
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
            {/* [모달] 봇 생성 팝업                                */}
            {/* ================================================= */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-black border border-green-500 w-full max-w-xs shadow-[0_0_30px_rgba(34,197,94,0.2)] p-6 relative">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-green-700 hover:text-green-400"><X size={20}/></button>
                        
                        <h2 className="text-lg font-bold text-green-500 mb-4 flex items-center gap-2">
                            <Cpu size={20}/> DEPLOY NEW UNIT
                        </h2>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] text-green-700 font-bold mb-1 uppercase">Unit Name</label>
                                <input 
                                    className="w-full bg-black border border-green-900 text-green-400 px-3 py-2 text-sm focus:border-green-500 outline-none placeholder-green-900/50"
                                    placeholder="e.g. BTC Scalper"
                                    value={newBotConfig.name}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-green-700 font-bold mb-1 uppercase">Strategy File</label>
                                <input 
                                    className="w-full bg-black border border-green-900 text-green-400 px-3 py-2 text-sm focus:border-green-500 outline-none placeholder-green-900/50"
                                    placeholder="e.g. MyStrategy"
                                    value={newBotConfig.strategy}
                                    onChange={(e) => setNewBotConfig({...newBotConfig, strategy: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-green-700 font-bold mb-1 uppercase">Target Pair</label>
                                <input 
                                    className="w-full bg-black border border-green-900 text-green-400 px-3 py-2 text-sm focus:border-green-500 outline-none placeholder-green-900/50"
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

// 미니 컴포넌트: 스탯 카드
const StatCard = ({ title, value, color }) => (
    <div className="bg-black border border-green-900/30 p-2 sm:p-3 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
        <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{title}</div>
        <div className={`text-base sm:text-xl font-bold ${color} font-mono truncate`}>{value}</div>
    </div>
);

export default PaperTrading;