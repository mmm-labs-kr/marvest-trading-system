import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Menu, X, BarChart2, PlayCircle, Activity, Terminal } from 'lucide-react';

// 페이지 컴포넌트 임포트
import BacktestList from './components/BacktestList';
import BacktestDetail from './components/BacktestDetail';
import PaperTrading from './components/PaperTrading';
import LiveTrading from './components/LiveTrading';
// ★ 추가: 로그인 컴포넌트 임포트
import Login from './components/Login';

import './App.css';

// 사이드바 메뉴 항목 정의
const MENU_ITEMS = [
  { path: '/', name: 'BACKTEST RESULT', icon: <BarChart2 size={20} /> },
  { path: '/paper', name: 'PAPER TRADING', icon: <PlayCircle size={20} /> },
  { path: '/live', name: 'LIVE TRADING', icon: <Activity size={20} /> },
];

//// ★ 추가: 로그인 여부를 확인하는 가드 컴포넌트
//const PrivateRoute = ({ children }) => {
//  // localStorage에서 토큰 확인
//  const isAuthenticated = localStorage.getItem("user_token");
//  // 토큰이 있으면 통과, 없으면 로그인 페이지로 강제 이동
//  return isAuthenticated ? children : <Navigate to="/login" />;
//};

const PrivateRoute = ({ children }) => {
  return children;
};

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // ★ 추가: 현재 페이지가 로그인 페이지인지 확인
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-black text-gray-200 flex flex-col font-sans selection:bg-green-500 selection:text-black">
      
      {/* ★ 조건부 렌더링: 로그인 페이지가 아닐 때만 헤더와 사이드바를 보여줌 
        (!isLoginPage && ...)
      */}

      {/* 1. 상단 헤더 (로그인 페이지에선 숨김) */}
      {!isLoginPage && (
        <header className="bg-black border-b border-gray-800 px-4 py-3 flex items-center gap-4 sticky top-0 z-20">
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-800 text-gray-300 transition-colors"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex flex-col font-mono">
            <h1 className="font-bold text-xl text-green-500 flex items-center gap-2 tracking-wider">
              <Terminal size={20} strokeWidth={3} /> 
              <span>MARVEST</span>
            </h1>
            <div className='text-[10px] text-green-500 font-bold tracking-[0.2em] pl-7'>
              Auto Trading Bot System
            </div>
          </div>
        </header>
      )}

      {/* 2. 사이드바 (네비게이션) - 로그인 페이지에선 숨김 */}
      {!isLoginPage && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-30 backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {!isLoginPage && (
        <div className={`fixed top-0 left-0 h-full w-64 bg-[#0a0a0a] border-r border-gray-800 z-40 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="p-5 flex justify-between items-center border-b border-gray-800">
            <span className="font-bold text-lg text-white tracking-wider font-mono">
              {'>'} MENU
            </span>
            <button onClick={closeSidebar} className="text-gray-400 hover:text-white transition-colors">
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-green-600 text-white shadow-lg shadow-green-900/50 font-bold' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="text-sm tracking-wide">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
            <div className="text-[10px] text-gray-300 font-mono flex justify-between uppercase">
              <span>Status: Online</span>
              <span className="text-green-500 animate-pulse">●</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-auto bg-black text-gray-100">
        <Routes>
          {/* ★ 공개 라우트: 로그인 페이지 */}
          <Route path="/login" element={<Login />} />

          {/* ★ 보호된 라우트들: PrivateRoute로 감싸서 접근 제어 */}
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <BacktestList />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/paper" 
            element={
              <PrivateRoute>
                <PaperTrading />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/live" 
            element={
              <PrivateRoute>
                <LiveTrading />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/result/:filename" 
            element={
              <PrivateRoute>
                <BacktestDetail />
              </PrivateRoute>
            }
          />

          {/* 예외 처리: 없는 주소면 메인으로 */}
          <Route path="*" element={<Navigate to="/" />} />
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