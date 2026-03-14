import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Menu, X, BarChart2, PlayCircle, Activity, Shield, LayoutDashboard, Database } from 'lucide-react';

// 페이지 컴포넌트 임포트
import BacktestList from './components/BacktestList';
import BacktestDetail from './components/BacktestDetail';
import PaperTrading from './components/PaperTrading';
import LiveTrading from './components/LiveTrading';
import Login from './components/Login';

import './App.css';

// 사이드바 메뉴 항목 정의
const MENU_ITEMS = [
  { path: '/', name: '백테스트 결과', icon: <BarChart2 size={20} /> },
  { path: '/paper', name: '모의 투자', icon: <PlayCircle size={20} /> },
  { path: '/live', name: '실전 투자', icon: <Activity size={20} /> },
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
    <div className="min-h-screen bg-cyber-bg text-slate-300 flex flex-col font-sans selection:bg-blue-500/30">
      
      {/* 1. 상단 헤더 */}
      {!isLoginPage && (
        <header className="bg-cyber-bg/80 backdrop-blur-md border-b border-blue-500/20 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-all active:scale-95"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="flex flex-col">
            <h1 className="font-bold text-2xl text-white flex items-center gap-3 tracking-tight">
              <Shield size={24} className="text-blue-500 fill-blue-500/10" /> 
              <span className="glow-text">MARVEST</span>
            </h1>
            <div className='text-[10px] text-blue-400/70 font-semibold tracking-[0.15em] uppercase pl-1'>
              AI Strategy Optimizer
            </div>
          </div>

          <div className="ml-auto hidden md:flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">System Status</span>
              <span className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                OPERATIONAL
              </span>
            </div>
          </div>
        </header>
      )}

      {/* 2. 사이드바 */}
      {!isLoginPage && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm transition-opacity duration-300"
          onClick={closeSidebar}
        />
      )}

      {!isLoginPage && (
        <div className={`fixed top-0 left-0 h-full w-72 bg-cyber-card border-r border-blue-500/10 z-40 transform transition-transform duration-300 ease-out shadow-2xl ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="p-6 flex justify-between items-center border-b border-blue-500/10">
            <span className="font-bold text-sm text-slate-400 tracking-widest flex items-center gap-2">
              <LayoutDashboard size={16} /> 메뉴
            </span>
            <button onClick={closeSidebar} className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
              <X size={20} />
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
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]' 
                      : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span className={`${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`}>
                    {item.icon}
                  </span>
                  <span className="text-[15px] font-semibold tracking-tight">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black/40 to-transparent">
            <div className="glass-card p-4 flex items-center gap-3 border-blue-500/10">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Database size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Database</span>
                <span className="text-xs text-slate-300 font-semibold">Local Storage</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-auto bg-cyber-bg text-slate-200">
        <div className="max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/login" element={<Login />} />
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
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
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
