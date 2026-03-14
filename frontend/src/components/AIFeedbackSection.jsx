import React, { useState } from 'react';
import axios from 'axios';
import { 
    Bot, Lightbulb, AlertTriangle, ChevronDown, ChevronUp, 
    Loader2, Sparkles, Code, CheckCircle2, XCircle, Info,
    FileCode, X, Check, Cpu
} from 'lucide-react';

// 접을 수 있는 카드 컴포넌트 (Stealth)
const CollapsibleCard = ({ title, icon, expanded, onToggle, children }) => (
    <div className="glass-card overflow-hidden">
        <button
            onClick={onToggle}
            className="w-full p-5 flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.03] transition-colors"
        >
            <span className="font-black text-[10px] text-slate-400 flex items-center gap-4 uppercase tracking-[0.2em]">
                <span className="text-white">{icon}</span>
                {title}
            </span>
            {expanded ? <ChevronUp size={16} className="text-slate-600" /> : <ChevronDown size={16} className="text-slate-600" />}
        </button>
        {expanded && <div className="p-8 border-t border-stealth-border">{children}</div>}
    </div>
);

// 새 전략 이름 입력 모달 (Stealth)
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="glass-card w-full max-w-md p-10 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">Deploy New Strategy</h3>
                    <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-8 mb-10">
                    <div>
                        <label className="block text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-3">Identifier</label>
                        <input
                            type="text"
                            value={strategyName}
                            onChange={(e) => setStrategyName(e.target.value)}
                            className="cyber-input w-full font-mono text-sm"
                            placeholder="MyStrategy_v2"
                        />
                        {error && <p className="text-red-500 text-[10px] mt-2 font-bold uppercase tracking-tight">{error}</p>}
                    </div>

                    <div className="p-5 bg-white/[0.02] rounded border border-white/5">
                        <div className="text-[8px] text-slate-600 font-black uppercase tracking-[0.3em] mb-2">Target Path</div>
                        <code className="text-[10px] text-slate-400 font-mono break-all font-bold">user_data/strategies/{strategyName}.py</code>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="cyber-button flex-1 text-[10px]"
                    >
                        {loading ? 'Processing...' : 'Confirm'}
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
        high: 'text-red-500 border-red-500/20 bg-red-500/5',
        medium: 'text-amber-500 border-amber-500/20 bg-amber-500/5',
        low: 'text-slate-400 border-white/10 bg-white/5'
    };

    return (
        <section className="mt-16 space-y-10 animate-in fade-in duration-700">
            <NewStrategyModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={applySelectedSuggestions}
                loading={applyLoading}
                originalName={strategyName}
            />

            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-stealth-border pb-10">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white flex items-center justify-center text-black rounded shadow-2xl">
                        <Cpu size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-[0.15em]">Intelligence Analysis</h2>
                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.25em] mt-1.5 flex items-center gap-2">
                            Gemini 2.5 Logic Engine <div className="w-1 h-1 bg-white rounded-full"></div> Offline Mode
                        </p>
                    </div>
                </div>
                <button
                    onClick={analyzeStrategy}
                    disabled={loading}
                    className={`cyber-button flex items-center gap-3 text-[10px] uppercase tracking-widest px-8
                        ${loading ? 'opacity-30' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 size={14} className="animate-spin" /> Analyzing
                        </>
                    ) : (
                        <>
                            <Sparkles size={14} /> Run Neural Audit
                        </>
                    )}
                </button>
            </div>

            {/* Notifications */}
            {successMessage && (
                <div className="p-6 bg-stealth-accent/5 border border-stealth-accent/20 rounded flex items-center gap-4 animate-in slide-in-from-left-4">
                    <CheckCircle2 size={20} className="text-stealth-accent" />
                    <span className="text-[10px] text-stealth-accent font-black uppercase tracking-[0.2em]">Strategy Deployed: {successMessage.name}</span>
                </div>
            )}

            {/* Content Area */}
            {!feedback && !loading ? (
                <div className="py-20 text-center border border-dashed border-stealth-border rounded">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">No diagnostic data present</p>
                </div>
            ) : loading ? (
                <div className="py-24 text-center space-y-6">
                    <Loader2 size={32} className="animate-spin text-white mx-auto opacity-20" />
                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.4em] animate-pulse">Deep inspection in progress</p>
                </div>
            ) : feedback && (
                <div className="grid grid-cols-1 gap-6">
                    
                    {/* Summary */}
                    <CollapsibleCard
                        title="Architecture Summary"
                        icon={<Code size={14} />}
                        expanded={expanded.summary}
                        onToggle={() => setExpanded({...expanded, summary: !expanded.summary})}
                    >
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <div className="text-[8px] text-slate-600 font-black uppercase tracking-[0.3em] mb-5">Primary Indicators</div>
                                    <div className="flex flex-wrap gap-2">
                                        {feedback.strategy_summary.indicators?.map((ind, idx) => (
                                            <span key={idx} className="px-3 py-1.5 border border-white/10 text-[10px] font-black text-white uppercase tracking-tighter bg-white/[0.02]">
                                                {ind.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="text-[8px] text-slate-600 font-black uppercase tracking-[0.3em]">Logic Definition</div>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-1.5 h-1.5 bg-stealth-accent rounded-full mt-1.5"></div>
                                            <p className="text-xs text-slate-400 font-medium leading-relaxed uppercase tracking-tight">{feedback.strategy_summary.entry_logic}</p>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5"></div>
                                            <p className="text-xs text-slate-400 font-medium leading-relaxed uppercase tracking-tight">{feedback.strategy_summary.exit_logic}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CollapsibleCard>

                    {/* Failures */}
                    <CollapsibleCard
                        title="Vulnerability Audit"
                        icon={<AlertTriangle size={14} />}
                        expanded={expanded.failures}
                        onToggle={() => setExpanded({...expanded, failures: !expanded.failures})}
                    >
                        <div className="grid grid-cols-1 gap-4">
                            {feedback.failure_analysis?.map((item, idx) => (
                                <div key={idx} className={`p-6 border rounded-sm flex justify-between items-center ${severityColors[item.severity]}`}>
                                    <div className="flex-1">
                                        <div className="text-xs font-black uppercase tracking-widest mb-1.5">{item.issue}</div>
                                        <div className="text-[10px] opacity-70 font-medium leading-relaxed uppercase">{item.impact}</div>
                                    </div>
                                    <div className="text-[8px] font-black uppercase border border-current/30 px-3 py-1 ml-6">{item.severity}</div>
                                </div>
                            ))}
                        </div>
                    </CollapsibleCard>

                    {/* Suggestions */}
                    <CollapsibleCard
                        title={`Optimization Proposals (${getSelectedCount()}/${feedback.suggestions?.length || 0})`}
                        icon={<Lightbulb size={14} />}
                        expanded={expanded.suggestions}
                        onToggle={() => setExpanded({...expanded, suggestions: !expanded.suggestions})}
                    >
                        <div className="space-y-4">
                            {feedback.suggestions?.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => toggleSuggestion(idx)}
                                    className={`p-8 border cursor-pointer transition-all ${
                                        selectedSuggestions[idx]
                                            ? 'border-white bg-white/[0.03]'
                                            : 'border-white/5 bg-transparent hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-start gap-8">
                                        <div className={`w-5 h-5 border flex items-center justify-center mt-1.5 transition-all ${
                                            selectedSuggestions[idx] ? 'bg-white text-black border-white' : 'border-slate-700'
                                        }`}>
                                            {selectedSuggestions[idx] && <Check size={14} strokeWidth={4} />}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="font-black text-white text-xs uppercase tracking-[0.1em]">{item.title}</div>
                                                {item.expected_impact && (
                                                    <span className="text-[8px] font-black text-stealth-accent border border-stealth-accent/30 px-2.5 py-1 uppercase tracking-widest">
                                                        Impact: {item.expected_impact}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed uppercase tracking-tight mb-6">{item.description}</p>
                                            {item.code_hint && (
                                                <div className="p-5 bg-black/40 border border-white/5 rounded-sm">
                                                    <div className="text-[8px] text-slate-700 font-black uppercase mb-3">Refactoring Hint</div>
                                                    <code className="text-[10px] text-white/60 font-mono break-all">{item.code_hint}</code>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-6 mt-10 pt-10 border-t border-stealth-border">
                            <div className="flex gap-4">
                                <button onClick={selectAll} className="text-[9px] font-black text-slate-600 hover:text-white uppercase tracking-[0.2em] transition-colors">Select All</button>
                                <button onClick={() => setSelectedSuggestions({})} className="text-[9px] font-black text-slate-600 hover:text-red-500 uppercase tracking-[0.2em] transition-colors">Clear</button>
                            </div>
                            <div className="flex-1" />
                            <button
                                onClick={handleApply}
                                disabled={getSelectedCount() === 0}
                                className={`cyber-button h-12 px-12 text-[10px] ${getSelectedCount() === 0 ? 'opacity-20 grayscale' : ''}`}
                            >
                                Apply Selected Refactoring
                            </button>
                        </div>
                    </CollapsibleCard>
                </div>
            )}
        </section>
    );
};

export default AIFeedbackSection;
