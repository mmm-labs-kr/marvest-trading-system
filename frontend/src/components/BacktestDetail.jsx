import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    ArrowLeft, FileText, Shield, BarChart3, 
    CheckCircle2, XCircle, Award, Zap, Calendar, ArrowRight
} from 'lucide-react';
import MonteCarloSection from './MonteCarloSection';
import AIFeedbackSection from './AIFeedbackSection';


// ============================================
// 점수 게이지바 컴포넌트 (Stealth Version)
// ============================================
const ScoreProgressBar = ({ name, value, score, full_mark, target }) => {
    const percentage = full_mark > 0 ? Math.min((score / full_mark) * 100, 100) : 0;
    
    const getBarColor = (pct) => {
        if (pct >= 70) return 'bg-white';
        if (pct >= 40) return 'bg-slate-400';
        return 'bg-red-500';
    };

    return (
        <div className="mb-6">
            <div className="flex justify-between items-end mb-2.5">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                    {name}
                </span>
                <div className="text-right">
                    <span className="text-xs text-white font-black mr-2 uppercase">{value}</span>
                    <span className="text-[10px] text-slate-600 font-bold">
                        {score} / {full_mark}
                    </span>
                </div>
            </div>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-700 ease-in-out ${getBarColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="text-[9px] text-slate-600 mt-2 font-bold uppercase tracking-tight">
                Benchmark: {target}
            </div>
        </div>
    );
};

// ============================================
// 필터 카드 컴포넌트 (Stealth Version)
// ============================================
const FilterCard = ({ name, value, pass, target, onClick, clickable }) => (
    <div 
        onClick={clickable ? onClick : undefined}
        className={`
            p-6 rounded-lg border transition-all duration-200
            ${clickable 
                ? 'cursor-pointer hover:bg-white/[0.03] active:scale-[0.98]' 
                : 'bg-transparent'
            } 
            ${pass 
                ? 'border-stealth-accent/30' 
                : 'border-red-500/30'
            } 
            flex flex-col justify-center items-center text-center group
        `}
    >
        <span className="text-[9px] uppercase font-black text-slate-600 mb-4 tracking-[0.2em]">
            {name}
        </span>
        <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xl font-black text-white">{value}</span>
            {pass 
                ? <div className="w-1.5 h-1.5 rounded-full bg-stealth-accent shadow-[0_0_8px_var(--color-stealth-accent)]"></div>
                : <XCircle size={16} className="text-red-500" />
            }
        </div>
        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{target}</span>
        
        {clickable && (
            <div className="mt-4 flex items-center gap-1.5 text-white">
                <span className="text-[9px] font-black uppercase tracking-widest">Detail Report</span>
                <ArrowRight size={10} strokeWidth={3} />
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
            <div className="flex h-[80vh] items-center justify-center text-white font-black tracking-[0.3em] uppercase text-xs">
                <Loader2 className="animate-spin mr-3 text-slate-600" /> System Analysis...
            </div>
        );
    }

    const strategyName = Object.keys(data.strategy || {})[0] || "Unknown";
    const stat = data.strategy[strategyName] || {};
    const scoreData = data.m_score;
    const mcData = scoreData?.mc_analysis;

    const gradeStyles = {
        'S': 'text-purple-400 border-purple-500/30',
        'A': 'text-stealth-accent border-stealth-accent/30',
        'B': 'text-blue-400 border-blue-500/30',
        'C': 'text-amber-400 border-amber-500/30',
        'Fail': 'text-red-400 border-red-500/30',
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            
            {showMC && mcData && (
                <MonteCarloSection 
                    data={mcData} 
                    onClose={() => setShowMC(false)} 
                />
            )}

            {/* Header */}
            <div className="space-y-6">
                <button 
                    onClick={() => navigate('/')} 
                    className="flex items-center text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
                >
                    <ArrowLeft size={12} className="mr-2" strokeWidth={3} /> Return to Registry
                </button>
                
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-stealth-border pb-10">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded flex items-center justify-center text-black shadow-2xl">
                            <FileText size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-3">
                                {strategyName}
                            </h1>
                            <div className="flex items-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                <Calendar size={12} />
                                {stat.backtest_start} — {stat.backtest_end}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/[0.03] px-5 py-3 rounded border border-white/5">
                        <span className="block text-[8px] text-slate-600 font-black uppercase tracking-[0.3em] mb-1">Source Identifier</span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">{filename}</span>
                    </div>
                </div>
            </div>

            {/* Main Score Section */}
            {scoreData && (
                <div className="glass-card overflow-hidden">
                    <div className="p-10 flex flex-col md:flex-row justify-between items-center gap-10 bg-white/[0.01] border-b border-stealth-border">
                        <div className="flex items-center gap-4">
                            <Award size={24} className="text-white" />
                            <div>
                                <h2 className="text-lg font-black text-white uppercase tracking-[0.1em]">Performance Index</h2>
                                <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] mt-1">Algorithmic Grade Assessment</p>
                            </div>
                        </div>
                        
                        <div className={`flex items-center gap-8 px-10 py-4 border rounded-md ${gradeStyles[scoreData.grade]}`}>
                            <div className="text-right border-r border-current/20 pr-8">
                                <div className="text-[8px] uppercase font-black tracking-[0.3em] opacity-60">Aggregate</div>
                                <div className="text-3xl font-black font-mono leading-none mt-1">{scoreData.total_score}</div>
                            </div>
                            <div className="text-6xl font-black tracking-tighter">{scoreData.grade}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stealth-border">
                        <div className="p-10">
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                                <Shield size={14} /> Risk Mitigation <span className="text-[10px] text-slate-600 ml-auto">67% Weight</span>
                            </h3>
                            <div className="space-y-2">
                                {scoreData.details?.phase1?.items?.map((item, idx) => (
                                    <ScoreProgressBar key={idx} {...item} />
                                ))}
                            </div>
                        </div>

                        <div className="p-10">
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                                <BarChart3 size={14} /> Capital Efficiency <span className="text-[10px] text-slate-600 ml-auto">33% Weight</span>
                            </h3>
                            <div className="space-y-2">
                                {scoreData.details?.phase2?.items?.map((item, idx) => (
                                    <ScoreProgressBar key={idx} {...item} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-10 border-t border-stealth-border bg-white/[0.01]">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">Verification Protocol</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <FilterCard 
                                name="Trading Volume" 
                                value={`${scoreData.details?.filters?.trades?.value}`}
                                pass={scoreData.details?.filters?.trades?.pass}
                                target="Min 150 Executions"
                            />
                            <FilterCard 
                                name="Expectancy" 
                                value={`${scoreData.details?.filters?.expectancy?.value}`}
                                pass={scoreData.details?.filters?.expectancy?.pass}
                                target="Min 0.5% Per Trade"
                            />
                            <FilterCard 
                                name="Stability (MC)" 
                                value={`${scoreData.details?.filters?.monte_carlo?.value}`}
                                pass={scoreData.details?.filters?.monte_carlo?.pass}
                                target="Zero Ruin Probability"
                                onClick={() => mcData && setShowMC(true)}
                                clickable={!!mcData}
                            />
                        </div>
                        
                        {!scoreData.is_qualified && (
                            <div className="mt-8 p-5 bg-red-500/5 border border-red-500/20 rounded flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                                <span className="text-[10px] text-red-400 font-black uppercase tracking-[0.2em]">Protocol Failure: {scoreData.fail_reason}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <AIFeedbackSection 
                strategyName={strategyName}
                backtestStats={stat}
            />
        </div>
    );
}

export default BacktestDetail;
