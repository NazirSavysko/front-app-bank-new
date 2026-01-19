// src/selections/analytic/AnalyticsSection.tsx
import React, { useMemo } from 'react';
import type { CustomerData, Transaction } from '../../types';
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
import { parseSafeDate } from '../../utils/datetime';

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

/**
 * Показывает аналитику ТОЛЬКО по выбранному аккаунту і за вибраний місяць/рік.
 * Напрямок транзакції визначається за співпадінням карти акаунта з
 * senderCardNumber/receiverCardNumber (з підтримкою старого поля numberOfCard).
 */
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
    // Місяці для селектора
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

    // Визначаємо роки (з 5-річного "вікна" карт) — залишив як було
    const startYear = useMemo(() => {
        if (!customer) return new Date().getFullYear();
        let earliest = new Date().getFullYear();
        customer.accounts.forEach((acc) => {
            const expYear = new Date(acc.card.expirationDate).getFullYear();
            const creationYear = expYear - 5;
            if (creationYear < earliest) earliest = creationYear;
        });
        return earliest;
    }, [customer]);

    const years = useMemo(() => {
        const current = new Date().getFullYear();
        const arr: number[] = [];
        for (let year = startYear; year <= current; year++) arr.push(year);
        return arr.reverse();
    }, [startYear]);

    // Обраний акаунт та його карта
    const selectedAccount = useMemo(
        () => customer?.accounts.find((a) => a.accountNumber === selectedAnalyticsAccount),
        [customer, selectedAnalyticsAccount]
    );
    const selectedCard = selectedAccount?.card.cardNumber || '';

    // Утиліти, сумісні зі старими даними
    const getSenderCard = (tr: Transaction) =>
        tr.senderCardNumber ?? (!tr.isRecipient ? tr.numberOfCard : undefined) ?? '';
    const getReceiverCard = (tr: Transaction) =>
        tr.receiverCardNumber ?? (tr.isRecipient ? tr.numberOfCard : undefined) ?? '';

    const isIncomingForSelected = (tr: Transaction) => getReceiverCard(tr) === selectedCard;

    // Валютний символ
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
    const accountToShow = selectedAccount || customer?.accounts[0];
    const currencySymbol = getCurrencySymbol(accountToShow?.currency);

    // ТІЛЬКИ транзакції вибраного акаунта
    const allTransactions: Transaction[] = useMemo(
        () => selectedAccount?.transactions || [],
        [selectedAccount]
    );

    // Діапазони дат поточного і попереднього місяця
    const curStart = new Date(selectedYear, selectedMonth, 1);
    const curEnd = new Date(selectedYear, selectedMonth + 1, 1);
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const prevStart = new Date(prevYear, prevMonth, 1);
    const prevEnd = new Date(prevYear, prevMonth + 1, 1);

    // Фільтрація по періодах (через parseSafeDate для стабільності таймзони/формату)
    const currentPeriodTransactions = allTransactions.filter((tr) => {
        const d = parseSafeDate(tr.transactionDate);
        return d >= curStart && d < curEnd;
    });
    const prevPeriodTransactions = allTransactions.filter((tr) => {
        const d = parseSafeDate(tr.transactionDate);
        return d >= prevStart && d < prevEnd;
    });

    // Підрахунок по напрямку тільки для COMPLETED
    const calcStats = (txs: Transaction[]) => {
        let income = 0;
        let expenses = 0;
        for (const tr of txs) {
            if (tr.status !== 'COMPLETED') continue;
            if (isIncomingForSelected(tr)) income += tr.amount;
            else expenses += tr.amount;
        }
        return { income, expenses };
    };

    const currentStats = calcStats(currentPeriodTransactions);
    const prevStats = calcStats(prevPeriodTransactions);

    // Дані для кругової
    const pieData = useMemo(() => {
        const parts = [];
        if (currentStats.income > 0) parts.push({ name: 'Доходи', value: currentStats.income, color: '#10B981' });
        if (currentStats.expenses > 0) parts.push({ name: 'Витрати', value: currentStats.expenses, color: '#EF4444' });
        return parts;
    }, [currentStats]);

    // Дані для таймлайну (по днях)
    const timelineData = useMemo(() => {
        const daily: Record<number, { income: number; expenses: number }> = {};
        for (const tr of currentPeriodTransactions) {
            if (tr.status !== 'COMPLETED') continue;
            const d = parseSafeDate(tr.transactionDate).getDate();
            if (!daily[d]) daily[d] = { income: 0, expenses: 0 };
            if (isIncomingForSelected(tr)) daily[d].income += tr.amount;
            else daily[d].expenses += tr.amount;
        }
        return Object.entries(daily)
            .map(([day, v]) => ({ day: Number(day), income: v.income, expenses: v.expenses }))
            .sort((a, b) => a.day - b.day);
    }, [currentPeriodTransactions]);

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

                {/* Фільтри */}
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
                            {years.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="analytics-subtitle">
                    <div className="subtitle-account">
                        <span className="subtitle-icon">🏦</span>
                        <span>
              Аналітика рахунку ****{accountToShow?.accountNumber.slice(-4)} за {months[selectedMonth]} {selectedYear}
            </span>
                        <span className="subtitle-detail"> ({accountToShow?.currency})</span>
                    </div>
                </div>
            </div>

            {/* Сводки */}
            <div className="analytics-summary">
                <div className="summary-card income">
                    <div className="card-icon">💰</div>
                    <div className="card-content">
                        <h3>Доходи за період</h3>
                        <div className="amount positive">+{currentStats.income.toLocaleString()} {currencySymbol}</div>
                        <div className="change">
                            {prevStats.income > 0 && (
                                <span className={currentStats.income >= prevStats.income ? 'positive' : 'negative'}>
                  {currentStats.income >= prevStats.income ? '↗️' : '↘️'}
                                    {Math.abs(((currentStats.income - prevStats.income) / prevStats.income) * 100).toFixed(1)}% до попереднього місяця
                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="summary-card expenses">
                    <div className="card-icon">💸</div>
                    <div className="card-content">
                        <h3>Витрати за період</h3>
                        <div className="amount negative">-{currentStats.expenses.toLocaleString()} {currencySymbol}</div>
                        <div className="change">
                            {prevStats.expenses > 0 && (
                                <span className={currentStats.expenses <= prevStats.expenses ? 'positive' : 'negative'}>
                  {currentStats.expenses <= prevStats.expenses ? '↘️' : '↗️'}
                                    {Math.abs(((currentStats.expenses - prevStats.expenses) / prevStats.expenses) * 100).toFixed(1)}% до попереднього місяця
                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="summary-card balance">
                    <div className="card-icon">📊</div>
                    <div className="card-content">
                        <h3>Чистий результат</h3>
                        <div className={`amount ${currentStats.income - currentStats.expenses >= 0 ? 'positive' : 'negative'}`}>
                            {currentStats.income - currentStats.expenses >= 0 ? '+' : ''}
                            {(currentStats.income - currentStats.expenses).toLocaleString()} {currencySymbol}
                        </div>
                        <div className="subtitle">за рахунком</div>
                    </div>
                </div>

                <div className="summary-card transactions">
                    <div className="card-icon">🔄</div>
                    <div className="card-content">
                        <h3>Кількість операцій</h3>
                        <div className="amount neutral">{currentPeriodTransactions.length}</div>
                        <div className="subtitle">за рахунком</div>
                    </div>
                </div>
            </div>

            {/* Графіки */}
            <div className="analytics-charts">
                {pieData.length > 0 && (
                    <div className="chart-card">
                        <h3>💼 Структура фінансів за період</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                        {pieData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => [`${value.toLocaleString()} ${currencySymbol}`, '']}
                                        labelStyle={{ color: '#374151' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="chart-legend">
                            {pieData.map((item, i) => (
                                <div key={i} className="legend-item">
                                    <div className="legend-color" style={{ backgroundColor: item.color }} />
                                    <span>
                    {item.name}: {item.value.toLocaleString()} {currencySymbol}
                  </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {timelineData.length > 0 && (
                    <div className="chart-card">
                        <h3>📅 Динаміка по днях місяця</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={timelineData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                    <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <YAxis
                                        tick={{ fill: '#6B7280', fontSize: 12 }}
                                        tickFormatter={(v) => `${v.toLocaleString()} ${currencySymbol}`}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [`${value.toLocaleString()} ${currencySymbol}`, '']}
                                        labelStyle={{ color: '#374151' }}
                                    />
                                    <Bar dataKey="income" fill="#10B981" name="Доходи" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expenses" fill="#EF4444" name="Витрати" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* Інсайти */}
            <div className="analytics-insights">
                <h3>💡 Фінансові поради за період</h3>
                <div className="insights-grid">
                    {currentStats.expenses > currentStats.income && (
                        <div className="insight-card warning">
                            <span className="insight-icon">⚠️</span>
                            <div>
                                <h4>Дефіцит бюджету</h4>
                                <p>
                                    Витрати перевищують доходи на {(currentStats.expenses - currentStats.income).toLocaleString()} {currencySymbol} за {months[selectedMonth]}.
                                </p>
                            </div>
                        </div>
                    )}

                    {prevStats.expenses > 0 && currentStats.expenses < prevStats.expenses && (
                        <div className="insight-card success">
                            <span className="insight-icon">🎉</span>
                            <div>
                                <h4>Економія коштів</h4>
                                <p>
                                    Витрати зменшилися на {(prevStats.expenses - currentStats.expenses).toLocaleString()} {currencySymbol} порівняно з попереднім періодом!
                                </p>
                            </div>
                        </div>
                    )}

                    {currentStats.income > prevStats.income && prevStats.income > 0 && (
                        <div className="insight-card success">
                            <span className="insight-icon">📈</span>
                            <div>
                                <h4>Зростання доходів</h4>
                                <p>
                                    Доходи збільшилися на {(currentStats.income - prevStats.income).toLocaleString()} {currencySymbol}. Відмінний результат!
                                </p>
                            </div>
                        </div>
                    )}

                    {currentStats.income > 0 && currentStats.expenses > 0 && (
                        <div className="insight-card info">
                            <span className="insight-icon">📊</span>
                            <div>
                                <h4>Коефіцієнт заощаджень</h4>
                                <p>
                                    {currentStats.income > currentStats.expenses
                                        ? `Ви заощаджуєте ${(
                                            ((currentStats.income - currentStats.expenses) / currentStats.income) *
                                            100
                                        ).toFixed(1)}% від доходів`
                                        : 'Рекомендуємо заощаджувати хоча б 10–20% від доходів'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="insight-card info">
                        <span className="insight-icon">🔢</span>
                        <div>
                            <h4>Статистика періоду</h4>
                            <p>
                                Аналіз за {months[selectedMonth]} {selectedYear} • Операцій: {currentPeriodTransactions.length} • Валюта: {accountToShow?.currency}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsSection;
