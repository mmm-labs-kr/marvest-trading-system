import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Menu, X, BarChart2, PlayCircle, Activity, Layout, ShieldCheck, Code } from 'lucide-react';

// 페이지 컴포넌트 임포트
import BacktestList from './components/BacktestList';
import BacktestDetail from './components/BacktestDetail';
import PaperTrading from './components/PaperTrading';
import LiveTrading from './components/LiveTrading';
import StrategyEditor from './components/StrategyEditor';
import Login from './components/Login';

import './App.css';

// 사이드바 메뉴 항목 정의 (순서 조정: 개발 -> 분석 -> 운영)
const MENU_ITEMS = [
  { path: '/', name: '전략 개발', icon: <Code size={18} /> },
  { path: '/backtest', name: '백테스트', icon: <BarChart2 size={18} /> },
  { path: '/paper', name: '모의 투자', icon: <PlayCircle size={18} /> },
  { path: '/live', name: '실전 투자', icon: <Activity size={18} /> },
];

const PrivateRoute = ({ children }) => {
  return children;
};

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-stealth-bg text-slate-300 flex flex-col font-sans selection:bg-white selection:text-black">
      
      {/* 1. 상단 헤더 */}
      {!isLoginPage && (
        <header className="bg-stealth-bg border-b border-stealth-border px-8 py-5 flex items-center gap-6 sticky top-0 z-20">
          <button 
            onClick={toggleSidebar}
            className="p-1 rounded text-slate-500 hover:text-white transition-colors"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-black shadow-lg">
              <ShieldCheck size={20} strokeWidth={2.5} />
            </div>
            <h1 className="font-black text-xl text-white tracking-tighter uppercase">
              MARVEST
            </h1>
          </div>

          <div className="ml-auto hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-600 tracking-[0.2em] uppercase">System Node</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-stealth-accent animate-pulse shadow-[0_0_8px_var(--color-stealth-accent)]"></div>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Operational</span>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* 2. 사이드바 */}
      {!isLoginPage && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 transition-opacity backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {!isLoginPage && (
        <div className={`fixed top-0 left-0 h-full w-64 bg-stealth-card border-r border-stealth-border z-40 transform transition-transform duration-300 ease-in-out shadow-2xl ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="p-8 flex justify-between items-center border-b border-stealth-border">
            <span className="font-black text-[10px] text-slate-500 tracking-[0.2em] uppercase flex items-center gap-2">
              <Layout size={14} /> 워크스페이스
            </span>
            <button onClick={closeSidebar} className="text-slate-600 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <nav className="p-4 flex flex-col gap-1.5">
            {MENU_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-md transition-all duration-150 ${
                    isActive 
                      ? 'bg-white text-black font-bold shadow-xl' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="text-[13px] tracking-tight font-semibold">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 w-full p-8 border-t border-stealth-border bg-black/20">
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] text-center">Marvest Engine v2.1</span>
              <span className="text-[8px] text-slate-700 font-bold uppercase tracking-widest text-center">© 2026 Marvest Intelligence</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. 메인 콘텐츠 영역 */}
      <main className="flex-1 bg-stealth-bg overflow-hidden">
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* 기본 경로를 전략 에디터로 변경 */}
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <StrategyEditor />
              </PrivateRoute>
            } 
          />
          {/* 백테스트 목록을 /backtest 로 변경 */}
          <Route 
            path="/backtest" 
            element={
              <PrivateRoute>
                <div className="max-w-6xl mx-auto w-full py-10 px-6 overflow-auto h-full">
                  <BacktestList />
                </div>
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
                <div className="max-w-6xl mx-auto w-full py-10 px-6 overflow-auto h-full">
                  <BacktestDetail />
                </div>
              </PrivateRoute>
            }
          />
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
