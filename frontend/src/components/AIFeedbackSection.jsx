import React, { useState } from 'react';
import axios from 'axios';
import { 
    Bot, Lightbulb, AlertTriangle, ChevronDown, ChevronUp, 
    Loader2, Sparkles, Code, CheckCircle2, XCircle, Info,
    FileCode, X, Check
} from 'lucide-react';

// 접을 수 있는 카드 컴포넌트
const CollapsibleCard = ({ title, icon, expanded, onToggle, children }) => (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
        <button
            onClick={onToggle}
            className="w-full p-3 flex justify-between items-center bg-black/30 hover:bg-black/50 transition-colors"
        >
            <span className="font-bold text-sm text-white flex items-center gap-2">
                {icon} {title}
            </span>
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
        {expanded && <div className="p-4 border-t border-gray-800">{children}</div>}
    </div>
);

// 새 전략 이름 입력 모달
const NewStrategyModal = ({ isOpen, onClose, onConfirm, loading, originalName }) => {
    const [strategyName, setStrategyName] = useState(`${originalName}_v2`);
    const [error, setError] = useState('');

    const handleConfirm = () => {
        // 유효성 검사
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] border border-purple-500 w-full max-w-md rounded-xl shadow-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileCode className="text-purple-400" size={20} />
                        새 전략 생성
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-sm text-gray-400 mb-4">
                    선택한 개선 제안이 적용된 새 전략 파일이 생성됩니다.
                </p>

                <div className="mb-4">
                    <label className="block text-xs text-gray-500 uppercase mb-2">전략 이름</label>
                    <input
                        type="text"
                        value={strategyName}
                        onChange={(e) => setStrategyName(e.target.value)}
                        className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white 
                                   focus:border-purple-500 focus:outline-none font-mono"
                        placeholder="MyStrategy_v2"
                    />
                    {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                </div>

                <div className="text-xs text-gray-600 mb-4 p-3 bg-black/50 rounded border border-gray-800">
                    <p>📁 저장 위치: <code className="text-purple-400">user_data/strategies/{strategyName}.py</code></p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-700 rounded-lg text-gray-400 
                                   hover:bg-gray-800 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white 
                                   font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                생성 중...
                            </>
                        ) : (
                            <>
                                <Check size={16} />
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
    
    // 제안 선택 상태
    const [selectedSuggestions, setSelectedSuggestions] = useState({});
    
    // 모달 상태
    const [showModal, setShowModal] = useState(false);
    
    // 성공 메시지
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
                // 모든 제안 초기 선택 해제
                const initial = {};
                response.data.suggestions?.forEach((_, idx) => {
                    initial[idx] = false;
                });
                setSelectedSuggestions(initial);
            } else {
                setError(response.data.error || 'Analysis failed');
            }
        } catch (err) {
            console.error('AI Analysis error:', err);
            setError(err.response?.data?.detail || err.message || 'Failed to analyze strategy');
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
            // 선택된 제안만 필터링
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
        high: 'text-red-400 bg-red-900/20 border-red-900/50',
        medium: 'text-yellow-400 bg-yellow-900/20 border-yellow-900/50',
        low: 'text-blue-400 bg-blue-900/20 border-blue-900/50'
    };

    const severityIcons = {
        high: <XCircle size={14} />,
        medium: <AlertTriangle size={14} />,
        low: <Info size={14} />
    };

    return (
        <section className="bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden mt-6">
            {/* 새 전략 이름 입력 모달 */}
            <NewStrategyModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={applySelectedSuggestions}
                loading={applyLoading}
                originalName={strategyName}
            />

            {/* Header */}
            <div className="p-4 md:p-6 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Bot className="text-purple-400" size={20} />
                        AI Strategy Feedback
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Powered by Gemini AI • Analyzes code & backtest results
                    </p>
                </div>
                <button
                    onClick={analyzeStrategy}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all
                        ${loading 
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                            : 'bg-purple-600 hover:bg-purple-500 text-white hover:shadow-lg hover:shadow-purple-500/20'
                        }`}
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            {feedback ? 'Re-analyze' : 'Analyze Strategy'}
                        </>
                    )}
                </button>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="p-4 bg-green-900/20 border-b border-green-900/50">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                        <CheckCircle2 size={16} />
                        <span>
                            새 전략 <strong>{successMessage.name}</strong>이 생성되었습니다!
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        백테스트 목록에서 새 전략을 선택하여 테스트하세요.
                    </p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-900/20 border-b border-red-900/50">
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                        <XCircle size={16} />
                        {error}
                    </div>
                </div>
            )}

            {/* Initial State */}
            {!feedback && !loading && !error && (
                <div className="p-12 text-center text-gray-600">
                    <Bot size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">Click "Analyze Strategy" to get AI-powered feedback</p>
                    <p className="text-xs text-gray-700 mt-2">
                        AI will analyze your strategy code and backtest results
                    </p>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="p-12 text-center">
                    <Loader2 size={48} className="mx-auto mb-4 text-purple-500 animate-spin" />
                    <p className="text-sm text-gray-400">Analyzing strategy with AI...</p>
                    <p className="text-xs text-gray-600 mt-2">This may take 10-20 seconds</p>
                </div>
            )}

            {/* Feedback Content */}
            {feedback && !loading && (
                <div className="p-4 md:p-6 space-y-4">
                    
                    {/* Strategy Summary */}
                    <CollapsibleCard
                        title="Strategy Summary"
                        icon={<Code size={16} className="text-blue-400" />}
                        expanded={expanded.summary}
                        onToggle={() => setExpanded({...expanded, summary: !expanded.summary})}
                    >
                        {feedback.strategy_summary && (
                            <div className="space-y-4">
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase mb-2">Indicators Used</div>
                                    <div className="flex flex-wrap gap-2">
                                        {feedback.strategy_summary.indicators?.map((ind, idx) => (
                                            <span 
                                                key={idx}
                                                className="px-2 py-1 bg-blue-900/30 border border-blue-900/50 rounded text-xs text-blue-300"
                                            >
                                                {ind.name} {ind.params && `(${ind.params})`}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-green-900/10 border border-green-900/30 rounded-lg p-3">
                                        <div className="text-[10px] text-green-500 uppercase mb-2 flex items-center gap-1">
                                            <CheckCircle2 size={12} /> Entry Logic
                                        </div>
                                        <p className="text-xs text-gray-300">{feedback.strategy_summary.entry_logic}</p>
                                    </div>
                                    <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-3">
                                        <div className="text-[10px] text-red-500 uppercase mb-2 flex items-center gap-1">
                                            <XCircle size={12} /> Exit Logic
                                        </div>
                                        <p className="text-xs text-gray-300">{feedback.strategy_summary.exit_logic}</p>
                                    </div>
                                </div>

                                {feedback.strategy_summary.risk_management && (
                                    <div className="bg-yellow-900/10 border border-yellow-900/30 rounded-lg p-3">
                                        <div className="text-[10px] text-yellow-500 uppercase mb-2 flex items-center gap-1">
                                            <AlertTriangle size={12} /> Risk Management
                                        </div>
                                        <p className="text-xs text-gray-300">{feedback.strategy_summary.risk_management}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CollapsibleCard>

                    {/* Failure Analysis */}
                    <CollapsibleCard
                        title="Failure Analysis"
                        icon={<XCircle size={16} className="text-red-400" />}
                        expanded={expanded.failures}
                        onToggle={() => setExpanded({...expanded, failures: !expanded.failures})}
                    >
                        <div className="space-y-2">
                            {feedback.failure_analysis?.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex items-start gap-3 p-3 rounded-lg border ${severityColors[item.severity] || severityColors.medium}`}
                                >
                                    <div className="mt-0.5">
                                        {severityIcons[item.severity] || severityIcons.medium}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">{item.issue}</div>
                                        <div className="text-xs opacity-70 mt-1">{item.impact}</div>
                                    </div>
                                    <span className="text-[9px] uppercase font-bold opacity-50">
                                        {item.severity}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CollapsibleCard>

                    {/* Suggestions with Checkboxes */}
                    <CollapsibleCard
                        title={`Improvement Suggestions (${getSelectedCount()}/${feedback.suggestions?.length || 0} selected)`}
                        icon={<Lightbulb size={16} className="text-yellow-400" />}
                        expanded={expanded.suggestions}
                        onToggle={() => setExpanded({...expanded, suggestions: !expanded.suggestions})}
                    >
                        <div className="space-y-3">
                            {feedback.suggestions?.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => toggleSuggestion(idx)}
                                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                        selectedSuggestions[idx]
                                            ? 'bg-purple-900/20 border-purple-500'
                                            : 'bg-gradient-to-r from-yellow-900/10 to-orange-900/10 border-yellow-900/30 hover:border-yellow-700'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Checkbox */}
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
                                            selectedSuggestions[idx]
                                                ? 'bg-purple-600 border-purple-600'
                                                : 'border-gray-600'
                                        }`}>
                                            {selectedSuggestions[idx] && <Check size={14} className="text-white" />}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-medium text-white text-sm flex items-center gap-2">
                                                    <span className="w-5 h-5 bg-yellow-600 rounded-full flex items-center justify-center text-[10px] text-black font-bold">
                                                        {item.id || idx + 1}
                                                    </span>
                                                    {item.title}
                                                </div>
                                                {item.expected_impact && (
                                                    <span className="text-[10px] text-green-400 bg-green-900/30 px-2 py-1 rounded">
                                                        {item.expected_impact}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mb-2">{item.description}</p>
                                            {item.code_hint && (
                                                <div className="mt-2 p-2 bg-black/50 rounded border border-gray-800">
                                                    <div className="text-[9px] text-gray-500 uppercase mb-1">Code Hint</div>
                                                    <code className="text-xs text-purple-400 font-mono break-all">{item.code_hint}</code>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-800">
                            <button
                                onClick={selectAll}
                                className="px-3 py-2 text-xs border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors"
                            >
                                Select All
                            </button>
                            <button
                                onClick={() => setSelectedSuggestions({})}
                                className="px-3 py-2 text-xs border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors"
                            >
                                Clear Selection
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={handleApply}
                                disabled={getSelectedCount() === 0}
                                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                                    getSelectedCount() > 0
                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white'
                                        : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                }`}
                            >
                                <FileCode size={16} />
                                Apply Selected ({getSelectedCount()})
                            </button>
                        </div>
                    </CollapsibleCard>
                </div>
            )}
        </section>
    );
};

export default AIFeedbackSection;