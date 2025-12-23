import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, Download } from 'lucide-react';

function BacktestDetail() {
    const { filename } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
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

    if (loading) return <div className="p-10 text-center">데이터 로딩 중... ⏳</div>;
    if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
    if (!data) return null;

    // 1. 데이터 추출 및 가공
    const strategyName = Object.keys(data.strategy || {})[0] || "Unknown Strategy";
    const stat = data.strategy[strategyName] || {};

    // 2. 손익비(Risk-Reward Ratio) 계산 로직
    // Freqtrade JSON에 직접적인 필드가 없을 수 있어 계산 필요
    // 평균 이익 = 총 이익 / 승리 횟수
    // 평균 손실 = 총 손실(절대값) / 패배 횟수
    const avgWin = stat.wins > 0 ? stat.profit_total_abs / stat.wins : 0;
    // loss_total_abs는 보통 음수로 나오거나 양수로 나올 수 있음. 안전하게 절대값 처리
    const totalLoss = Math.abs(stat.loss_total_abs || 0);
    const avgLoss = stat.losses > 0 ? totalLoss / stat.losses : 0;
    const riskRewardRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "∞";

    // 3. 포맷팅 헬퍼 함수
    const fmtPct = (val) => {
        // 값이 아예 없거나(null), 숫자가 아닌 경우(NaN)
        if (val === null || val === undefined || Number.isNaN(Number(val))) {
            return "N/A";
        }
        // 정상적인 숫자(음수 포함)는 여기서 처리됨
        return `${(val * 100).toFixed(2)}%`;
    };
    const fmtNum = (val) => val ? val.toLocaleString() : "0"; // 콤마 표시
    const fmtMoney = (val) => val ? val.toFixed(2) : "0.00"; // 소수점 2자리

    // 4. 테이블 공통 스타일
    const tableClass = "min-w-full bg-white border border-gray-200 mb-6";
    const thClass = "py-3 px-4 text-left font-semibold text-gray-700 bg-gray-50 border-b";
    const tdClass = "py-3 px-4 border-b text-gray-800";

    return (
        <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
            {/* 상단 헤더 */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center text-gray-500 hover:text-blue-600 mb-2 transition"
                >
                    <ArrowLeft size={20} className="mr-1" /> 목록으로 돌아가기
                </button>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-900">
                            <FileText className="text-blue-600" />
                            {strategyName}
                        </h1>
                        <p className="text-gray-500 mt-2 ml-1 text-sm font-mono bg-gray-200 inline-block px-2 py-1 rounded">
                            파일명: {filename}
                        </p>
                    </div>
                    <div className="text-right text-gray-600">
                        <span className="text-sm">기간: {stat.backtest_start} ~ {stat.backtest_end}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">

                {/* 1. 성과 지표 (Performance Metrics) */}
                <section>
                    <h2 className="text-xl font-bold mb-3 text-gray-800 border-l-4 border-blue-500 pl-3">
                        1. 성과 지표 (Performance Metrics)
                    </h2>
                    <div className="overflow-hidden rounded-lg shadow-sm">
                        <table className={tableClass}>
                            <tbody>
                                <tr className="bg-blue-50">
                                    <th className={thClass}>시작 원금 (Start Balance)</th>
                                    <td className={tdClass}>
                                        {fmtMoney(stat.starting_balance)} USDT
                                    </td>
                                    <th className={thClass}>최종 금액 (Final Balance)</th>
                                    <td className={`py-3 px-4 border-b font-bold ${(stat.starting_balance+(stat.profit_total_abs||0)) >= stat.starting_balance ? 'text-green-700' : 'text-red-600'}`}>
                                        {fmtMoney(stat.starting_balance+(stat.profit_total_abs||0))} USDT
                                    </td>
                                </tr>
                                <tr>
                                    <th className={thClass}>순이익 (Net Profit)</th>
                                    <td className={`${tdClass} font-bold ${stat.profit_total_abs >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {fmtMoney(stat.profit_total_abs)} (USDT)
                                    </td>
                                    <th className={thClass}>총 수익률 (Cumulative Return)</th>
                                    <td className={`${tdClass} font-bold ${stat.profit_total_abs / stat.starting_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {fmtPct(stat.profit_total_abs/stat.starting_balance)}
                                    </td>
                                </tr>
                                <tr>
                                    <th className={thClass}>연평균 수익률 (CAGR)</th>
                                    <td className={tdClass}>
                                        {fmtPct(stat.cagr)}
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
                    <h2 className="text-xl font-bold mb-3 text-gray-800 border-l-4 border-red-500 pl-3">
                        2. 리스크 및 안정성 지표 (Risk & Stability Metrics)
                    </h2>
                    <div className="overflow-hidden rounded-lg shadow-sm">
                        <table className={tableClass}>
                            <tbody>
                                <tr>
                                    <th className={thClass}>최대 낙폭 (MDD)</th>
                                    <td className={`${tdClass} text-red-600 font-bold`}>
                                        {fmtPct(stat.max_drawdown_account)}
                                    </td>
                                    <th className={thClass}>최대 낙폭 금액</th>
                                    <td className={tdClass}>
                                        {fmtMoney(stat.max_drawdown_abs)} (USDT)
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
                    <h2 className="text-xl font-bold mb-3 text-gray-800 border-l-4 border-green-500 pl-3">
                        3. 거래 관련 상세 지표 (Trade Specific Metrics)
                    </h2>
                    <div className="overflow-hidden rounded-lg shadow-sm">
                        <table className={tableClass}>
                            <tbody>
                                <tr>
                                    <th className={thClass}>승률 (Win Rate)</th>
                                    <td className={tdClass}>
                                        {fmtPct(stat.winrate)} ({stat.wins}승 {stat.draws}무 {stat.losses}패)
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
                                    <td className={tdClass}>
                                        {stat.consecutive_losses || 0}회
                                    </td>
                                    <th className={thClass}>연속 최대 수익 (Consecutive Wins)</th>
                                    <td className={tdClass}>
                                        {stat.consecutive_wins || 0}회
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

            </div>

            {/* 하단: 원본 데이터 확인용 (개발 완료 후 숨김 처리 가능) */}
            <details className="mt-8 bg-gray-800 text-white rounded p-4">
                <summary className="cursor-pointer font-bold">🛠 개발자용 원본 데이터 (JSON)</summary>
                <pre className="mt-2 text-xs overflow-auto max-h-60">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </details>
        </div>
    );
}

export default BacktestDetail;