import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, TrendingDown, FileText, Play, X, Loader2, List, Plus } from 'lucide-react';

function BacktestList() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- 모달 및 실행 관련 상태 ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [strategyName, setStrategyName] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [runLog, setRunLog] = useState(null);

  const fetchResults = async () => {
    try {
      const response = await axios.get('/api/backtest/results');
      setResults(response.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleRunBacktest = async () => {
    if (!strategyName.trim()) {
      alert("전략 이름을 입력해주세요!");
      return;
    }
    setIsRunning(true);
    setRunLog(null);
    try {
      const response = await axios.post('/api/backtest/run', { strategy: strategyName });
      if (response.data.status === "success") {
        setRunLog(response.data.output);
        fetchResults();
      } else {
        setRunLog(`[Error] ${response.data.message}\n${response.data.output}`);
      }
    } catch (err) {
      setRunLog(`[System Error] 서버 통신 실패: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setStrategyName("");
    setRunLog(null);
  };

  // 등급별 스타일 (Stealth 버전)
  const getGradeStyle = (grade) => {
    const styles = {
      'S': 'text-purple-400 border-purple-500/40',
      'A': 'text-stealth-accent border-stealth-accent/40',
      'B': 'text-blue-400 border-blue-500/40',
      'C': 'text-amber-400 border-amber-400/40',
      'Fail': 'text-red-400 border-red-500/40',
    };
    return styles[grade] || 'text-slate-500 border-slate-700';
  };

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center text-white font-black tracking-[0.2em] uppercase text-xs">
      <Loader2 className="animate-spin mr-3 text-slate-500" /> 데이터 로드 중...
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* 헤더 섹션 */}
      <div className="flex justify-between items-center border-b border-stealth-border pb-8">
        <div className="flex items-center gap-4">
          <div className="w-1 bg-white h-8"></div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">백테스트 히스토리</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5">전략 성과 기록부</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="cyber-button flex items-center gap-2 text-xs"
        >
          <Plus size={16} strokeWidth={3} />
          새 테스트 실행
        </button>
      </div>
      
      {/* 결과 목록 테이블 */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-stealth-border bg-white/[0.02]">
                <th className="py-5 px-8 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] text-center w-28">등급</th>
                <th className="py-5 px-8 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em]">전략 클래스</th>
                <th className="py-5 px-8 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em]">리소스 파일</th>
                <th className="py-5 px-8 text-right font-black text-slate-500 text-[9px] uppercase tracking-[0.2em]">거래 횟수</th>
                <th className="py-5 px-8 text-right font-black text-slate-500 text-[9px] uppercase tracking-[0.2em]">승률</th>
                <th className="py-5 px-8 text-right font-black text-slate-500 text-[9px] uppercase tracking-[0.2em]">수익률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stealth-border">
              {results.map((item, index) => {
                const scoreData = item.score || { total_score: 0, grade: 'N/A' };
                
                return (
                  <tr 
                    key={index} 
                    onClick={() => navigate(`/result/${item.filename}`)} 
                    className="hover:bg-white/[0.03] transition-all cursor-pointer group"
                  >
                    <td className="py-6 px-8 text-center">
                      <div className={`inline-flex flex-col items-center justify-center border rounded-md w-12 h-12 transition-transform group-hover:scale-110 ${getGradeStyle(scoreData.grade)}`}>
                        <span className="text-lg font-black leading-none">{scoreData.grade}</span>
                        <span className="text-[8px] font-black mt-1 opacity-60">{scoreData.total_score}</span>
                      </div>
                    </td>

                    <td className="py-6 px-8">
                      <span className="text-white font-bold group-hover:text-stealth-accent transition-colors block text-sm">
                        {item.strategy}
                      </span>
                    </td>
                    <td className="py-6 px-8">
                       <div className="flex items-center gap-2 text-slate-500 text-[10px] font-mono group-hover:text-slate-300 transition-colors uppercase tracking-tighter">
                        <FileText size={12} />
                        {item.filename}
                       </div>
                    </td>
                    <td className="py-6 px-8 text-right">
                        <span className="font-mono text-slate-400 font-bold text-xs">{item.total_trades}회</span>
                    </td>
                    <td className="py-6 px-8 text-right">
                        <span className="font-mono text-slate-400 font-bold text-xs">{item.win_rate}%</span>
                    </td>
                    <td className="py-6 px-8 text-right">
                      <div className={`inline-flex items-center justify-end gap-1.5 font-mono font-black text-sm ${
                        item.total_profit_pct >= 0 ? 'text-stealth-accent' : 'text-red-500'
                      }`}>
                        {item.total_profit_pct >= 0 ? '+' : ''}{item.total_profit_pct}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-slate-600 gap-4">
            <List size={32} strokeWidth={1} className="opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">데이터가 없습니다</p>
          </div>
        )}
      </div>

      {/* --- 모달 (Popup) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-lg overflow-hidden border-white/10 shadow-2xl">
            {/* 모달 헤더 */}
            <div className="px-8 py-6 border-b border-stealth-border flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <Play size={16} fill="white" className="text-white" />
                <h3 className="font-black text-white text-xs uppercase tracking-[0.2em]">시뮬레이션 실행</h3>
              </div>
              {!isRunning && (
                <button onClick={closeModal} className="p-1 rounded text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              )}
            </div>

            {/* 모달 본문 */}
            <div className="p-8">
              {!isRunning && !runLog ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] mb-3">
                      전략 클래스 식별자
                    </label>
                    <input 
                      type="text"
                      value={strategyName}
                      onChange={(e) => setStrategyName(e.target.value)}
                      placeholder="예: MyStrategy"
                      className="cyber-input w-full font-mono text-sm"
                    />
                    <div className="mt-4 flex items-start gap-3 p-4 bg-white/[0.02] rounded-md border border-white/5">
                       <div className="w-1 h-1 bg-white rounded-full mt-1.5 flex-shrink-0"></div>
                       <p className="text-[10px] text-slate-500 leading-relaxed font-medium uppercase tracking-tight">
                         파이썬 파일 내부에 정의된 정확한 클래스 명칭을 입력해 주세요.
                       </p>
                    </div>
                  </div>
                </div>
              ) : isRunning ? (
                <div className="text-center py-16 space-y-6">
                  <Loader2 size={32} className="animate-spin text-white mx-auto" />
                  <div>
                    <p className="text-xs font-black text-white tracking-[0.3em] uppercase">엔진 초기화 중</p>
                    <p className="text-[9px] text-slate-600 mt-2 font-black tracking-widest uppercase">고주기 시뮬레이션 분석을 수행하고 있습니다...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-stealth-accent text-[10px] uppercase tracking-[0.3em]">상태: 완료됨</span>
                  </div>
                  <div className="bg-black/60 border border-stealth-border p-5 rounded text-[10px] font-mono h-64 overflow-auto text-slate-400 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {runLog}
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="px-8 py-6 border-t border-stealth-border bg-white/[0.02] flex justify-end gap-4">
              {!isRunning && !runLog && (
                <>
                  <button 
                    onClick={closeModal}
                    className="px-4 py-2 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    중단
                  </button>
                  <button 
                    onClick={handleRunBacktest}
                    className="cyber-button text-[10px]"
                  >
                    실행하기
                  </button>
                </>
              )}
              {!isRunning && runLog && (
                <button 
                  onClick={closeModal}
                  className="px-8 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  터미널 닫기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default BacktestList;
