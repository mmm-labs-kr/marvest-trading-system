import React, { useState } from 'react';
import axios from 'axios';
import { 
    Bot, Lightbulb, AlertTriangle, ChevronDown, ChevronUp, 
    Loader2, Sparkles, Code, CheckCircle2, XCircle, Info,
    FileCode, X, Check, BrainCircuit
} from 'lucide-react';

// 접을 수 있는 카드 컴포넌트
const CollapsibleCard = ({ title, icon, expanded, onToggle, children }) => (
    <div className="glass-card overflow-hidden border-white/5">
        <button
            onClick={onToggle}
            className="w-full p-4 flex justify-between items-center bg-blue-500/5 hover:bg-blue-500/10 transition-colors"
        >
            <span className="font-bold text-sm text-slate-200 flex items-center gap-3">
                <span className="text-blue-400">{icon}</span>
                {title}
            </span>
            {expanded ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
        </button>
        {expanded && <div className="p-6 border-t border-white/5 bg-black/20">{children}</div>}
    </div>
);

// 새 전략 이름 입력 모달
const NewStrategyModal = ({ isOpen, onClose, onConfirm, loading, originalName }) => {
    const [strategyName, setStrategyName] = useState(`${originalName}_v2`);
    const [error, setError] = useState('');

    const handleConfirm = () => {
        if (!strategyName.trim()) {
            setError('전략 이름을 입력하세요');
            return;
        }
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(strategyName)) {
            setError('영문자, 숫자, 언더스코어만 사용 가능 (숫자로 시작 불가)');
            return;
        }
        setError('');
        onConfirm(strategyName);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-cyber-bg/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
            <div className="glass-card w-full max-w-md shadow-2xl p-8 border-blue-500/30">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <FileCode size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">새 전략 생성</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                    선택한 AI 개선 제안이 적용된 새로운 전략 파일(`.py`)을 생성합니다.
                </p>

                <div className="space-y-4 mb-8">
                    <div>
                        <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">새 전략 클래스 명</label>
                        <input
                            type="text"
                            value={strategyName}
                            onChange={(e) => setStrategyName(e.target.value)}
                            className="cyber-input w-full font-mono text-sm"
                            placeholder="MyStrategy_v2"
                        />
                        {error && <p className="text-red-400 text-xs mt-2 font-medium flex items-center gap-1.5">
                            <AlertTriangle size={12} /> {error}
                        </p>}
                    </div>

                    <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">저장 경로</div>
                        <code className="text-xs text-blue-400 font-mono break-all bg-black/30 p-1 rounded">user_data/strategies/{strategyName}.py</code>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl text-slate-400 font-bold hover:bg-slate-800 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="cyber-button flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                생성 중...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                생성하기
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AIFeedbackSection = ({ strategyName, backtestStats }) => {
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(false);
    const [applyLoading, setApplyLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState({
        summary: true,
        failures: true,
        suggestions: true
    });
    
    const [selectedSuggestions, setSelectedSuggestions] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);

    const analyzeStrategy = async () => {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        setSelectedSuggestions({});
        
        try {
            const response = await axios.post('/api/ai/analyze', {
                strategy_name: strategyName,
                backtest_stats: backtestStats
            });
            
            if (response.data.success) {
                setFeedback(response.data);
                const initial = {};
                response.data.suggestions?.forEach((_, idx) => {
                    initial[idx] = false;
                });
                setSelectedSuggestions(initial);
            } else {
                setError(response.data.error || '분석에 실패했습니다');
            }
        } catch (err) {
            console.error('AI Analysis error:', err);
            setError(err.response?.data?.detail || err.message || 'AI 서버와의 통신에 실패했습니다');
        } finally {
            setLoading(false);
        }
    };

    const toggleSuggestion = (idx) => {
        setSelectedSuggestions(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    const selectAll = () => {
        const all = {};
        feedback?.suggestions?.forEach((_, idx) => {
            all[idx] = true;
        });
        setSelectedSuggestions(all);
    };

    const getSelectedCount = () => {
        return Object.values(selectedSuggestions).filter(Boolean).length;
    };

    const handleApply = () => {
        if (getSelectedCount() === 0) {
            alert('적용할 제안을 하나 이상 선택하세요');
            return;
        }
        setShowModal(true);
    };

    const applySelectedSuggestions = async (newStrategyName) => {
        setApplyLoading(true);
        try {
            const selected = feedback.suggestions.filter((_, idx) => selectedSuggestions[idx]);
            const response = await axios.post('/api/ai/apply', {
                original_strategy_name: strategyName,
                new_strategy_name: newStrategyName,
                selected_suggestions: selected,
                backtest_stats: backtestStats
            });
            
            if (response.data.success) {
                setShowModal(false);
                setSuccessMessage({
                    name: response.data.new_strategy_name,
                    path: response.data.file_path
                });
            } else {
                alert(response.data.error || '전략 생성 실패');
            }
        } catch (err) {
            console.error('Apply error:', err);
            alert(err.response?.data?.detail || err.message || '전략 생성 실패');
        } finally {
            setApplyLoading(false);
        }
    };

    const severityColors = {
        high: 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]',
        medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]',
        low: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]'
    };

    const severityIcons = {
        high: <XCircle size={16} />,
        medium: <AlertTriangle size={16} />,
        low: <Info size={16} />
    };

    return (
        <section className="mt-12 space-y-6">
            <NewStrategyModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={applySelectedSuggestions}
                loading={applyLoading}
                originalName={strategyName}
            />

            {/* Header Card */}
            <div className="glass-card overflow-hidden border-blue-500/20">
                <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                            <BrainCircuit size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                AI 전략 피드백
                                <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-black tracking-widest uppercase align-middle">Gemini 2.5</span>
                            </h2>
                            <p className="text-slate-400 text-sm font-medium mt-1">
                                소스코드와 백테스트 결과를 분석하여 최적화 방안을 제안합니다.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={analyzeStrategy}
                        disabled={loading}
                        className={`cyber-button h-12 px-8 flex items-center gap-2 text-base group
                            ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                분석 중...
                            </>
                        ) : (
                            <>
                                <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                                {feedback ? '다시 분석하기' : 'AI 분석 시작'}
                            </>
                        )}
                    </button>
                </div>

                {/* Success/Error Notifications */}
                {successMessage && (
                    <div className="mx-8 mb-8 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3 text-emerald-400 font-bold text-sm">
                            <CheckCircle2 size={20} />
                            <span>새 전략 <strong className="underline underline-offset-4">{successMessage.name}</strong>이 성공적으로 생성되었습니다!</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 ml-8 font-medium">
                            목록에서 생성된 전략을 선택하여 새로운 백테스트를 수행해 보세요.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mx-8 mb-8 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in shake-1 duration-300">
                        <XCircle size={20} className="text-red-400" />
                        <span className="text-red-400 text-sm font-bold">{error}</span>
                    </div>
                )}

                {/* Content Area */}
                {!feedback && !loading && !error ? (
                    <div className="p-16 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-white/5">
                            <Bot size={40} className="text-slate-700" />
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold text-lg">전략 분석 데이터가 없습니다</p>
                            <p className="text-slate-600 text-sm mt-1 font-medium">상단의 'AI 분석 시작' 버튼을 눌러 피드백을 받아보세요.</p>
                        </div>
                    </div>
                ) : loading ? (
                    <div className="p-20 text-center space-y-6">
                        <div className="w-24 h-24 mx-auto relative">
                            <div className="absolute inset-0 rounded-full border-4 border-blue-500/10"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                            <BrainCircuit size={40} className="absolute inset-0 m-auto text-blue-400 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-white tracking-tight">AI가 전략을 검토하고 있습니다</p>
                            <p className="text-xs text-blue-400/60 mt-2 font-mono tracking-[0.2em] uppercase">Processing through Neural Engine...</p>
                        </div>
                    </div>
                ) : feedback && (
                    <div className="p-8 space-y-6">
                        
                        {/* 1. Strategy Summary */}
                        <CollapsibleCard
                            title="전략 구조 요약"
                            icon={<Code size={18} />}
                            expanded={expanded.summary}
                            onToggle={() => setExpanded({...expanded, summary: !expanded.summary})}
                        >
                            {feedback.strategy_summary && (
                                <div className="space-y-6">
                                    <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">사용된 주요 지표</div>
                                        <div className="flex flex-wrap gap-2.5">
                                            {feedback.strategy_summary.indicators?.map((ind, idx) => (
                                                <span 
                                                    key={idx}
                                                    className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 font-bold"
                                                >
                                                    {ind.name} <span className="opacity-50 font-mono font-normal ml-1">{ind.params && `(${ind.params})`}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5">
                                            <div className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <CheckCircle2 size={14} /> 진입 로직 (Entry)
                                            </div>
                                            <p className="text-sm text-slate-300 leading-relaxed font-medium">{feedback.strategy_summary.entry_logic}</p>
                                        </div>
                                        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5">
                                            <div className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <XCircle size={14} /> 청산 로직 (Exit)
                                            </div>
                                            <p className="text-sm text-slate-300 leading-relaxed font-medium">{feedback.strategy_summary.exit_logic}</p>
                                        </div>
                                    </div>

                                    {feedback.strategy_summary.risk_management && (
                                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5">
                                            <div className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Shield size={14} /> 리스크 관리
                                            </div>
                                            <p className="text-sm text-slate-300 leading-relaxed font-medium">{feedback.strategy_summary.risk_management}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CollapsibleCard>

                        {/* 2. Failure Analysis */}
                        <CollapsibleCard
                            title="취약점 분석 결과"
                            icon={<AlertTriangle size={18} />}
                            expanded={expanded.failures}
                            onToggle={() => setExpanded({...expanded, failures: !expanded.failures})}
                        >
                            <div className="grid grid-cols-1 gap-3">
                                {feedback.failure_analysis?.map((item, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`flex items-start gap-4 p-5 rounded-2xl border transition-all hover:bg-white/5 ${severityColors[item.severity] || severityColors.medium}`}
                                    >
                                        <div className="mt-1 flex-shrink-0">
                                            {severityIcons[item.severity] || severityIcons.medium}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-base font-bold tracking-tight mb-1">{item.issue}</div>
                                            <div className="text-xs font-medium opacity-80 leading-relaxed">{item.impact}</div>
                                        </div>
                                        <div className="text-[10px] font-black uppercase tracking-widest bg-black/20 px-2.5 py-1 rounded-full border border-current/20 flex-shrink-0">
                                            {item.severity}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CollapsibleCard>

                        {/* 3. Suggestions */}
                        <CollapsibleCard
                            title={`AI 개선 제안 (${getSelectedCount()}/${feedback.suggestions?.length || 0} 선택됨)`}
                            icon={<Lightbulb size={18} />}
                            expanded={expanded.suggestions}
                            onToggle={() => setExpanded({...expanded, suggestions: !expanded.suggestions})}
                        >
                            <div className="space-y-4">
                                {feedback.suggestions?.map((item, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => toggleSuggestion(idx)}
                                        className={`p-6 rounded-2xl border cursor-pointer transition-all relative overflow-hidden group ${
                                            selectedSuggestions[idx]
                                                ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                                                : 'bg-slate-900/40 border-white/5 hover:border-blue-500/30'
                                        }`}
                                    >
                                        <div className="flex items-start gap-5">
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mt-1 transition-all ${
                                                selectedSuggestions[idx]
                                                    ? 'bg-blue-500 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                                                    : 'border-slate-700'
                                            }`}>
                                                {selectedSuggestions[idx] && <Check size={18} className="text-white font-bold" />}
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                                                    <div className="font-bold text-white text-lg flex items-center gap-3 tracking-tight">
                                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-colors ${
                                                            selectedSuggestions[idx] ? 'bg-white text-blue-600' : 'bg-blue-500/20 text-blue-400'
                                                        }`}>
                                                            {item.id || idx + 1}
                                                        </span>
                                                        {item.title}
                                                    </div>
                                                    {item.expected_impact && (
                                                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                                            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">
                                                                {item.expected_impact}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400 font-medium leading-relaxed mb-4">{item.description}</p>
                                                {item.code_hint && (
                                                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                                                        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                                            <Code size={12} /> Code Highlight
                                                        </div>
                                                        <code className="text-xs text-blue-400/90 font-mono break-all leading-relaxed">{item.code_hint}</code>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Batch Actions */}
                            <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 pt-8 border-t border-white/5">
                                <div className="flex gap-2">
                                    <button
                                        onClick={selectAll}
                                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
                                    >
                                        전체 선택
                                    </button>
                                    <button
                                        onClick={() => setSelectedSuggestions({})}
                                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                                    >
                                        선택 해제
                                    </button>
                                </div>
                                <div className="hidden sm:block flex-1" />
                                <button
                                    onClick={handleApply}
                                    disabled={getSelectedCount() === 0}
                                    className={`cyber-button h-12 px-10 flex items-center gap-3 text-base shadow-[0_0_30px_rgba(59,130,246,0.2)] ${
                                        getSelectedCount() === 0 ? 'opacity-30 cursor-not-allowed filter grayscale' : 'animate-in fade-in zoom-in duration-300'
                                    }`}
                                >
                                    <FileCode size={20} />
                                    선택한 제안 적용 ({getSelectedCount()})
                                </button>
                            </div>
                        </CollapsibleCard>
                    </div>
                )}
            </div>
        </section>
    );
};

export default AIFeedbackSection;
