import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, TrendingDown, FileText, Play, X, Loader2 } from 'lucide-react';

function BacktestList() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- 모달 및 실행 관련 상태 ---
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 열림 여부
  const [strategyName, setStrategyName] = useState("");  // 입력받은 전략명
  const [isRunning, setIsRunning] = useState(false);     // 실행 중인지(로딩)
  const [runLog, setRunLog] = useState(null);            // 실행 결과 로그

  // 목록 불러오기 함수 (재사용을 위해 분리)
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

  // 백테스팅 실행 함수
  const handleRunBacktest = async () => {
    if (!strategyName.trim()) {
      alert("전략 이름을 입력해주세요!");
      return;
    }

    setIsRunning(true);
    setRunLog(null); // 이전 로그 초기화

    try {
      // 백엔드에 실행 요청 (시간이 걸림)
      const response = await axios.post('/api/backtest/run', {
        strategy: strategyName
      });

      if (response.data.status === "success") {
        setRunLog(response.data.output); // 성공 로그 저장
        fetchResults(); // 목록 새로고침 (새 결과 파일이 생겼을 테니)
      } else {
        setRunLog(`[Error] ${response.data.message}\n${response.data.error}`);
      }
    } catch (err) {
      setRunLog(`[System Error] 서버 통신 실패: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // 모달 닫기 핸들러
  const closeModal = () => {
    setIsModalOpen(false);
    setStrategyName("");
    setRunLog(null);
  };

  if (loading) return <div className="p-10 text-center">로딩 중... ⏳</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      
      {/* 상단 헤더 및 실행 버튼 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          백테스팅 결과 목록
        </h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition shadow-md"
        >
          <Play size={18} fill="currentColor" />
          새 백테스팅 실행
        </button>
      </div>
      
      {/* 결과 목록 테이블 */}
      <div className="overflow-x-auto shadow-md rounded-lg bg-white">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left font-semibold text-gray-600">전략 이름</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-600">파일명</th>
              <th className="py-3 px-4 text-right font-semibold text-gray-600">거래 횟수</th>
              <th className="py-3 px-4 text-right font-semibold text-gray-600">승률</th>
              <th className="py-3 px-4 text-right font-semibold text-gray-600">수익률</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item, index) => (
              <tr 
                key={index} 
                onClick={() => navigate(`/result/${item.filename}`)} 
                className="border-b hover:bg-gray-50 transition cursor-pointer"
              >
                <td className="py-3 px-4 font-medium">{item.strategy}</td>
                <td className="py-3 px-4 text-sm text-gray-500 flex items-center gap-1">
                  <FileText size={14} />
                  {item.filename}
                </td>
                <td className="py-3 px-4 text-right">{item.total_trades}회</td>
                <td className="py-3 px-4 text-right">{item.win_rate}%</td>
                <td className={`py-3 px-4 text-right font-bold ${
                  item.total_profit_pct >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <div className="flex items-center justify-end gap-1">
                    {item.total_profit_pct >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                    {item.total_profit_pct}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {results.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            데이터가 없습니다. 우측 상단 버튼을 눌러 백테스팅을 실행해보세요.
          </div>
        )}
      </div>

      {/* --- 백테스팅 실행 모달 (Popup) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
            {/* 모달 헤더 */}
            <div className="bg-gray-100 px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Play size={20} className="text-blue-600" /> 백테스팅 실행
              </h3>
              {!isRunning && (
                <button onClick={closeModal} className="text-gray-500 hover:text-red-500">
                  <X size={24} />
                </button>
              )}
            </div>

            {/* 모달 본문 */}
            <div className="p-6">
              {!isRunning && !runLog ? (
                // 1. 입력 화면
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    실행할 전략 이름 (Class Name)
                  </label>
                  <input 
                    type="text"
                    value={strategyName}
                    onChange={(e) => setStrategyName(e.target.value)}
                    placeholder="예: MyStrategy"
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    * class 이름을 정확히 입력하세요.
                  </p>
                </div>
              ) : isRunning ? (
                // 2. 로딩 화면
                <div className="text-center py-10">
                  <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-lg font-bold text-gray-700">백테스팅 실행 중...</p>
                  <p className="text-sm text-gray-500">잠시만 기다려주세요. (최대 수 분 소요)</p>
                </div>
              ) : (
                // 3. 결과 로그 화면
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-green-600">실행 완료!</span>
                  </div>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono h-64 overflow-auto">
                    <pre>{runLog}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 (버튼) */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-2">
              {!isRunning && !runLog && (
                <>
                  <button 
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded font-medium"
                  >
                    취소
                  </button>
                  <button 
                    onClick={handleRunBacktest}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold"
                  >
                    실행하기
                  </button>
                </>
              )}
              {/* 실행 완료 후 닫기 버튼 */}
              {!isRunning && runLog && (
                <button 
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-bold"
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