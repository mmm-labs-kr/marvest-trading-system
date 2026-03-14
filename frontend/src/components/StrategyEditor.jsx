import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { 
    FileCode, Plus, Save, Trash2, Search, 
    ChevronRight, Loader2, AlertCircle, CheckCircle2,
    FileText, Terminal, Download, Play, X
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

    const handleRunBacktest = () => {
        if (!selectedName) return;
        // 저장 여부 확인 후 이동
        navigate(`/backtest?strategy=${selectedName}`);
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

    useEffect(() => {
        fetchStrategies();
    }, []);

    const filteredStrategies = strategies.filter(s => 
        s.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-73px)] overflow-hidden">
            
            {/* [좌측] 전략 탐색기 */}
            <div className="w-72 border-r border-stealth-border flex flex-col bg-stealth-card/30">
                <div className="p-6 border-b border-stealth-border flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Strategy Explorer</span>
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="p-1.5 rounded bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                            title="새 전략 생성"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                        <input 
                            type="text"
                            placeholder="전략 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            className="w-full bg-black/40 border border-stealth-border rounded py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-white/20 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {filteredStrategies.map(name => (
                        <div 
                            key={name}
                            onClick={() => loadStrategy(name)}
                            className={`group flex items-center justify-between px-4 py-3 rounded cursor-pointer transition-all ${
                                selectedName === name 
                                    ? 'bg-white/5 border border-white/10 shadow-lg' 
                                    : 'hover:bg-white/[0.02] border border-transparent'
                            }`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileCode size={14} className={selectedName === name ? 'text-stealth-accent' : 'text-slate-600'} />
                                <span className={`text-[13px] font-semibold truncate ${selectedName === name ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                    {name}
                                </span>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(name); }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-500 transition-all"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    {filteredStrategies.length === 0 && (
                        <div className="text-center py-20 text-[10px] font-black text-slate-700 uppercase tracking-widest">검색 결과가 없습니다</div>
                    )}
                </div>
            </div>

            {/* [우측] 코드 에디터 */}
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
                                    className="cyber-button flex items-center gap-2 text-[11px] py-1.5 h-auto bg-white/5 border-white/10 text-white hover:bg-white hover:text-black hover:border-white transition-all"
                                >
                                    <Play size={14} fill="currentColor" />
                                    백테스트 실행 (Run)
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
