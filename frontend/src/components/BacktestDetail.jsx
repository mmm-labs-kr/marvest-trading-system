import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, Terminal, Activity, AlertTriangle, TrendingUp, Shield, BarChart3, CheckCircle2, XCircle, Award } from 'lucide-react';

// ★ 점수 진행 바 컴포넌트 (내부용)
const ScoreProgressBar = ({ label, value, score, maxScore, target }) => (
    <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
            <span className="text-xs text-gray-300 font-bold">{label}</span>
            <div className="text-right">
                <span className="text-xs text-white font-mono mr-2">{value}</span>
                <span className="text-[10px] text-gray-300">({score}/{maxScore}pts)</span>
            </div>
        </div>
        <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div 
                className="bg-green-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((score / maxScore) * 100, 100)}%` }}
            />
        </div>
        <div className="text-[9px] text-gray-300 mt-0.5 text-right font-mono">Target: {target}</div>
    </div>
);

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
        <div className="min-h-screen bg-black text-gray-300 flex items-center justify-center font-mono">
            <div className="flex flex-col items-center gap-4">
                <Terminal size={48} className="animate-pulse text-gray-300" />
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
    const scoreData = data.m_score;
    const avgWin = stat.wins > 0 ? stat.profit_total_abs / stat.wins : 0;
    const totalLoss = Math.abs(stat.loss_total_abs || 0);
    const avgLoss = stat.losses > 0 ? totalLoss / stat.losses : 0;
    const riskRewardRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "∞";
    const fmtPct = (val) => {
        if (val == null || isNaN(Number(val))) return "N/A";
        return `${(Number(val) * 100).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}%`;
    };
    const fmtNum = (val) => val ? Number(val).toLocaleString() : "0";
    const fmtMoney = (val) => {
        if (val == null || isNaN(Number(val))) return "0.00";
        return Number(val).toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    };

    const tableClass = "w-full border-collapse text-sm";
    const thClass = "py-4 px-6 text-left font-bold text-gray-300 bg-[#161616] border-b border-gray-800 uppercase text-xs tracking-wider w-1/3";
    const tdClass = "py-4 px-6 border-b border-gray-800 text-gray-200 font-mono text-base";
    const gradeColors = {
        'S': 'text-purple-400 border-purple-500 bg-purple-900/10',
        'A': 'text-green-400 border-green-500 bg-green-900/10',
        'B': 'text-blue-400 border-blue-500 bg-blue-900/10',
        'C': 'text-yellow-400 border-yellow-500 bg-yellow-900/10',
        'Fail': 'text-red-400 border-red-500 bg-red-900/10',
    };

    return (
        <div className="min-h-screen bg-black text-gray-200 font-sans p-8 pb-20">
            
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-10 border-b border-gray-800 pb-6">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-gray-300 hover:text-white mb-6 transition-colors text-sm font-bold group"
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
                        <p className="mt-2 text-sm text-gray-300 font-mono ml-1">
                            SOURCE FILE: <span className="text-gray-300">{filename}</span>
                        </p>
                    </div>
                    <div className="text-right bg-[#111] border border-gray-800 px-4 py-2 rounded-lg">
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Backtest Period</div>
                        <div className="text-sm text-gray-200 font-mono font-bold">
                            {stat.backtest_start} <span className="text-gray-300 mx-2">→</span> {stat.backtest_end}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto flex flex-col gap-8">

                {/* ★ 1. Marvest Score Dashboard (New) */}
                {scoreData ? (
                    <section className="bg-[#0f0f0f] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Award className="text-yellow-500" size={24} /> 
                                Score Analysis
                            </h2>
                            <div className={`px-4 py-2 rounded-lg border ${gradeColors[scoreData.grade] || 'text-gray-300 border-gray-600'} flex items-center gap-3`}>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase font-bold tracking-widest opacity-70">Total Score</div>
                                    <div className="text-2xl font-black leading-none">{scoreData.total_score}</div>
                                </div>
                                <div className="text-4xl font-black border-l border-current pl-3">
                                    {scoreData.grade}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-800">
                            {/* Phase 1: Risk */}
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-300 flex items-center gap-2">
                                        <Shield size={18} className="text-blue-500" /> Risk
                                    </h3>
                                    <span className="text-sm font-mono text-blue-400 font-bold">{(Number(scoreData.details?.phase1?.score) * 0.667).toFixed(1)} / 66.7</span>
                                </div>
                                
                                {scoreData.details.phase1.items.map((item, idx) => (
                                    <ScoreProgressBar 
                                        key={idx}
                                        label={item.name}
                                        value={item.value}
                                        score={item.score}
                                        maxScore={item.full_mark}
                                        target={item.target}
                                    />
                                ))}
                            </div>

                            {/* Phase 2: Performance & Filters */}
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-300 flex items-center gap-2">
                                        <BarChart3 size={18} className="text-purple-500" /> Profit
                                    </h3>
                                    <span className="text-sm font-mono text-purple-400 font-bold">{(Number(scoreData.details?.phase2?.score) * 0.333).toFixed(1)} / 33.3</span>
                                </div>

                                {scoreData.details.phase2.items.map((item, idx) => (
                                    <ScoreProgressBar 
                                        key={idx}
                                        label={item.name}
                                        value={item.value}
                                        score={item.score}
                                        maxScore={item.full_mark}
                                        target={item.target}
                                    />
                                ))}

                                {/* Filters */}
                                <div className="mt-8 pt-6 border-t border-gray-800">
                                    <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3">Minimum Filter</h4>
                                    <div className="flex gap-4">
                                        {Object.entries(scoreData.details.filters).map(([key, filter]) => (
                                            <div key={key} className={`flex-1 p-3 rounded border ${filter.pass ? 'bg-green-900/10 border-green-900/50' : 'bg-red-900/10 border-red-900/50'} flex justify-between items-center`}>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-bold text-gray-300">{key}</span>
                                                    <span className="font-mono text-sm font-bold text-gray-200">{filter.value}</span>
                                                </div>
                                                {filter.pass ? <CheckCircle2 size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {!scoreData.is_qualified && (
                            <div className="bg-red-900/20 border-t border-red-900/50 p-3 text-center text-red-400 text-sm font-bold flex items-center justify-center gap-2">
                                <AlertTriangle size={16} /> Strategy Failed: {scoreData.fail_reason}
                            </div>
                        )}
                    </section>
                ) : (
                    <div className="bg-gray-900/50 border border-dashed border-gray-700 rounded-xl p-8 text-center text-gray-300">
                        <Activity className="mx-auto mb-2 opacity-50" size={32} />
                        <p>Score data is not available for this backtest.</p>
                        <p className="text-xs mt-1">Please update your backend API to calculate scores for detailed view.</p>
                    </div>
                )}


                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <section className="lg:col-span-2">
                        <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#0a0a0a]">
                            <table className={tableClass}>
                                <tbody>
                                    <tr>
                                        <th className={thClass}>Start Balance</th>
                                        <td className={tdClass}>
                                            {fmtMoney(stat.starting_balance)} <span className="text-xs text-gray-300">USDT</span>
                                        </td>
                                        <th className={thClass}>Final Balance</th>
                                        <td className={tdClass}>
                                            <span className={(stat.starting_balance+(stat.profit_total_abs||0)) >= stat.starting_balance ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                                {fmtMoney(stat.starting_balance+(stat.profit_total_abs||0))}
                                            </span> 
                                            <span className="text-xs text-gray-300 ml-1">USDT</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th className={thClass}>Net Profit</th>
                                        <td className={tdClass}>
                                            <span className={stat.profit_total_abs >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                {stat.profit_total_abs >= 0 ? '+' : ''}{fmtMoney(stat.profit_total_abs)}
                                            </span>
                                        </td>
                                        <th className={thClass}>Return</th>
                                        <td className={tdClass}>
                                            <span className={`px-2 py-1 rounded text-sm font-bold ${stat.profit_total_abs >= 0 ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                                                {fmtPct(stat.profit_total_abs/stat.starting_balance)}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th className={thClass}>Win Rate</th>
                                        <td className={tdClass}>
                                            <span className="text-green-400 font-bold">{fmtPct(stat.winrate)}</span>
                                            <span className="text-xs text-gray-300 block">
                                                ({stat.wins}W / {stat.draws}D / {stat.losses}L)
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
                {/* Raw Data Debug */}
                <details className="bg-[#111] border border-gray-800 rounded-lg group">
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
        </div>
    );
}

export default BacktestDetail;