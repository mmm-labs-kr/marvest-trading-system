import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Menu, X, BarChart2, PlayCircle, Activity } from 'lucide-react';

// 페이지 컴포넌트 임포트
import BacktestList from './components/BacktestList';
import BacktestDetail from './components/BacktestDetail';
import PaperTrading from './components/PaperTrading';
import LiveTrading from './components/LiveTrading';

import './App.css';

// 사이드바 메뉴 항목 정의
const MENU_ITEMS = [
  { path: '/', name: '백테스팅 결과', icon: <BarChart2 size={20} /> },
  { path: '/paper', name: '모의투자', icon: <PlayCircle size={20} /> },
  { path: '/live', name: '실전투자', icon: <Activity size={20} /> },
];

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation(); // 현재 주소를 알기 위해 사용

  // 사이드바 열고 닫는 함수
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      
      {/* 1. 상단 헤더 (햄버거 버튼 포함) */}
      <header className="bg-white shadow-sm border-b px-4 py-3 flex items-center gap-4 sticky top-0 z-20">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-gray-100 transition text-gray-600"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="font-bold text-2xl text-blue-600">
          MMM
        <div className='item-center font-bold text-sm text-blue-400'>
          Money Makes Money
        </div>
        </h1>
      </header>

      {/* 2. 사이드바 (네비게이션) */}
      {/* 배경 어둡게 처리 (Overlay) - 사이드바 열렸을 때만 보임 */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={closeSidebar}
        />
      )}

      {/* 실제 사이드바 패널 */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-5 flex justify-between items-center">
          <span className="font-bold text-lg text-gray-800">메뉴</span>
          <button onClick={closeSidebar} className="text-gray-500 hover:text-red-500">
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 flex flex-col gap-2">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeSidebar} // 클릭하면 사이드바 닫기
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path 
                  ? 'bg-blue-50 text-blue-600 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* 3. 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-auto">
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

// BrowserRouter는 최상위에서 한 번만 감싸야 해서 분리했습니다.
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;