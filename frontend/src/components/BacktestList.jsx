import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, TrendingDown, FileText, Play, X, Loader2, Award } from 'lucide-react';

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
        setRunLog(`[Error] ${response.data.message}\n${response.data.error}`);
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
      'S': 'bg-purple-900/30 text-purple-400 border-purple-500/50',
      'A': 'bg-green-900/30 text-green-400 border-green-500/50',
      'B': 'bg-blue-900/30 text-blue-400 border-blue-500/50',
      'C': 'bg-yellow-900/30 text-yellow-400 border-yellow-500/50',
      'Fail': 'bg-red-900/30 text-red-400 border-red-500/50',
    };
    const defaultStyle = 'bg-gray-800 text-gray-300 border-gray-700';
    return styles[grade] || defaultStyle;
  };

  if (loading) return (
    <div className="flex h-full items-center justify-center text-gray-300 font-mono text-sm">
      <Loader2 className="animate-spin mr-2 text-green-500" /> LOADING DATA...
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-8 font-sans">
      
      {/* 헤더 섹션 */}
      <div className="flex justify-between items-end mb-8 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Backtest Registry</h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="group relative px-5 py-2.5 bg-green-600/10 hover:bg-green-600/20 text-green-500 hover:text-green-400 border border-green-900/50 hover:border-green-500/50 rounded-lg transition-all duration-200 flex items-center gap-2 font-bold text-sm tracking-wide"
        >
          <Play size={16} fill="currentColor" className="opacity-70 group-hover:opacity-100 transition-opacity" />
          RUN NEW SIMULATION
        </button>
      </div>
      
      {/* 결과 목록 테이블 */}
      <div className="rounded-xl border border-gray-800 bg-[#0a0a0a] overflow-hidden shadow-sm">
        <table className="min-w-full text-left">
          <thead className="bg-[#050505] border-b border-gray-800">
            <tr>
              {/* ★ 컬럼 추가: Score */}
              <th className="py-4 px-6 font-bold text-gray-300 text-[10px] uppercase tracking-widest w-24 text-center">Score</th>
              <th className="py-4 px-6 font-bold text-gray-300 text-[10px] uppercase tracking-widest">Strategy Class</th>
              <th className="py-4 px-6 font-bold text-gray-300 text-[10px] uppercase tracking-widest">Filename</th>
              <th className="py-4 px-6 text-right font-bold text-gray-300 text-[10px] uppercase tracking-widest">Trades</th>
              <th className="py-4 px-6 text-right font-bold text-gray-300 text-[10px] uppercase tracking-widest">Win Rate</th>
              <th className="py-4 px-6 text-right font-bold text-gray-300 text-[10px] uppercase tracking-widest">Net Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {results.map((item, index) => {
              // 점수 데이터가 없을 경우(구버전 데이터 등) 대비
              const scoreData = item.score || { total_score: 0, grade: 'N/A' };
              
              return (
                <tr 
                  key={index} 
                  onClick={() => navigate(`/result/${item.filename}`)} 
                  className="hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  {/* ★ Score & Grade 표시 */}
                  <td className="py-4 px-6 text-center">
                    <div className={`inline-flex flex-col items-center justify-center border rounded-md w-12 h-12 ${getGradeBadge(scoreData.grade)}`}>
                      <span className="text-sm font-bold leading-none">{scoreData.grade}</span>
                      <span className="text-[9px] opacity-80 mt-1 font-mono">{scoreData.total_score}</span>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    <span className="text-gray-200 font-bold group-hover:text-green-400 transition-colors">
                      {item.strategy}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                     <div className="flex items-center gap-2 text-gray-300 text-xs font-mono group-hover:text-gray-300">
                      <FileText size={14} />
                      {item.filename}
                     </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                      <span className="font-mono text-gray-300 text-sm">{item.total_trades}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                      <span className="font-mono text-gray-300 text-sm">{item.win_rate}%</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className={`inline-flex items-center justify-end gap-1.5 font-mono font-bold text-sm ${
                      item.total_profit_pct >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {item.total_profit_pct >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                      {item.total_profit_pct}%
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-3">
            <FileText size={48} strokeWidth={1} className="opacity-20" />
            <p className="text-sm font-mono uppercase tracking-widest">No Backtest Data Found</p>
          </div>
        )}
      </div>

      {/* --- 모달 (Popup) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-gray-700 w-full max-w-lg overflow-hidden rounded-lg shadow-2xl">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-[#050505]">
              <h3 className="font-bold text-gray-200 text-sm uppercase tracking-widest flex items-center gap-2">
                <Play size={16} className="text-green-500" /> Execute Strategy
              </h3>
              {!isRunning && (
                <button onClick={closeModal} className="text-gray-300 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              )}
            </div>

            {/* 모달 본문 */}
            <div className="p-6">
              {!isRunning && !runLog ? (
                <div>
                  <label className="block text-gray-300 text-xs font-bold mb-2 uppercase tracking-wide">
                    Strategy Class Name
                  </label>
                  <input 
                    type="text"
                    value={strategyName}
                    onChange={(e) => setStrategyName(e.target.value)}
                    placeholder="e.g. MyStrategy"
                    className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-mono text-sm placeholder-gray-700"
                  />
                  <p className="text-[10px] text-gray-300 mt-2 flex items-center gap-1">
                     * Enter the exact class name defined in your strategy file.
                  </p>
                </div>
              ) : isRunning ? (
                <div className="text-center py-8">
                  <Loader2 size={40} className="animate-spin text-green-500 mx-auto mb-4" />
                  <p className="text-base font-bold text-gray-200">Processing Simulation...</p>
                  <p className="text-xs text-gray-300 mt-2 font-mono">THIS MAY TAKE A FEW MINUTES</p>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-green-500 text-xs uppercase tracking-wider">Execution Finished</span>
                  </div>
                  <div className="bg-black border border-gray-800 p-3 rounded text-[10px] font-mono h-60 overflow-auto text-gray-300 whitespace-pre-wrap scrollbar-thin scrollbar-thumb-gray-800">
                    {runLog}
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-800 bg-[#050505] flex justify-end gap-3">
              {!isRunning && !runLog && (
                <>
                  <button 
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-300 hover:text-gray-300 text-xs font-bold uppercase tracking-wide transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRunBacktest}
                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-bold uppercase tracking-wide shadow-lg shadow-green-900/20 transition-all"
                  >
                    Run Test
                  </button>
                </>
              )}
              {!isRunning && runLog && (
                <button 
                  onClick={closeModal}
                  className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-bold uppercase tracking-wide transition-colors"
                >
                  Close
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