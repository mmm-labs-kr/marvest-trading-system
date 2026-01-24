import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    ArrowLeft, FileText, Shield, BarChart3, 
    CheckCircle2, XCircle, Award, Zap 
} from 'lucide-react';
import MonteCarloSection from './MonteCarloSection';
import AIFeedbackSection from './AIFeedbackSection';


// ============================================
// 점수 게이지바 컴포넌트
// ============================================
const ScoreProgressBar = ({ name, value, score, full_mark, target }) => {
    const percentage = full_mark > 0 ? Math.min((score / full_mark) * 100, 100) : 0;
    
    // 점수에 따른 색상 결정
    const getBarColor = (pct) => {
        if (pct >= 70) return 'bg-green-500';
        if (pct >= 40) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="mb-4">
            <div className="flex justify-between items-end mb-1">
                <span className="text-xs text-gray-300 font-bold uppercase tracking-wider">
                    {name}
                </span>
                <div className="text-right">
                    <span className="text-xs text-white font-mono mr-2">{value}</span>
                    <span className="text-[10px] text-gray-400">
                        ({score}/{full_mark}pts)
                    </span>
                </div>
            </div>
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="text-[9px] text-gray-500 mt-0.5 text-right font-mono">
                Target: {target}
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
            p-4 rounded-lg border transition-all duration-200
            ${clickable 
                ? 'cursor-pointer hover:border-green-500 hover:bg-green-500/10 hover:ring-2 ring-green-500/20' 
                : ''
            } 
            ${pass 
                ? 'bg-green-900/10 border-green-900/50' 
                : 'bg-red-900/10 border-red-900/50'
            } 
            flex flex-col justify-center items-center text-center group
        `}
    >
        <span className="text-[10px] uppercase font-bold text-gray-500 mb-2">
            {name}
        </span>
        <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-lg font-bold text-white">{value}</span>
            {pass 
                ? <CheckCircle2 size={16} className="text-green-500" /> 
                : <XCircle size={16} className="text-red-500" />
            }
        </div>
        <span className="text-[9px] text-gray-500">{target}</span>
        
        {clickable && (
            <span className="text-[8px] text-green-400 mt-2 font-bold animate-pulse group-hover:scale-110">
                CLICK FOR REPORT
            </span>
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

    // 로딩 상태
    if (loading || !data) {
        return (
            <div className="bg-black min-h-screen text-white p-10 font-mono">
                LOADING SYSTEM...
            </div>
        );
    }

    // 데이터 추출
    const strategyName = Object.keys(data.strategy || {})[0] || "Unknown";
    const stat = data.strategy[strategyName] || {};
    const scoreData = data.m_score;
    const mcData = scoreData?.mc_analysis;

    // 등급별 색상
    const gradeColors = {
        'S': 'text-purple-400 border-purple-500 bg-purple-900/10',
        'A': 'text-green-400 border-green-500 bg-green-900/10',
        'B': 'text-blue-400 border-blue-500 bg-blue-900/10',
        'C': 'text-yellow-400 border-yellow-500 bg-yellow-900/10',
        'Fail': 'text-red-400 border-red-500 bg-red-900/10',
    };

    return (
        <div className="min-h-screen bg-black text-gray-200 p-4 md:p-8 relative">
            
            {/* ============================================ */}
            {/* Monte Carlo 팝업                             */}
            {/* ============================================ */}
            {showMC && mcData && (
                <MonteCarloSection 
                    data={mcData} 
                    onClose={() => setShowMC(false)} 
                />
            )}

            {/* ============================================ */}
            {/* Header                                       */}
            {/* ============================================ */}
            <div className="max-w-6xl mx-auto mb-8 border-b border-gray-800 pb-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div>
                        <button 
                            onClick={() => navigate('/')} 
                            className="flex items-center text-gray-400 hover:text-white mb-4 text-xs font-bold transition-colors"
                        >
                            <ArrowLeft size={14} className="mr-2" /> BACK TO LIST
                        </button>
                        <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                            <FileText className="text-green-500" size={28} /> 
                            {strategyName}
                        </h1>
                    </div>
                    <div className="text-right font-mono text-[10px] text-gray-500 bg-[#111] p-3 rounded border border-gray-800">
                        PERIOD: {stat.backtest_start} ~ {stat.backtest_end}
                    </div>
                </div>
            </div>

            {/* ============================================ */}
            {/* Score Analysis Section                       */}
            {/* ============================================ */}
            <div className="max-w-6xl mx-auto">
                {scoreData && (
                    <section className="bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
                        
                        {/* ---------------------------------------- */}
                        {/* Header: Total Score & Grade              */}
                        {/* ---------------------------------------- */}
                        <div className="p-4 md:p-6 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/50">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Award className="text-yellow-500" size={20} /> 
                                Score Analysis
                            </h2>
                            <div className={`px-4 py-1.5 rounded-lg border ${gradeColors[scoreData.grade]} flex items-center gap-4`}>
                                <div className="text-right border-r border-gray-700 pr-4">
                                    <div className="text-[9px] uppercase font-bold opacity-70">Total Score</div>
                                    <div className="text-xl font-black">{scoreData.total_score}</div>
                                </div>
                                <div className="text-3xl font-black">{scoreData.grade}</div>
                            </div>
                        </div>

                        {/* ---------------------------------------- */}
                        {/* Scored Metrics: 2-Column Layout          */}
                        {/* ---------------------------------------- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-800">
                            
                            {/* Risk Management */}
                            <div className="p-4 md:p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-400 flex items-center gap-2 text-sm">
                                        <Shield size={16} className="text-blue-500" /> 
                                        RISK MANAGEMENT
                                    </h3>
                                    <span className="text-xs font-mono text-blue-400 font-bold">
                                        {(Number(scoreData.details?.phase1?.score) * 0.667).toFixed(1)} / 66.7
                                    </span>
                                </div>
                                {scoreData.details?.phase1?.items?.map((item, idx) => (
                                    <ScoreProgressBar key={idx} {...item} />
                                ))}
                            </div>

                            {/* Performance */}
                            <div className="p-4 md:p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-400 flex items-center gap-2 text-sm">
                                        <BarChart3 size={16} className="text-purple-500" /> 
                                        PERFORMANCE
                                    </h3>
                                    <span className="text-xs font-mono text-purple-400 font-bold">
                                        {(Number(scoreData.details?.phase2?.score) * 0.333).toFixed(1)} / 33.3
                                    </span>
                                </div>
                                {scoreData.details?.phase2?.items?.map((item, idx) => (
                                    <ScoreProgressBar key={idx} {...item} />
                                ))}
                            </div>
                        </div>

                        {/* ---------------------------------------- */}
                        {/* Qualification Filters: Full Width        */}
                        {/* ---------------------------------------- */}
                        <div className="border-t border-gray-800 p-4 md:p-6 bg-black/30">
                            <h3 className="font-bold text-gray-400 flex items-center gap-2 text-sm mb-4">
                                <Zap size={16} className="text-yellow-500" /> 
                                QUALIFICATION FILTERS
                                <span className="text-[10px] text-gray-500 ml-2 font-normal">
                                    (All must pass)
                                </span>
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                                <FilterCard 
                                    name="TRADES" 
                                    value={scoreData.details?.filters?.trades?.value}
                                    pass={scoreData.details?.filters?.trades?.pass}
                                    target="≥ 150 trades"
                                />
                                <FilterCard 
                                    name="EXPECTANCY" 
                                    value={scoreData.details?.filters?.expectancy?.value}
                                    pass={scoreData.details?.filters?.expectancy?.pass}
                                    target="≥ 0.5%"
                                />
                                <FilterCard 
                                    name="MONTE CARLO" 
                                    value={scoreData.details?.filters?.monte_carlo?.value}
                                    pass={scoreData.details?.filters?.monte_carlo?.pass}
                                    target="0% ruin probability"
                                    onClick={() => mcData && setShowMC(true)}
                                    clickable={!!mcData}
                                />
                            </div>
                            
                            {/* Fail Reason Display */}
                            {!scoreData.is_qualified && scoreData.fail_reason && (
                                <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
                                    <span className="text-xs text-red-400 font-mono">
                                        ❌ DISQUALIFIED: {scoreData.fail_reason}
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