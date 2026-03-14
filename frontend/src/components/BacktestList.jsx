import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, TrendingDown, FileText, Play, X, Loader2, Award, History, Plus } from 'lucide-react';

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

  // 등급별 배지 색상 결정 함수
  const getGradeBadge = (grade) => {
    const styles = {
      'S': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      'A': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      'B': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      'C': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      'Fail': 'bg-red-500/10 text-red-400 border-red-500/30',
    };
    const defaultStyle = 'bg-slate-800/50 text-slate-400 border-slate-700/50';
    return styles[grade] || defaultStyle;
  };

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center text-blue-400 font-medium tracking-widest uppercase">
      <Loader2 className="animate-spin mr-3" /> 데이터 로드 중...
    </div>
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* 헤더 섹션 */}
      <div className="flex justify-between items-center bg-blue-500/5 border border-blue-500/10 p-6 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <History size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">백테스트 히스토리</h1>
            <p className="text-slate-400 text-sm font-medium">전략별 성과 분석 및 리스크 평가 이력</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="cyber-button flex items-center gap-2 text-sm"
        >
          <Plus size={18} />
          새 백테스트 실행
        </button>
      </div>
      
      {/* 결과 목록 테이블 */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-blue-500/10 bg-blue-500/5">
                <th className="py-4 px-6 font-bold text-slate-400 text-[11px] uppercase tracking-widest text-center w-24">등급</th>
                <th className="py-4 px-6 font-bold text-slate-400 text-[11px] uppercase tracking-widest">전략 클래스</th>
                <th className="py-4 px-6 font-bold text-slate-400 text-[11px] uppercase tracking-widest">결과 파일</th>
                <th className="py-4 px-6 text-right font-bold text-slate-400 text-[11px] uppercase tracking-widest">거래 횟수</th>
                <th className="py-4 px-6 text-right font-bold text-slate-400 text-[11px] uppercase tracking-widest">승률</th>
                <th className="py-4 px-6 text-right font-bold text-slate-400 text-[11px] uppercase tracking-widest">총 수익률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-500/5">
              {results.map((item, index) => {
                const scoreData = item.score || { total_score: 0, grade: 'N/A' };
                
                return (
                  <tr 
                    key={index} 
                    onClick={() => navigate(`/result/${item.filename}`)} 
                    className="hover:bg-blue-500/5 transition-all cursor-pointer group border-l-2 border-transparent hover:border-blue-500"
                  >
                    <td className="py-5 px-6 text-center">
                      <div className={`inline-flex flex-col items-center justify-center border rounded-xl w-14 h-14 shadow-sm transition-transform group-hover:scale-105 ${getGradeBadge(scoreData.grade)}`}>
                        <span className="text-lg font-black leading-none">{scoreData.grade}</span>
                        <span className="text-[10px] font-bold mt-1 font-mono opacity-70">{scoreData.total_score}</span>
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <span className="text-white font-bold group-hover:text-blue-400 transition-colors block">
                        {item.strategy}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono mt-1 block uppercase tracking-tighter">Class Identifier</span>
                    </td>
                    <td className="py-5 px-6">
                       <div className="flex items-center gap-2 text-slate-400 text-xs font-mono group-hover:text-slate-300 bg-black/20 py-1.5 px-3 rounded-lg border border-white/5 w-fit">
                        <FileText size={14} className="text-blue-500/50" />
                        {item.filename}
                       </div>
                    </td>
                    <td className="py-5 px-6 text-right">
                        <span className="font-mono text-slate-300 font-bold">{item.total_trades}회</span>
                    </td>
                    <td className="py-5 px-6 text-right">
                        <span className="font-mono text-slate-300 font-bold">{item.win_rate}%</span>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <div className={`inline-flex items-center justify-end gap-1.5 font-mono font-bold text-base ${
                        item.total_profit_pct >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {item.total_profit_pct >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                        {item.total_profit_pct}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center border border-white/5">
              <FileText size={40} className="opacity-20" />
            </div>
            <p className="text-sm font-medium uppercase tracking-[0.2em]">데이터가 없습니다</p>
          </div>
        )}
      </div>

      {/* --- 모달 (Popup) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-cyber-bg/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-200">
          <div className="glass-card w-full max-w-lg overflow-hidden border-blue-500/30 shadow-2xl">
            {/* 모달 헤더 */}
            <div className="px-8 py-5 border-b border-blue-500/10 flex justify-between items-center bg-blue-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <Play size={18} fill="currentColor" />
                </div>
                <h3 className="font-bold text-white tracking-tight">백테스트 시뮬레이션</h3>
              </div>
              {!isRunning && (
                <button onClick={closeModal} className="p-1 rounded-md text-slate-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              )}
            </div>

            {/* 모달 본문 */}
            <div className="p-8">
              {!isRunning && !runLog ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest">
                      전략 클래스명
                    </label>
                    <input 
                      type="text"
                      value={strategyName}
                      onChange={(e) => setStrategyName(e.target.value)}
                      placeholder="예: MyStrategy"
                      className="cyber-input w-full"
                    />
                    <p className="text-[11px] text-blue-400/60 mt-3 flex items-start gap-2 leading-relaxed">
                       <span className="mt-0.5">●</span>
                       전략 파일(.py) 내부에 정의된 정확한 클래스 이름을 입력하세요.
                    </p>
                  </div>
                </div>
              ) : isRunning ? (
                <div className="text-center py-12 space-y-6">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                    <Loader2 size={40} className="absolute inset-0 m-auto text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white tracking-tight">시뮬레이션 분석 중</p>
                    <p className="text-xs text-blue-400/70 mt-2 font-mono tracking-widest uppercase">Initializing Freqtrade Engine...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="font-bold text-emerald-400 text-xs uppercase tracking-widest">실행 완료</span>
                  </div>
                  <div className="bg-[#020617] border border-blue-500/10 p-4 rounded-xl text-[11px] font-mono h-64 overflow-auto text-blue-200/80 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {runLog}
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="px-8 py-5 border-t border-blue-500/10 bg-blue-500/5 flex justify-end gap-4">
              {!isRunning && !runLog && (
                <>
                  <button 
                    onClick={closeModal}
                    className="px-6 py-2.5 text-slate-400 hover:text-white text-sm font-bold transition-colors"
                  >
                    취소
                  </button>
                  <button 
                    onClick={handleRunBacktest}
                    className="cyber-button"
                  >
                    테스트 시작
                  </button>
                </>
              )}
              {!isRunning && runLog && (
                <button 
                  onClick={closeModal}
                  className="cyber-button bg-slate-800 hover:bg-slate-700 border-slate-700"
                >
                  닫기
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
