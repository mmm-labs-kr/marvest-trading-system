import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Menu, X, BarChart2, PlayCircle, Activity, Terminal } from 'lucide-react';

// 페이지 컴포넌트 임포트
import BacktestList from './components/BacktestList';
import BacktestDetail from './components/BacktestDetail';
import PaperTrading from './components/PaperTrading';
import LiveTrading from './components/LiveTrading';

import './App.css';

// 사이드바 메뉴 항목 정의
const MENU_ITEMS = [
  { path: '/', name: 'BACKTEST RESULT', icon: <BarChart2 size={20} /> },
  { path: '/paper', name: 'PAPER TRADING', icon: <PlayCircle size={20} /> },
  { path: '/live', name: 'LIVE TRADING', icon: <Activity size={20} /> },
];

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    // [전체 테마] bg-black, text-gray-300, font-mono 적용
    <div className="min-h-screen bg-black text-gray-300 flex flex-col font-mono selection:bg-green-500 selection:text-black">
      
      {/* 1. 상단 헤더 */}
      {/* 테두리를 초록색(green-900)으로 은은하게 주고, 배경은 검정 유지 */}
      <header className="bg-black border-b border-green-900/50 px-4 py-3 flex items-center gap-4 sticky top-0 z-20 shadow-lg shadow-green-900/5">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-sm hover:bg-green-900/30 text-green-500 transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        {/* 로고 영역: 터미널 프롬프트 느낌 */}
        <div className="flex flex-col">
          <h1 className="font-bold text-xl text-green-500 flex items-center gap-2 tracking-wider">
            <Terminal size={20} strokeWidth={3} /> 
            <span>MMM_SYSTEM</span>
          </h1>
          <div className='text-[10px] text-green-800 font-bold tracking-[0.2em] pl-7'>
            MONEY MAKES MONEY
          </div>
        </div>
      </header>

      {/* 2. 사이드바 (네비게이션) */}
      {/* 오버레이 (배경 어둡게) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-30 backdrop-blur-[1px]"
          onClick={closeSidebar}
        />
      )}

      {/* 사이드바 패널 */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-black border-r border-green-900/50 z-40 transform transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-5 flex justify-between items-center border-b border-green-900/30">
          <span className="font-bold text-lg text-green-500 tracking-widest">
            {'>'} MENU
          </span>
          <button onClick={closeSidebar} className="text-gray-500 hover:text-green-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <nav className="p-4 flex flex-col gap-2">
          {MENU_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 border-l-2 ${
                  isActive 
                    ? 'bg-green-900/20 text-green-400 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                    : 'text-gray-600 border-transparent hover:text-green-300 hover:bg-green-900/10 hover:border-green-800'
                }`}
              >
                {/* 아이콘: 활성 상태면 밝게 빛나게 */}
                <span className={isActive ? "drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" : ""}>
                    {item.icon}
                </span>
                <span className="text-sm font-bold tracking-wider">
                    {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* 하단 장식 (터미널 상태 표시 느낌) */}
        <div className="absolute bottom-0 w-full p-4 border-t border-green-900/30">
            <div className="text-[10px] text-green-900 flex justify-between">
                <span>STATUS: ONLINE</span>
                <span className="animate-pulse">●</span>
            </div>
        </div>
      </div>

      {/* 3. 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-auto bg-black scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-black">
        <Routes>
          <Route path="/" element={<BacktestList />} />
          <Route path="/paper" element={<PaperTrading />} />
          <Route path="/live" element={<LiveTrading />} />
          <Route path="/result/:filename" element={<BacktestDetail />}/>
        </Routes>
      </main>

    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;