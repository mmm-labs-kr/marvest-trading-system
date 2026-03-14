import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { 
    FileCode, Plus, Save, Trash2, Search, 
    ChevronRight, Loader2, AlertCircle, CheckCircle2,
    FileText, Terminal, Download, Play, X, BarChart2,
    Clock, Award
} from 'lucide-react';

const API_BASE = "/api/configs";

function StrategyEditor() {
    const navigate = useNavigate();
    const [strategies, setStrategies] = useState([]);
    const [selectedName, setSelectedName] = useState(null);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchFilter] = useState("");
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newStrategyName, setNewStrategyName] = useState("");

    // --- [Backtest History State] ---
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    // --- [Data Fetching] ---

    const fetchStrategies = async () => {
        try {
            const res = await axios.get(`${API_BASE}/strategies/list`);
            setStrategies(res.data);
            if (res.data.length > 0 && !selectedName) {
                // 초기 로드 시 첫 번째 전략 선택
                loadStrategy(res.data[0]);
            }
        } catch (e) {
            console.error("전략 목록 로드 실패:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await axios.get('/api/backtest/results');
            // 최근 10개만 표시
            setHistory(res.data.slice(0, 10));
        } catch (e) {
            console.error("히스토리 로드 실패:", e);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const loadStrategy = async (name) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/strategies/${name}`);
            setSelectedName(name);
            setCode(res.data.code);
        } catch (e) {
            console.error("코드 로드 실패:", e);
            alert("코드를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedName) return;
        setSaving(true);
        try {
            await axios.put(`${API_BASE}/strategies/${selectedName}`, { code });
            alert("전략이 성공적으로 저장되었습니다.");
        } catch (e) {
            console.error("저장 실패:", e);
            alert("저장에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handleRunBacktest = async () => {
        if (!selectedName) return;
        if (isRunning) return;

        if (!window.confirm(`'${selectedName}' 전략으로 백테스트를 실행하시겠습니까?`)) return;

        setIsRunning(true);
        try {
            const response = await axios.post('/api/backtest/run', { strategy: selectedName });
            if (response.data.status === "success") {
                alert("백테스트 완료!");
                fetchHistory();
            } else {
                alert("백테스트 실패: " + response.data.message);
            }
        } catch (err) {
            alert("백테스트 요청 실패");
        } finally {
            setIsRunning(false);
        }
    };

    const handleCreate = async () => {
        if (!newStrategyName.trim()) return;
        try {
            // 기본 템플릿 코드
            const template = `from freqtrade.strategy import IStrategy
from pandas import DataFrame
import talib.abstract as ta

class ${newStrategyName}(IStrategy):
    minimal_roi = {"0": 0.1}
    stoploss = -0.10
    timeframe = '5m'

    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe['rsi'] = ta.RSI(dataframe, timeperiod=14)
        return dataframe

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[(dataframe['rsi'] < 30), 'enter_long'] = 1
        return dataframe

    def populate_exit_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        dataframe.loc[(dataframe['rsi'] > 70), 'exit_long'] = 1
        return dataframe
`;
            await axios.post(`${API_BASE}/strategies`, { 
                name: newStrategyName, 
                code: template 
            });
            setIsCreateModalOpen(false);
            setNewStrategyName("");
            fetchStrategies();
            loadStrategy(newStrategyName);
        } catch (e) {
            alert("생성 실패: " + (e.response?.data?.message || e.message));
        }
    };

    const handleDelete = async (name) => {
        if (!window.confirm(`정말 '${name}' 전략을 삭제하시겠습니까?`)) return;
        try {
            await axios.delete(`${API_BASE}/strategies/${name}`);
            if (selectedName === name) {
                setSelectedName(null);
                setCode("");
            }
            fetchStrategies();
        } catch (e) {
            alert("삭제 실패");
        }
    };

    const getGradeStyle = (grade) => {
        const styles = {
            'S': 'text-purple-400',
            'A': 'text-stealth-accent',
            'B': 'text-blue-400',
            'C': 'text-amber-400',
            'Fail': 'text-red-400',
        };
        return styles[grade] || 'text-slate-500';
    };

    useEffect(() => {
        fetchStrategies();
        fetchHistory();
    }, [fetchHistory]);

    const filteredStrategies = strategies.filter(s => 
        s.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-73px)] overflow-hidden">
            
            {/* [좌측 사이드바] 2단 구조 */}
            <div className="w-80 border-r border-stealth-border flex flex-col bg-stealth-card/30">
                
                {/* 1단: 전략 탐색기 (Top) */}
                <div className="flex-[3] flex flex-col min-h-0 border-b border-stealth-border">
                    <div className="p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Strategy Explorer</span>
                            <button 
                                onClick={() => setIsCreateModalOpen(true)}
                                className="p-1.5 rounded bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                title="새 전략 생성"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                        <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                            <input 
                                type="text"
                                placeholder="전략 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="w-full bg-black/40 border border-stealth-border rounded py-1.5 pl-9 pr-3 text-[11px] text-white focus:outline-none focus:border-white/20 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
                        {filteredStrategies.map(name => (
                            <div 
                                key={name}
                                onClick={() => loadStrategy(name)}
                                className={`group flex items-center justify-between px-3 py-2 rounded-sm cursor-pointer transition-all ${
                                    selectedName === name 
                                        ? 'bg-white/10 text-white' 
                                        : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <FileCode size={13} className={selectedName === name ? 'text-stealth-accent' : 'text-slate-600'} />
                                    <span className="text-[12px] font-bold truncate">
                                        {name}
                                    </span>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(name); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                                >
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2단: 백테스트 히스토리 (Bottom) */}
                <div className="flex-[2] flex flex-col min-h-0 bg-black/20">
                    <div className="p-5 flex justify-between items-center bg-white/[0.02]">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Clock size={12} /> Recent Reports
                        </span>
                        <button 
                            onClick={fetchHistory}
                            disabled={historyLoading}
                            className="text-slate-600 hover:text-white transition-colors"
                        >
                            <Loader2 size={12} className={historyLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                        {history.map((item, idx) => {
                            const grade = item.score?.grade || 'N/A';
                            return (
                                <div 
                                    key={idx}
                                    onClick={() => navigate(`/result/${item.filename}`)}
                                    className="p-3 bg-white/[0.03] border border-white/5 rounded-sm hover:border-white/20 transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-1.5">
                                        <span className="text-[11px] font-bold text-slate-300 group-hover:text-white truncate pr-2">
                                            {item.strategy}
                                        </span>
                                        <span className={`text-[11px] font-black ${getGradeStyle(grade)}`}>
                                            {grade}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-mono text-slate-600 uppercase">
                                            {item.filename.split('_').slice(1, 3).join(' ')}
                                        </span>
                                        <span className={`text-[10px] font-black ${item.total_profit_pct >= 0 ? 'text-stealth-accent' : 'text-red-500'}`}>
                                            {item.total_profit_pct >= 0 ? '+' : ''}{item.total_profit_pct}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {history.length === 0 && !historyLoading && (
                            <div className="text-center py-10 text-[9px] font-black text-slate-700 uppercase tracking-widest">No History</div>
                        )}
                    </div>
                </div>
            </div>

            {/* [우측] 코드 에디터 영역 */}
            <div className="flex-1 flex flex-col min-w-0 bg-stealth-bg">
                {selectedName ? (
                    <>
                        {/* 에디터 툴바 */}
                        <div className="h-14 border-b border-stealth-border flex items-center justify-between px-6 bg-stealth-card/20 backdrop-blur-sm shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Editing_File:</span>
                                        <span className="text-xs font-bold text-white font-mono">{selectedName}.py</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleRunBacktest}
                                    disabled={isRunning}
                                    className={`cyber-button flex items-center gap-2 text-[11px] py-1.5 h-auto transition-all ${
                                        isRunning 
                                            ? 'bg-white/5 border-white/5 text-slate-600 cursor-not-allowed' 
                                            : 'bg-white/5 border-white/10 text-white hover:bg-white hover:text-black hover:border-white'
                                    }`}
                                >
                                    {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
                                    {isRunning ? '시뮬레이션 중...' : '백테스트 실행 (Run)'}
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="cyber-button flex items-center gap-2 text-[11px] py-1.5 h-auto bg-stealth-accent border-stealth-accent text-black hover:bg-white hover:border-white"
                                >
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    소스 저장 (Save)
                                </button>
                            </div>
                        </div>

                        {/* Monaco Editor Container */}
                        <div className="flex-1 relative">
                            {loading && (
                                <div className="absolute inset-0 z-10 bg-stealth-bg/50 backdrop-blur-[1px] flex items-center justify-center">
                                    <Loader2 size={32} className="animate-spin text-slate-600" />
                                </div>
                            )}
                            <Editor
                                height="100%"
                                defaultLanguage="python"
                                theme="vs-dark"
                                value={code}
                                onChange={(value) => setCode(value || "")}
                                options={{
                                    fontSize: 14,
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    minimap: { enabled: true },
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    padding: { top: 20 },
                                    backgroundColor: '#121212'
                                }}
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-6 p-10 text-center">
                        <Terminal size={48} strokeWidth={1} className="opacity-20" />
                        <div className="max-w-xs">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2">Editor_Buffer_Empty</p>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                사이드바에서 전략을 선택하거나 새로운 유닛을 생성하여 개발을 시작하세요.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* [모달] 새로운 전략 생성 */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-md p-10 border-white/10 shadow-2xl">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                                <Plus size={18} /> 전략 신규 생성
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-600 hover:text-white transition-colors">
                                <X size={24}/>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2.5">전략 이름 (Class Name)</label>
                                <input 
                                    className="cyber-input w-full font-mono text-lg py-3"
                                    placeholder="예: MovingAverageCross"
                                    value={newStrategyName}
                                    onChange={(e) => setNewStrategyName(e.target.value)}
                                    autoFocus
                                />
                                <p className="mt-3 text-[10px] text-slate-600 leading-relaxed font-medium">
                                    영문자로 시작하는 클래스 이름을 입력하세요. 기본 전략 템플릿이 자동으로 생성됩니다.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button 
                                onClick={() => setIsCreateModalOpen(false)}
                                className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                            >
                                취소
                            </button>
                            <button 
                                onClick={handleCreate}
                                className="flex-1 cyber-button py-3 text-[11px]"
                            >
                                생성 및 편집
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StrategyEditor;
