// frontend/src/components/Login.jsx

import React, { useState } from 'react';
import { Terminal } from 'lucide-react'; // 아이콘 사용 (없으면 생략 가능)

const Login = () => {
  const [userId, setUserId] = useState("me");
  const [otp, setOtp] = useState("");

  const handleLogin = async () => {
    // ... (로그인 로직은 기존과 동일) ...
    try {
        const response = await fetch("http://127.0.0.1:8000/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, otp_code: otp }),
        });
  
        const data = await response.json();
  
        if (response.ok && data.status === "success") {
          localStorage.setItem("user_token", "access_granted"); 
          window.location.href = "/";
        } else {
          alert("로그인 실패: OTP 번호를 확인해주세요.");
        }
      } catch (error) {
        console.error("Login Error:", error);
        alert("서버 연결에 실패했습니다.");
      }
  };

  return (
    // 배경을 검정(bg-black)으로 변경
    <div className="min-h-screen bg-black flex flex-col justify-center items-center text-gray-200 font-sans">
      
      {/* 로고 영역 */}
      <div className="mb-8 text-center font-mono">
        <h1 className="text-3xl font-bold text-green-500 flex items-center justify-center gap-3 tracking-wider">
          <Terminal size={32} strokeWidth={3} /> 
          <span>MMM_SYSTEM</span>
        </h1>
        <div className='text-xs text-green-700 font-bold tracking-[0.3em] mt-2'>
            ACCESS CONTROL
        </div>
      </div>

      {/* 로그인 카드: 어두운 회색 배경 + 테두리 */}
      <div className="bg-[#0a0a0a] border border-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm">
        <h2 className="text-xl font-bold text-white mb-6 text-center tracking-wide">
          LOGIN
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">User ID</label>
          <select 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
          >
            <option value="sb">수빈</option>
            <option value="js">제석</option>
          </select>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-400 mb-2">Authenticator Code</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="000 000"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-center text-lg tracking-widest focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <button 
          onClick={handleLogin} 
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-green-900/50"
        >
          CONNECT
        </button>
      </div>
      
      <p className="mt-8 text-xs text-gray-600 font-mono">
        SECURE CONNECTION REQUIRED
      </p>
    </div>
  );
};

export default Login;