import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, Download, Terminal, Activity, AlertTriangle, TrendingUp } from 'lucide-react';

function BacktestDetail() {
    const { filename } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                // [로직 유지] 기존 상대 경로 그대로 사용
                const response = await axios.get(`/api/backtest/results/${filename}`);
                setData(response.data);
            } catch (err) {
                console.error(err);
                setError("상세 데이터를 불러오는데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [filename]);

    // [스타일 수정] 로딩 화면 - 블랙 테마
    if (loading) return (
        <div className="min-h-screen bg-black text-green-500 flex items-center justify-center font-mono">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <Terminal size={48} />
                <span className="text-xl tracking-widest">SYSTEM LOADING...</span>
            </div>
        </div>
    );

    // [스타일 수정] 에러 화면 - 블랙/레드 테마
    if (error) return (
        <div className="min-h-screen bg-black text-red-500 flex items-center justify-center font-mono">
            <div className="border border-red-900 p-8 rounded bg-red-900/10 flex flex-col items-center gap-4">
                <AlertTriangle size={48} />
                <span className="text-xl tracking-widest">{error}</span>
                <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 border border-red-500 hover:bg-red-500/20 text-sm transition-colors">
                    RETURN TO ROOT
                </button>
            </div>
        </div>
    );

    if (!data) return null;

    // 1. 데이터 추출 및 가공 (로직 유지)
    const strategyName = Object.keys(data.strategy || {})[0] || "Unknown Strategy";
    const stat = data.strategy[strategyName] || {};

    // 2. 손익비(Risk-Reward Ratio) 계산 로직 (로직 유지)
    const avgWin = stat.wins > 0 ? stat.profit_total_abs / stat.wins : 0;
    const totalLoss = Math.abs(stat.loss_total_abs || 0);
    const avgLoss = stat.losses > 0 ? totalLoss / stat.losses : 0;
    const riskRewardRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "∞";

    // 3. 포맷팅 헬퍼 함수 (로직 유지)
    const fmtPct = (val) => {
        if (val === null || val === undefined || Number.isNaN(Number(val))) {
            return "N/A";
        }
        return `${(val * 100).toFixed(2)}%`;
    };
    const fmtNum = (val) => val ? val.toLocaleString() : "0";
    const fmtMoney = (val) => val ? val.toFixed(2) : "0.00";

    // 4. 테이블 공통 스타일 (이 부분만 디자인 변경)
    // 기존: bg-white border-gray-200 ...
    // 변경: bg-black border-green-900 ...
    const tableClass = "w-full border-collapse border border-green-900/30 text-sm mb-6";
    const thClass = "py-3 px-4 text-left font-bold text-green-700 bg-green-900/5 border-b border-green-900/50 uppercase tracking-widest w-1/3";
    const tdClass = "py-3 px-4 border-b border-green-900/30 text-gray-300 font-mono";

    return (
        // [메인 컨테이너] 블랙 배경 + 터미널 폰트 적용
        <div className="min-h-screen bg-black text-gray-300 font-mono p-8 selection:bg-green-500 selection:text-black" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            
            {/* 상단 헤더 */}
            <div className="max-w-6xl mx-auto mb-8 border-b border-green-900/50 pb-6">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-green-600 hover:text-green-400 mb-4 transition-colors text-sm uppercase tracking-widest group"
                >
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
                    Back to List
                </button>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3 text-green-500 tracking-wider">
                            <FileText className="text-green-500" />
                            {strategyName}
                        </h1>
                        <p className="mt-2 ml-1 text-xs font-mono bg-green-900/20 text-green-400 inline-block px-3 py-1 border border-green-900/50 rounded-sm">
                            FILE: {filename}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-green-800 font-bold uppercase mb-1">Backtest Period</div>
                        <div className="text-sm text-green-400 font-bold border border-green-900/50 px-3 py-1 bg-green-900/10">
                            {stat.backtest_start} <span className="text-gray-600 mx-2">{'>>'}</span> {stat.backtest_end}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 gap-10">

                {/* 1. 성과 지표 (Performance Metrics) */}
                <section>
                    <h2 className="text-lg font-bold mb-4 text-green-500 border-l-4 border-green-500 pl-3 flex items-center gap-2 uppercase tracking-widest">
                        <TrendingUp size={20} /> 1. Performance Metrics
                    </h2>
                    <div className="overflow-hidden rounded-sm shadow-[0_0_15px_rgba(20,83,45,0.1)] border border-green-900/30">
                        <table className={tableClass}>
                            <tbody>
                                <tr className="bg-green-900/5">
                                    <th className={thClass}>시작 원금 (Start Balance)</th>
                                    <td className={tdClass}>
                                        {fmtMoney(stat.starting_balance)} <span className="text-xs text-gray-500">USDT</span>
                                    </td>
                                    <th className={thClass}>최종 금액 (Final Balance)</th>
                                    <td className={`py-3 px-4 border-b border-green-900/30 font-bold ${(stat.starting_balance+(stat.profit_total_abs||0)) >= stat.starting_balance ? 'text-green-400' : 'text-red-500'}`}>
                                        {fmtMoney(stat.starting_balance+(stat.profit_total_abs||0))} <span className="text-xs text-gray-500">USDT</span>
                                    </td>
                                </tr>
                                <tr>
                                    <th className={thClass}>순이익 (Net Profit)</th>
                                    <td className={`${tdClass} font-bold ${stat.profit_total_abs >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                        {fmtMoney(stat.profit_total_abs)} <span className="text-xs text-gray-500">(USDT)</span>
                                    </td>
                                    <th className={thClass}>총 수익률 (Cumulative Return)</th>
                                    <td className={`${tdClass} font-bold ${stat.profit_total_abs / stat.starting_balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                        {fmtPct(stat.profit_total_abs/stat.starting_balance)}
                                    </td>
                                </tr>
                                <tr>
                                    <th className={thClass}>연평균 수익률 (CAGR)</th>
                                    <td className={tdClass}>
                                        <span className={stat.cagr >= 0 ? 'text-green-400' : 'text-red-500'}>{fmtPct(stat.cagr)}</span>
                                    </td>
                                    <th className={thClass}>수익 요인 (Profit Factor)</th>
                                    <td className={tdClass}>
                                        {stat.profit_factor ? stat.profit_factor.toFixed(2) : "N/A"}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 2. 리스크 및 안정성 지표 (Risk & Stability Metrics) */}
                <section>
                    <h2 className="text-lg font-bold mb-4 text-red-500 border-l-4 border-red-500 pl-3 flex items-center gap-2 uppercase tracking-widest">
                        <AlertTriangle size={20} /> 2. Risk & Stability Metrics
                    </h2>
                    <div className="overflow-hidden rounded-sm shadow-[0_0_15px_rgba(20,83,45,0.1)] border border-green-900/30">
                        <table className={tableClass}>
                            <tbody>
                                <tr>
                                    <th className={thClass}>최대 낙폭 (MDD)</th>
                                    <td className={`${tdClass} text-red-500 font-bold`}>
                                        {fmtPct(stat.max_drawdown_account)}
                                    </td>
                                    <th className={thClass}>최대 낙폭 금액</th>
                                    <td className={`${tdClass} text-red-500`}>
                                        {fmtMoney(stat.max_drawdown_abs)} <span className="text-xs text-gray-500">(USDT)</span>
                                    </td>
                                </tr>
                                <tr>
                                    <th className={thClass}>샤프 비율 (Sharpe Ratio)</th>
                                    <td className={tdClass}>
                                        {stat.sharpe ? stat.sharpe.toFixed(2) : "N/A"}
                                    </td>
                                    <th className={thClass}>소티노 비율 (Sortino Ratio)</th>
                                    <td className={tdClass}>
                                        {stat.sortino ? stat.sortino.toFixed(2) : "N/A"}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 3. 거래 관련 상세 지표 (Trade Specific Metrics) */}
                <section>
                    <h2 className="text-lg font-bold mb-4 text-blue-500 border-l-4 border-blue-500 pl-3 flex items-center gap-2 uppercase tracking-widest">
                        <Activity size={20} /> 3. Trade Specific Metrics
                    </h2>
                    <div className="overflow-hidden rounded-sm shadow-[0_0_15px_rgba(20,83,45,0.1)] border border-green-900/30">
                        <table className={tableClass}>
                            <tbody>
                                <tr>
                                    <th className={thClass}>승률 (Win Rate)</th>
                                    <td className={tdClass}>
                                        <span className="text-green-400 font-bold">{fmtPct(stat.winrate)}</span>
                                        <span className="text-xs text-gray-500 ml-2">
                                            ({stat.wins}W / {stat.draws}D / {stat.losses}L)
                                        </span>
                                    </td>
                                    <th className={thClass}>총 거래 횟수</th>
                                    <td className={tdClass}>
                                        {stat.total_trades}회
                                    </td>
                                </tr>
                                <tr>
                                    <th className={thClass}>손익비 (Risk-Reward Ratio)</th>
                                    <td className={tdClass}>
                                        {riskRewardRatio}
                                    </td>
                                    <th className={thClass}>기대값 (Expectancy)</th>
                                    <td className={tdClass}>
                                        {stat.expectancy ? stat.expectancy.toFixed(2) : "N/A"}
                                    </td>
                                </tr>
                                <tr>
                                    <th className={thClass}>연속 최대 손실 (Consecutive Losses)</th>
                                    <td className={`${tdClass} text-red-500`}>
                                        {stat.consecutive_losses || 0}회
                                    </td>
                                    <th className={thClass}>연속 최대 수익 (Consecutive Wins)</th>
                                    <td className={`${tdClass} text-green-400`}>
                                        {stat.consecutive_wins || 0}회
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

            </div>

            {/* 하단: 원본 데이터 확인용 (개발 완료 후 숨김 처리 가능) */}
            <details className="mt-8 bg-black border border-gray-800 rounded p-4 group">
                <summary className="cursor-pointer font-bold text-gray-600 text-xs uppercase tracking-widest group-hover:text-green-500 transition-colors">
                    [ DEBUG_MODE ] :: VIEW RAW JSON DATA
                </summary>
                <pre className="mt-4 text-[10px] text-green-800 overflow-auto max-h-60 p-4 bg-gray-900/50 rounded border border-gray-800">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </details>
        </div>
    );
}

export default BacktestDetail;