import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Play, Square, Activity, TrendingUp, RefreshCw, Layers, LayoutDashboard, Terminal } from 'lucide-react';

function PaperTrading() {
    const [statusData, setStatusData] = useState(null);
    const [logs, setLogs] = useState([]);
    const [strategy, setStrategy] = useState("MyStrategy");
    const [pair, setPair] = useState("BTC/USDT");

    // --- API 호출 함수들 ---
    const fetchStatus = async () => {
        try {
            // [수정] 전략 이름을 쿼리 파라미터로 전달
            const res = await axios.get(`http://127.0.0.1:8000/paper/status?strategy=${strategy}`);
            setStatusData(res.data);
        } catch (error) { console.error(error); }
    };

    const fetchLogs = async () => {
        try {
            // [수정] 전략 이름을 쿼리 파라미터로 전달
            const res = await axios.get(`http://127.0.0.1:8000/paper/trades?strategy=${strategy}`);
            setLogs(res.data);
        } catch (error) { console.error(error); }
    };

    const handleStart = async () => {
        try {
            await axios.post("http://127.0.0.1:8000/paper/start", { strategy, pairs: [pair] });
            alert("시스템 가동 시작"); fetchStatus();
        } catch (e) { 
            // 에러 메시지 상세 출력
            alert("에러: " + (e.response?.data?.detail || e.message)); 
        }
    };

    // ▼▼▼ [핵심 수정 부분] ▼▼▼
    const handleStop = async () => {
        try {
            // 백엔드가 어떤 봇을 끌지 알아야 하므로 { strategy: strategy } 를 바디에 실어 보냄
            await axios.post("http://127.0.0.1:8000/paper/stop", { strategy: strategy });
            alert("시스템 강제 종료"); 
            fetchStatus();
        } catch (e) { 
            console.error(e);
            alert("종료 실패: " + (e.response?.data?.detail || e.message));
        }
    };
    // ▲▲▲ [수정 끝] ▲▲▲

    useEffect(() => {
        fetchStatus();
        fetchLogs();
        const interval = setInterval(() => { fetchStatus(); fetchLogs(); }, 1000);
        return () => clearInterval(interval);
    }, [strategy]); // 전략이 바뀔 때마다 갱신

    const isRunning = statusData?.status === "RUNNING";

    return (
        <div className="flex h-screen bg-black text-gray-300 overflow-hidden font-mono selection:bg-green-500 selection:text-black" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            
            {/* ================================================= */}
            {/* [좌측 패널] 너비 300px 고정 (제어판)               */}
            {/* ================================================= */}
            <div className="w-[300px] flex flex-col border-r border-green-900/50 bg-black p-4 shrink-0 z-20">
                
                {/* 로고 영역 */}
                <div className="mb-8 mt-2 px-1 border-l-2 border-green-500 pl-4">
                    <h1 className="text-xl font-bold flex items-center gap-2 text-green-500 tracking-wider">
                        <Terminal size={20} /> 
                        <span>FREQ_BOT</span>
                    </h1>
                    <p className="text-[10px] text-green-800 mt-1 uppercase tracking-[0.2em] font-bold">Automated System</p>
                </div>

                {/* 제어판 카드 */}
                <div className="bg-black p-4 border border-green-900/50 shadow-[0_0_15px_rgba(20,83,45,0.1)]">
                    <h3 className="text-xs font-bold text-green-600 mb-4 flex items-center gap-2 border-b border-green-900/50 pb-2 uppercase tracking-widest">
                        <RefreshCw size={12}/> Control Module
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] text-green-700 font-bold mb-1 block uppercase">Target Strategy</label>
                            <input 
                                className="w-full bg-black text-green-400 border border-green-800 px-3 py-2 text-sm focus:border-green-500 focus:shadow-[0_0_10px_rgba(34,197,94,0.2)] outline-none transition-all placeholder-green-900/50"
                                value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="ENTER_STRATEGY_NAME"
                            />
                        </div>
                        
                        <div>
                            <label className="text-[10px] text-green-700 font-bold mb-1 block uppercase">Trading Pair</label>
                            <input 
                                className="w-full bg-black text-green-400 border border-green-800 px-3 py-2 text-sm focus:border-green-500 focus:shadow-[0_0_10px_rgba(34,197,94,0.2)] outline-none transition-all placeholder-green-900/50"
                                value={pair} onChange={(e) => setPair(e.target.value)} placeholder="BTC/USDT"
                            />
                        </div>

                        <div className="pt-4">
                            {isRunning ? (
                                <button onClick={handleStop} className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900 py-3 flex justify-center items-center gap-2 text-sm font-bold shadow-[0_0_10px_rgba(239,68,68,0.1)] transition-all active:scale-[0.98] uppercase tracking-wider">
                                    <Square size={14} fill="currentColor"/> Terminate
                                </button>
                            ) : (
                                <button onClick={handleStart} className="w-full bg-green-900/20 hover:bg-green-900/40 text-green-500 border border-green-900 py-3 flex justify-center items-center gap-2 text-sm font-bold shadow-[0_0_10px_rgba(34,197,94,0.1)] transition-all active:scale-[0.98] uppercase tracking-wider">
                                    <Play size={14} fill="currentColor"/> Initialize
                                </button>
                            )}
                        </div>
                        
                        {/* 상태 텍스트 */}
                        <div className="text-center">
                            <span className={`text-[10px] tracking-widest uppercase ${isRunning ? 'text-green-500 animate-pulse' : 'text-red-900'}`}>
                                {isRunning ? ">> PROCESS RUNNING <<" : ">> SYSTEM HALTED <<"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================================================= */}
            {/* [우측 패널] 3단 구조 (헤더 -> 현황 -> 테이블)      */}
            {/* ================================================= */}
            <div className="flex-1 flex flex-col min-w-0 bg-black scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-black">
                
                {/* 1. 최상단 네비게이션 바 */}
                <div className="h-14 bg-black border-b border-green-900/50 flex items-center px-6 shrink-0 justify-between z-10">
                    <div className="flex items-center gap-2 text-green-500 font-bold tracking-widest text-sm">
                        <LayoutDashboard size={16} />
                        <span>DASHBOARD // OVERVIEW</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <span className={`px-2 py-1 border ${isRunning ? 'border-green-500/50 bg-green-500/10 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'border-red-900 bg-red-900/10 text-red-700'}`}>
                            {isRunning ? "● ONLINE" : "○ OFFLINE"}
                        </span>
                    </div>
                </div>

                {/* 2. 실시간 현황판 */}
                <div className="px-6 py-4 bg-black border-b border-green-900/30 shrink-0">
                    <div className="grid grid-cols-4 gap-4">
                        <MiniStatusCard title="SYSTEM STATUS" value={statusData?.status || "WAITING"} color={isRunning ? "text-green-400" : "text-gray-600"} icon={<Layers size={14} className="opacity-50"/>} />
                        <MiniStatusCard title="TOTAL RETURN" value={`${statusData?.total_roi || 0}%`} color={(statusData?.total_roi || 0) >= 0 ? "text-green-400" : "text-red-500"} icon={<TrendingUp size={14} className="opacity-50"/>} />
                        <MiniStatusCard title="WIN / LOSS" value={`${statusData?.win_count || 0}W / ${statusData?.loss_count || 0}L`} color="text-gray-300" subtext={`WIN RATE: ${statusData?.win_count + statusData?.loss_count > 0 ? Math.round(statusData.win_count / (statusData.win_count + statusData.loss_count) * 100) : 0}%`} />
                        <MiniStatusCard title="ACTIVE POSITIONS" value={`${statusData?.active_trade_count || 0}`} color="text-yellow-500" unit="OPEN" />
                    </div>
                </div>

                {/* 3. 거래 기록 테이블 */}
                <div className="flex-1 overflow-hidden flex flex-col relative">
                    <div className="px-6 py-2 bg-green-900/5 border-b border-green-900/30 flex justify-between items-center shrink-0">
                        <h2 className="font-bold text-green-600 flex items-center gap-2 text-xs uppercase tracking-widest">
                            <FileText size={14}/> Trade Logs
                        </h2>
                        {isRunning && <span className="text-[10px] text-green-500 animate-pulse">● LIVE DATA FEED</span>}
                    </div>

                    <div className="flex-1 overflow-auto bg-black scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-black">
                        <table className="w-full text-center border-collapse">
                            <thead className="text-[10px] text-green-700 bg-black border-b border-green-900 uppercase font-medium sticky top-0 z-10">
                                <tr>
                                    <th className="px-2 py-3">Timestamp</th>
                                    <th className="px-2 py-3">Type</th>
                                    <th className="px-2 py-3">Pair</th>
                                    <th className="px-2 py-3">Close</th>
                                    <th className="px-2 py-3">Amt</th>
                                    <th className="px-2 py-3">Open</th>
                                    <th className="px-2 py-3">Profit %</th>
                                    <th className="px-2 py-3">Profit $</th>
                                    <th className="px-2 py-3">Total $</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-green-900/20 text-xs">
                                {logs.length === 0 ? (
                                    <tr><td colSpan="9" className="py-20 text-green-900/50 uppercase tracking-widest">No Data Available</td></tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-green-900/10 transition-colors font-mono group">
                                            <td className="px-2 py-2 text-gray-500 whitespace-nowrap group-hover:text-green-400">{log.timestamp.substring(5)}</td>
                                            
                                            <td className="px-2 py-2 font-bold whitespace-nowrap">
                                                <span className={`px-1 rounded-sm text-[10px] ${log.side === 'long' ? 'text-green-400 border border-green-900' : 'text-red-400 border border-red-900'} mr-2`}>
                                                    {log.side === 'long' ? "LNG" : "SHT"}
                                                </span>
                                                <span className={`text-[10px] ${log.is_win ? 'text-green-400' : 'text-red-500'}`}>
                                                    {log.is_win ? "WIN" : "LOSS"}
                                                </span>
                                            </td>

                                            <td className="px-2 py-2 text-gray-400 font-bold">{log.pair}</td>
                                            <td className="px-2 py-2 text-gray-500">{log.close_price.toFixed(2)}</td>
                                            <td className="px-2 py-2 text-gray-500">{log.amount.toFixed(4)}</td>
                                            <td className="px-2 py-2 text-gray-500">{log.open_price.toFixed(2)}</td>

                                            <td className={`px-2 py-2 font-bold ${log.is_win ? 'text-green-400' : 'text-red-500'}`}>
                                                {log.profit_percent > 0 ? "+" : ""}{log.profit_percent}%
                                            </td>

                                            <td className={`px-2 py-2 font-bold ${log.profit_abs >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                                {log.profit_abs > 0 ? "+" : ""}{log.profit_abs}
                                            </td>

                                            <td className={`px-2 py-2 font-bold ${log.accumulated_profit >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                                {log.accumulated_profit > 0 ? "+" : ""}{log.accumulated_profit}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 미니 카드 스타일
const MiniStatusCard = ({ title, value, color, icon, subtext, unit }) => (
    <div className="bg-black p-3 border border-green-900/30 flex flex-col justify-center h-20 relative overflow-hidden group hover:border-green-500/50 hover:shadow-[0_0_10px_rgba(34,197,94,0.1)] transition-all">
        <div className="absolute top-0 right-0 w-8 h-8 bg-green-900/10 transform rotate-45 translate-x-4 -translate-y-4"></div>
        <div className="absolute right-2 top-2 opacity-20 group-hover:opacity-100 group-hover:text-green-500 transition-all">
            {icon}
        </div>
        <div className="text-[9px] text-green-800 font-bold uppercase tracking-widest mb-1">{title}</div>
        <div className="flex items-baseline gap-1">
            <div className={`text-xl font-bold leading-none ${color} tracking-tight shadow-green-900`}>{value}</div>
            {unit && <span className="text-[9px] text-gray-600 uppercase">{unit}</span>}
        </div>
        {subtext && <div className="text-[9px] text-gray-600 mt-1 font-medium">{subtext}</div>}
    </div>
);

export default PaperTrading;