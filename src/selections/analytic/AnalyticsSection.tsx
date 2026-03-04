// src/selections/analytic/AnalyticsSection.tsx
import React, { useMemo, useEffect, useState } from 'react';
import type { CustomerData, AnalyticsSummary } from '../../types';
import './AnalyticsSection.css';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { fetchAnalyticsSummary } from '../../api';

export interface AnalyticsSectionProps {
    customer: CustomerData | null;
    selectedAnalyticsAccount: string;
    setSelectedAnalyticsAccount: (value: string) => void;
    selectedMonth: number;
    setSelectedMonth: (value: number) => void;
    selectedYear: number;
    setSelectedYear: (value: number) => void;
    onBack: () => void;
}

// Helper outside component
const getCurrencySymbol = (currency?: string) => {
    switch ((currency || '').toUpperCase()) {
        case 'USD':
            return '$';
        case 'EUR':
            return '€';
        case 'UAH':
        default:
            return '₴';
    }
};

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
                                                               customer,
                                                               selectedAnalyticsAccount,
                                                               setSelectedAnalyticsAccount,
                                                               selectedMonth,
                                                               setSelectedMonth,
                                                               selectedYear,
                                                               setSelectedYear,
                                                               onBack,
                                                           }) => {
    const [summaryData, setSummaryData] = useState<AnalyticsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const months = [
        'Січень',
        'Лютий',
        'Березень',
        'Квітень',
        'Травень',
        'Червень',
        'Липень',
        'Серпень',
        'Вересень',
        'Жовтень',
        'Листопад',
        'Грудень',
    ];

    const selectedAccount = useMemo(
        () => customer?.accounts.find((a) => a.accountNumber === selectedAnalyticsAccount),
        [customer, selectedAnalyticsAccount]
    );

    const accountToShow = selectedAccount || customer?.accounts[0];
    const currencySymbol = getCurrencySymbol(accountToShow?.currency);

    useEffect(() => {
        if (!selectedAnalyticsAccount) return;

        let isMounted = true;
        setIsLoading(true);

        fetchAnalyticsSummary(selectedAnalyticsAccount, selectedYear, selectedMonth)
            .then((data) => {
                if (isMounted) {
                    setSummaryData(data);
                }
            })
            .catch((err) => {
                console.error('Failed to fetch analytics summary', err);
                if (isMounted) {
                    setSummaryData(null);
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [selectedAnalyticsAccount, selectedMonth, selectedYear]);

    const pieData = useMemo(() => {
        if (!summaryData) return [];

        const parts = [];

        if (summaryData.totalIncoming > 0) {
            parts.push({ name: 'Доходи', value: summaryData.totalIncoming, color: '#10B981' });
        }

        if (summaryData.totalOutgoing > 0) {
            parts.push({ name: 'Витрати', value: summaryData.totalOutgoing, color: '#EF4444' });
        }

        return parts;
    }, [summaryData]);

    const timelineData = useMemo(() => [], []);

    const incomeValue = summaryData?.totalIncoming ?? 0;
    const expenseValue = summaryData?.totalOutgoing ?? 0;
    const operationsCount = summaryData?.totalTransactions ?? 0;

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <div className="analytics-title">
                    <button className="btn-back" onClick={onBack} title="Повернутися до транзакцій">
                        ← Назад до транзакцій
                    </button>
                    <div className="analytics-title-center">
                        <span className="analytics-icon">📈</span>
                        <h2>Аналітика рахунку</h2>
                    </div>
                    <div className="analytics-title-spacer" />
                </div>

                <div className="analytics-filters">
                    <div className="filter-group">
                        <label className="filter-label">Рахунок:</label>
                        <select
                            value={selectedAnalyticsAccount}
                            onChange={(e) => setSelectedAnalyticsAccount(e.target.value)}
                            className="analytics-select"
                        >
                            {customer?.accounts.map((acc, idx) => (
                                <option key={idx} value={acc.accountNumber}>
                                    **** {acc.accountNumber.slice(-4)} ({acc.currency}) - {acc.balance.toLocaleString()} {getCurrencySymbol(acc.currency)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Місяць:</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="analytics-select"
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Рік:</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="analytics-select"
                        >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="analytics-content">
                <div className="analytics-summary">
                    <div className="summary-card income">
                        <div className="summary-label">Доходи ({months[selectedMonth]})</div>
                        <div className="amount income">
                            +{incomeValue.toLocaleString()} {currencySymbol}
                        </div>
                    </div>
                    <div className="summary-card expenses">
                        <div className="summary-label">Витрати ({months[selectedMonth]})</div>
                        <div className="amount expenses">
                            -{expenseValue.toLocaleString()} {currencySymbol}
                        </div>
                    </div>
                    <div className="summary-card transactions">
                        <div className="summary-label">Кількість операцій</div>
                        <div className="amount neutral">{operationsCount}</div>
                    </div>
                </div>

                {!summaryData ? (
                    <div className="no-data-chart">
                        <p>{isLoading ? 'Завантаження аналітики...' : 'Аналітика недоступна для вибраних параметрів.'}</p>
                    </div>
                ) : (
                    <div className="charts-grid">
                        <div className="chart-card">
                            <h3>Структура ({currencySymbol})</h3>
                            <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val: number) => `${val.toLocaleString()} ${currencySymbol}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="chart-legend">
                                {pieData.map((item, i) => (
                                    <div key={i} className="legend-item">
                                        <span className="legend-dot" style={{ background: item.color }} />
                                        <span>{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="chart-card">
                            <h3>Динаміка по днях</h3>
                            <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={timelineData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#718096' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#718096' }} />
                                        <Tooltip
                                            formatter={(val: number) => `${val.toLocaleString()} ${currencySymbol}`}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                            cursor={{ fill: 'rgba(102, 126, 234, 0.1)' }}
                                        />
                                        <Bar dataKey="income" name="Доходи" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        <Bar dataKey="expenses" name="Витрати" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsSection;
