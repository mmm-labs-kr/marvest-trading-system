import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    ArrowLeft, FileText, Shield, BarChart3, 
    CheckCircle2, XCircle, Award, Zap, Calendar
} from 'lucide-react';
import MonteCarloSection from './MonteCarloSection';
import AIFeedbackSection from './AIFeedbackSection';


// ============================================
// 점수 게이지바 컴포넌트
// ============================================
const ScoreProgressBar = ({ name, value, score, full_mark, target }) => {
    const percentage = full_mark > 0 ? Math.min((score / full_mark) * 100, 100) : 0;
    
    const getBarColor = (pct) => {
        if (pct >= 70) return 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]';
        if (pct >= 40) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className="mb-5">
            <div className="flex justify-between items-end mb-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    {name}
                </span>
                <div className="text-right">
                    <span className="text-xs text-white font-mono font-bold mr-2">{value}</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                        ({score}/{full_mark} pts)
                    </span>
                </div>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${getBarColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="text-[9px] text-slate-500 mt-1.5 text-right font-mono tracking-tighter uppercase">
                기준: {target}
            </div>
        </div>
    );
};

// ============================================
// 필터 카드 컴포넌트
// ============================================
const FilterCard = ({ name, value, pass, target, onClick, clickable }) => (
    <div 
        onClick={clickable ? onClick : undefined}
        className={`
            p-5 rounded-2xl border transition-all duration-300
            ${clickable 
                ? 'cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                : 'bg-slate-900/40 border-white/5'
            } 
            ${pass 
                ? 'border-emerald-500/20 bg-emerald-500/5' 
                : 'border-red-500/20 bg-red-500/5'
            } 
            flex flex-col justify-center items-center text-center group relative overflow-hidden
        `}
    >
        <span className="text-[10px] uppercase font-bold text-slate-500 mb-3 tracking-[0.2em]">
            {name}
        </span>
        <div className="flex items-center gap-3 mb-1.5">
            <span className="font-mono text-xl font-black text-white tracking-tight">{value}</span>
            {pass 
                ? <CheckCircle2 size={18} className="text-emerald-500" /> 
                : <XCircle size={18} className="text-red-500" />
            }
        </div>
        <span className="text-[10px] text-slate-500 font-medium">{target}</span>
        
        {clickable && (
            <div className="mt-3 py-1 px-3 bg-blue-500/10 rounded-full border border-blue-500/20">
                <span className="text-[9px] text-blue-400 font-bold tracking-wider animate-pulse">
                    분석 보고서 보기
                </span>
            </div>
        )}
    </div>
);

// ============================================
// 메인 컴포넌트
// ============================================
function BacktestDetail() {
    const { filename } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showMC, setShowMC] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await axios.get(`/api/backtest/results/${filename}`);
                setData(response.data);
            } catch (err) {
                setError("데이터 로드 실패");
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [filename]);

    if (loading || !data) {
        return (
            <div className="flex h-[80vh] items-center justify-center text-blue-400 font-medium tracking-widest uppercase">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>시스템 분석 로드 중...</span>
                </div>
            </div>
        );
    }

    const strategyName = Object.keys(data.strategy || {})[0] || "Unknown";
    const stat = data.strategy[strategyName] || {};
    const scoreData = data.m_score;
    const mcData = scoreData?.mc_analysis;

    const gradeStyles = {
        'S': 'text-purple-400 border-purple-500/30 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]',
        'A': 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
        'B': 'text-blue-400 border-blue-500/30 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]',
        'C': 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
        'Fail': 'text-red-400 border-red-500/30 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.15)]',
    };

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {showMC && mcData && (
                <MonteCarloSection 
                    data={mcData} 
                    onClose={() => setShowMC(false)} 
                />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 bg-blue-500/5 border border-blue-500/10 p-8 rounded-3xl backdrop-blur-sm">
                <div className="space-y-4">
                    <button 
                        onClick={() => navigate('/')} 
                        className="group flex items-center text-slate-500 hover:text-blue-400 text-xs font-bold transition-all"
                    >
                        <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
                        목록으로 돌아가기
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg">
                            <FileText size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">
                                {strategyName}
                            </h1>
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-mono uppercase tracking-widest">
                                <Calendar size={12} className="text-blue-500/50" />
                                {stat.backtest_start} ~ {stat.backtest_end}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                    <div className="text-right">
                        <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Result Summary</span>
                        <span className="text-sm text-slate-300 font-semibold">{filename}</span>
                    </div>
                </div>
            </div>

            {/* Score Analysis Section */}
            <div className="max-w-7xl mx-auto">
                {scoreData && (
                    <section className="glass-card overflow-hidden">
                        
                        {/* Header: Total Score & Grade */}
                        <div className="p-8 border-b border-blue-500/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-blue-500/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                    <Award size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">전략 성과 점수</h2>
                                    <p className="text-slate-500 text-xs font-medium">알고리즘 기반 정밀 성능 평가</p>
                                </div>
                            </div>
                            
                            <div className={`flex items-center gap-6 px-6 py-3 rounded-2xl border ${gradeStyles[scoreData.grade]}`}>
                                <div className="text-right border-r border-current/20 pr-6">
                                    <div className="text-[10px] uppercase font-black opacity-70 tracking-widest">Total Score</div>
                                    <div className="text-2xl font-black font-mono leading-none mt-1">{scoreData.total_score}</div>
                                </div>
                                <div className="text-5xl font-black tracking-tighter">{scoreData.grade}</div>
                            </div>
                        </div>

                        {/* Metrics: 2-Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-blue-500/10">
                            
                            {/* Risk Management */}
                            <div className="p-8 space-y-8">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-slate-200 flex items-center gap-3 text-sm tracking-widest">
                                        <Shield size={18} className="text-blue-500" /> 
                                        리스크 관리 (67%)
                                    </h3>
                                    <div className="px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                                        <span className="text-xs font-mono text-blue-400 font-bold">
                                            {(Number(scoreData.details?.phase1?.score) * 0.667).toFixed(1)} <span className="text-[10px] opacity-50">/ 66.7</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                                    {scoreData.details?.phase1?.items?.map((item, idx) => (
                                        <ScoreProgressBar key={idx} {...item} />
                                    ))}
                                </div>
                            </div>

                            {/* Performance */}
                            <div className="p-8 space-y-8">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-slate-200 flex items-center gap-3 text-sm tracking-widest">
                                        <BarChart3 size={18} className="text-purple-500" /> 
                                        수익성 지표 (33%)
                                    </h3>
                                    <div className="px-3 py-1 bg-purple-500/10 rounded-full border border-purple-500/20">
                                        <span className="text-xs font-mono text-purple-400 font-bold">
                                            {(Number(scoreData.details?.phase2?.score) * 0.333).toFixed(1)} <span className="text-[10px] opacity-50">/ 33.3</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
                                    {scoreData.details?.phase2?.items?.map((item, idx) => (
                                        <ScoreProgressBar key={idx} {...item} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Qualification Filters */}
                        <div className="border-t border-blue-500/10 p-8 bg-blue-500/5">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-200 flex items-center gap-3 text-sm tracking-widest">
                                    <Zap size={18} className="text-amber-500" /> 
                                    최소 통과 기준 (Pass/Fail)
                                </h3>
                                <div className="text-[10px] text-slate-500 font-bold uppercase border border-white/10 px-3 py-1 rounded-full">
                                    All Mandatory
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FilterCard 
                                    name="거래 횟수" 
                                    value={`${scoreData.details?.filters?.trades?.value}회`}
                                    pass={scoreData.details?.filters?.trades?.pass}
                                    target="≥ 150회"
                                />
                                <FilterCard 
                                    name="기대 수익" 
                                    value={scoreData.details?.filters?.expectancy?.value}
                                    pass={scoreData.details?.filters?.expectancy?.pass}
                                    target="≥ 0.5%"
                                />
                                <FilterCard 
                                    name="파산 확률 (MC)" 
                                    value={scoreData.details?.filters?.monte_carlo?.value}
                                    pass={scoreData.details?.filters?.monte_carlo?.pass}
                                    target="0% Ruin Prob"
                                    onClick={() => mcData && setShowMC(true)}
                                    clickable={!!mcData}
                                />
                            </div>
                            
                            {!scoreData.is_qualified && scoreData.fail_reason && (
                                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                                        <XCircle size={18} />
                                    </div>
                                    <span className="text-sm text-red-400 font-bold font-mono">
                                        검증 실패: {scoreData.fail_reason}
                                    </span>
                                </div>
                            )}
                        </div>

                    </section>
                )}
                {/* AI Feedback Section */}
                <AIFeedbackSection 
                    strategyName={strategyName}
                    backtestStats={stat}
                />
            </div>
        </div>
    );
}

export default BacktestDetail;
