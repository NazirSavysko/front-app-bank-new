// src/selections/analytic/AnalyticsSection.tsx
import React, { useMemo, useEffect, useState } from 'react';
import type { CustomerData, AnalyticsSummary } from '../../types';
import './AnalyticsSection.css';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
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

const formatAmount = (value: number) => value.toLocaleString('uk-UA');

const formatMoney = (value: number, currencyCode: string) => {
    return `${value.toLocaleString('uk-UA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} ${getCurrencySymbol(currencyCode)}`;
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
    const currencyCode = (summaryData?.currency || accountToShow?.currency || 'UAH').toUpperCase();

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

    const incomeValue = summaryData?.totalIncome ?? 0;
    const expenseValue = summaryData?.totalExpense ?? 0;
    const operationsCount = summaryData?.operationsCount ?? 0;
    const netValue = incomeValue - expenseValue;
    const totalFlow = incomeValue + expenseValue;
    const incomeShare = totalFlow > 0 ? (incomeValue / totalFlow) * 100 : 0;
    const expenseShare = totalFlow > 0 ? (expenseValue / totalFlow) * 100 : 0;
    const hasData = totalFlow > 0 || operationsCount > 0;

    const pieData = useMemo(() => {
        if (totalFlow === 0) return [];
        return [
            { name: 'Надходження', value: incomeValue, color: '#10B981' },
            { name: 'Витрати', value: expenseValue, color: '#EF4444' },
        ];
    }, [incomeValue, expenseValue, totalFlow]);

    return (
        <div className="analytics-container">
            <div className="analytics-topbar">
                <button className="btn-back" onClick={onBack} title="Повернутися до транзакцій">
                    ← Назад до транзакцій
                </button>
                <div>
                    <h2 className="analytics-title">Аналітика рахунку</h2>
                    <p className="analytics-subtitle">
                        {months[selectedMonth]} {selectedYear} · **** {selectedAnalyticsAccount.slice(-4)}
                    </p>
                </div>
            </div>

            <div className="analytics-filters">
                <div className="filter-group">
                    <label className="filter-label">Рахунок</label>
                    <select
                        value={selectedAnalyticsAccount}
                        onChange={(e) => setSelectedAnalyticsAccount(e.target.value)}
                        className="analytics-select"
                    >
                        {customer?.accounts.map((acc) => (
                            <option key={acc.accountNumber} value={acc.accountNumber}>
                                **** {acc.accountNumber.slice(-4)} ({acc.currency}) - {formatAmount(acc.balance)} {getCurrencySymbol(acc.currency)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Місяць</label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                        className="analytics-select"
                    >
                        {months.map((m, i) => (
                            <option key={m} value={i}>
                                {m}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Рік</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
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

            <div className="kpi-grid">
                <div className="kpi-card income">
                    <p className="kpi-label">Надходження</p>
                    <p className="kpi-value positive" title={formatMoney(incomeValue, currencyCode)}>
                        +{formatMoney(incomeValue, currencyCode)}
                    </p>
                </div>
                <div className="kpi-card expense">
                    <p className="kpi-label">Витрати</p>
                    <p className="kpi-value negative" title={formatMoney(expenseValue, currencyCode)}>
                        -{formatMoney(expenseValue, currencyCode)}
                    </p>
                </div>
                <div className="kpi-card net">
                    <p className="kpi-label">Чистий результат</p>
                    <p className={`kpi-value ${netValue >= 0 ? 'positive' : 'negative'}`} title={formatMoney(Math.abs(netValue), currencyCode)}>
                        {netValue >= 0 ? '+' : '-'}{formatMoney(Math.abs(netValue), currencyCode)}
                    </p>
                </div>
                <div className="kpi-card neutral">
                    <p className="kpi-label">Кількість операцій</p>
                    <p className="kpi-value" title={String(operationsCount)}>{operationsCount}</p>
                </div>
            </div>

            {isLoading ? (
                <div className="state-card">Завантаження аналітики...</div>
            ) : !summaryData || !hasData ? (
                <div className="state-card">За вибраний період немає достатньо даних для діаграми.</div>
            ) : (
                <div className="analytics-grid">
                    <div className="panel-card">
                        <h3>Структура потоку</h3>
                        <div className="donut-wrap">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={72}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val: number) => formatMoney(val, currencyCode)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="legend-row">
                            {pieData.map((item) => (
                                <div key={item.name} className="legend-item">
                                    <span className="legend-dot" style={{ background: item.color }} />
                                    <span>
                                        {item.name}: {formatMoney(item.value, currencyCode)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="panel-card">
                        <h3>Витрати vs Надходження</h3>
                        <div className="ratio-list">
                            <div className="ratio-row">
                                <div className="ratio-label">Надходження</div>
                                <div className="ratio-track">
                                    <div className="ratio-fill income" style={{ width: `${incomeShare}%` }} />
                                </div>
                                <div className="ratio-value">{incomeShare.toFixed(1)}%</div>
                            </div>
                            <div className="ratio-row">
                                <div className="ratio-label">Витрати</div>
                                <div className="ratio-track">
                                    <div className="ratio-fill expense" style={{ width: `${expenseShare}%` }} />
                                </div>
                                <div className="ratio-value">{expenseShare.toFixed(1)}%</div>
                            </div>
                        </div>
                        <div className="panel-note">
                            Всього оборот: <strong>{formatMoney(totalFlow, currencyCode)}</strong>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsSection;
