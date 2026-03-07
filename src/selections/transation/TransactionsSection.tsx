// src/selections/transation/TransactionsSection.tsx
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions } from '../../api';
import type { Account, Transaction, HistoryFilter } from '../../types';
import TransactionCard from '../../components/TransactionCard.tsx';
import './TransactionsSection.css';

export interface TransactionsSectionProps {
    accounts: Account[];
    selectedAccountIndex: number;
    setSelectedAccountIndex: (index: number) => void;
    onAnalytics: () => void;
}

const FILTER_TABS: { label: string; value: HistoryFilter }[] = [
    { label: 'Усі', value: 'ALL' },
    { label: 'Перекази', value: 'TRANSFERS' },
    { label: 'Платежі', value: 'PAYMENTS' },
];

const TransactionsSection: React.FC<TransactionsSectionProps> = ({
                                                                     accounts,
                                                                     selectedAccountIndex,
                                                                     setSelectedAccountIndex,
                                                                     onAnalytics
                                                                 }) => {
    const [page, setPage] = useState(0);
    const [filter, setFilter] = useState<HistoryFilter>('ALL');

    const selectedAccount = accounts[selectedAccountIndex];
    const accountId = selectedAccount?.id;

    // Reset pagination when account or filter changes
    useEffect(() => {
        setPage(0);
    }, [accountId, filter]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['transactions', accountId, filter, page],
        queryFn: () => fetchTransactions(accountId!, filter, page, 10),
        enabled: !!accountId,
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: true,
    });

    const transactions = [...(data?.content || [])].sort(
        (a: Transaction, b: Transaction) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const totalPages = data?.totalPages || 0;

    if (!selectedAccount) return null;

    const handlePrev = () => {
        if (page > 0) setPage(p => p - 1);
    };

    const handleNext = () => {
        if (page < totalPages - 1) setPage(p => p + 1);
    };

    const handleFilterChange = (value: HistoryFilter) => {
        setFilter(value);
    };

    return (
        <div className="transactions-list">
            {/* Top Bar */}
            <div className="transactions-top-bar main-header">
                <h2 className="section-title-internal">Транзакції</h2>
                <button className="analytics-button" onClick={onAnalytics} title="Перейти до аналітики">
                    Аналітика
                </button>
            </div>

            {/* Account Selector */}
            <div className="transactions-filter">
                <div className="filter-group">
                    <label className="filter-label">Рахунок:</label>
                    <select
                        value={selectedAccountIndex}
                        onChange={e => setSelectedAccountIndex(Number(e.target.value))}
                    >
                        {accounts.map((acc, idx) => (
                            <option key={idx} value={idx}>
                                **** {acc.accountNumber.slice(-4)} ({acc.currency})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="history-filter-tabs">
                {FILTER_TABS.map(tab => (
                    <button
                        key={tab.value}
                        className={`history-tab-btn${filter === tab.value ? ' active' : ''}`}
                        onClick={() => handleFilterChange(tab.value)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <h3 className="history-headline">Історія транзакцій</h3>

            <div className="account-transactions">
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>Завантаження...</div>
                ) : isError ? (
                     <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>Помилка завантаження транзакцій</div>
                ) : transactions.length > 0 ? (
                    <>
                        {transactions.map((tr: Transaction, idx: number) => (
                            <TransactionCard
                                key={tr.id != null ? String(tr.id) : `${tr.date}-${idx}`}
                                transaction={tr}
                            />
                        ))}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Немає транзакцій</div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button
                        className="pagination-btn"
                        onClick={handlePrev}
                        disabled={page === 0 || isLoading}
                    >
                        &larr; Назад
                    </button>
                    <span className="pagination-info">
                        Сторінка {page + 1} з {totalPages}
                    </span>
                    <button
                        className="pagination-btn"
                        onClick={handleNext}
                        disabled={page >= totalPages - 1 || isLoading}
                    >
                        Вперед &rarr;
                    </button>
                </div>
            )}
        </div>
    );
};

export default TransactionsSection;
