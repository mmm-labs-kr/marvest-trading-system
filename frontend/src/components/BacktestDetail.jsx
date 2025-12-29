import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, Terminal, Activity, AlertTriangle, TrendingUp } from 'lucide-react';

function BacktestDetail() {
    const { filename } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await axios.get(`/api/backtest/results/${filename}`);
                setData(response.data);
            } catch (err) {
                console.error(err);
                setError("상세 데이터를 불러오는데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [filename]);

    if (loading) return (
        <div className="min-h-screen bg-black text-gray-400 flex items-center justify-center font-mono">
            <div className="flex flex-col items-center gap-4">
                <Terminal size={48} className="animate-pulse text-gray-600" />
                <span className="text-sm tracking-widest">LOADING SYSTEM...</span>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-black text-red-500 flex items-center justify-center font-sans">
            <div className="border border-red-900/50 p-8 rounded-lg bg-red-900/10 flex flex-col items-center gap-4 max-w-md text-center">
                <AlertTriangle size={48} />
                <span className="text-lg font-bold">{error}</span>
                <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded transition-colors text-sm">
                    돌아가기
                </button>
            </div>
        </div>
    );

    if (!data) return null;

    const strategyName = Object.keys(data.strategy || {})[0] || "Unknown Strategy";
    const stat = data.strategy[strategyName] || {};

    const avgWin = stat.wins > 0 ? stat.profit_total_abs / stat.wins : 0;
    const totalLoss = Math.abs(stat.loss_total_abs || 0);
    const avgLoss = stat.losses > 0 ? totalLoss / stat.losses : 0;
    const riskRewardRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "∞";

    const fmtPct = (val) => val == null || isNaN(Number(val)) ? "N/A" : `${(val * 100).toFixed(2)}%`;
    const fmtNum = (val) => val ? val.toLocaleString() : "0";
    const fmtMoney = (val) => val ? val.toFixed(2) : "0.00";

    // 스타일 정의: 다크모드, 고대비
    const tableClass = "w-full border-collapse text-sm";
    // 헤더: 배경 짙은 회색, 텍스트 회색
    const thClass = "py-4 px-6 text-left font-bold text-gray-400 bg-[#161616] border-b border-gray-800 uppercase text-xs tracking-wider w-1/3";
    // 데이터: 배경 투명, 텍스트 흰색/컬러, 모노스페이스
    const tdClass = "py-4 px-6 border-b border-gray-800 text-gray-200 font-mono text-base";

    return (
        <div className="min-h-screen bg-black text-gray-200 font-sans p-8 pb-20">
            
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-10 border-b border-gray-800 pb-6">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-gray-500 hover:text-white mb-6 transition-colors text-sm font-bold group"
                >
                    <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
                    Back to List
                </button>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-white tracking-tight">
                            <FileText className="text-green-500" size={32} />
                            {strategyName}
                        </h1>
                        <p className="mt-2 text-sm text-gray-500 font-mono ml-1">
                            SOURCE FILE: <span className="text-gray-300">{filename}</span>
                        </p>
                    </div>
                    <div className="text-right bg-[#111] border border-gray-800 px-4 py-2 rounded-lg">
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Backtest Period</div>
                        <div className="text-sm text-gray-200 font-mono font-bold">
                            {stat.backtest_start} <span className="text-gray-600 mx-2">→</span> {stat.backtest_end}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* 1. Performance Metrics */}
                <section className="lg:col-span-2">
                    <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                        <TrendingUp size={20} className="text-green-500" /> Performance Summary
                    </h2>
                    <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#0a0a0a]">
                        <table className={tableClass}>
                            <tbody>
                                <tr>
                                    <th className={thClass}>시작 원금 (Start Balance)</th>
                                    <td className={tdClass}>
                                        {fmtMoney(stat.starting_balance)} <span className="text-xs text-gray-600">USDT</span>
                                    </td>
                                    <th className={thClass}>최종 금액 (Final Balance)</th>
                                    <td className={tdClass}>
                                        <span className={(stat.starting_balance+(stat.profit_total_abs||0)) >= stat.starting_balance ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                            {fmtMoney(stat.starting_balance+(stat.profit_total_abs||0))}
                                        </span> 
                                        <span className="text-xs text-gray-600 ml-1">USDT</span>
                                    </td>
                                </tr>
                                <tr>
                                    <th className={thClass}>순이익 (Net Profit)</th>
                                    <td className={tdClass}>
                                        <span className={stat.profit_total_abs >= 0 ? 'text-green-400' : 'text-red-400'}>
                                            {stat.profit_total_abs >= 0 ? '+' : ''}{fmtMoney(stat.profit_total_abs)}
                                        </span>
                                    </td>
                                    <th className={thClass}>총 수익률 (Return)</th>
                                    <td className={tdClass}>
                                        <span className={`px-2 py-1 rounded text-sm font-bold ${stat.profit_total_abs >= 0 ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                                            {fmtPct(stat.profit_total_abs/stat.starting_balance)}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 2. Advanced Metrics */}
                <section>
                    <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                        <Activity size={20} className="text-green-500" /> Advanced Stats
                    </h2>
                    <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#0a0a0a]">
                        <table className={tableClass}>
                            <tbody>
                                <tr>
                                    <th className={thClass}>CAGR</th>
                                    <td className={tdClass}>
                                        <span className={stat.cagr >= 0 ? 'text-green-400' : 'text-red-400'}>{fmtPct(stat.cagr)}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <th className={thClass}>Profit Factor</th>
                                    <td className={tdClass}>
                                        {stat.profit_factor ? stat.profit_factor.toFixed(2) : "N/A"}
                                    </td>
                                </tr>
                                <tr>
                                    <th className={thClass}>Sharpe Ratio</th>
                                    <td className={tdClass}>
                                        {stat.sharpe ? stat.sharpe.toFixed(2) : "N/A"}
                                    </td>
                                </tr>
                                <tr>
                                    <th className={thClass}>Sortino Ratio</th>
                                    <td className={tdClass}>
                                        {stat.sortino ? stat.sortino.toFixed(2) : "N/A"}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 3. Risk & Trade Info */}
                <section>
                    <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                        <AlertTriangle size={20} className="text-orange-500" /> Risk & Trades
                    </h2>
                    <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#0a0a0a]">
                        <table className={tableClass}>
                            <tbody>
                                <tr>
                                    <th className={thClass}>Max Drawdown (MDD)</th>
                                    <td className={tdClass}>
                                        <span className="text-red-400 font-bold">{fmtPct(stat.max_drawdown_account)}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <th className={thClass}>Win Rate</th>
                                    <td className={tdClass}>
                                        <span className="text-green-400 font-bold">{fmtPct(stat.winrate)}</span>
                                        <span className="text-xs text-gray-500 ml-2 block sm:inline">
                                            ({stat.wins}W / {stat.draws}D / {stat.losses}L)
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <th className={thClass}>Total Trades</th>
                                    <td className={tdClass}>{stat.total_trades}</td>
                                </tr>
                                <tr>
                                    <th className={thClass}>Risk-Reward Ratio</th>
                                    <td className={tdClass}>{riskRewardRatio}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

            </div>

            {/* Raw Data Debug */}
            <details className="mt-12 bg-[#111] border border-gray-800 rounded-lg group">
                <summary className="cursor-pointer p-4 font-bold text-gray-500 text-xs uppercase tracking-widest group-hover:text-gray-300 transition-colors">
                    View Raw JSON Data
                </summary>
                <div className="p-4 border-t border-gray-800">
                    <pre className="text-[10px] text-gray-500 font-mono overflow-auto max-h-60">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            </details>
        </div>
    );
}

export default BacktestDetail;