// src/selections/transation/TransactionsSection.tsx
import React, { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchTransactions } from '../../api';
import type { Account, Transaction } from '../../types';
import TransactionCard from '../../components/TransactionCard.tsx';
import './TransactionsSection.css';

export interface TransactionsSectionProps {
    accounts: Account[];
    selectedAccountIndex: number;
    setSelectedAccountIndex: (index: number) => void;
    // Filters are kept in props for interface compatibility but not used yet in new backend pagination
    filterStartDate: string;
    setFilterStartDate: (value: string) => void;
    filterEndDate: string;
    setFilterEndDate: (value: string) => void;
    filterType: 'all' | 'sent' | 'received';
    setFilterType: (value: 'all' | 'sent' | 'received') => void;
    onAnalytics: () => void;
}

const TransactionsSection: React.FC<TransactionsSectionProps> = ({
                                                                     accounts,
                                                                     selectedAccountIndex,
                                                                     setSelectedAccountIndex,
                                                                     onAnalytics
                                                                 }) => {
    const [page, setPage] = useState(0);

    const selectedAccount = accounts[selectedAccountIndex];
    const accountNumber = selectedAccount?.accountNumber;

    // Reset pagination when account changes
    useEffect(() => {
        if (accountNumber) setPage(0);
    }, [accountNumber]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['transactions', accountNumber, page],
        queryFn: () => fetchTransactions(accountNumber!, page, 10),
        enabled: !!accountNumber,
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    const transactions = data?.content || [];
    const totalPages = data?.totalPages || 0;

    if (!selectedAccount) return null;

    const handlePrev = () => {
        if (page > 0) setPage(p => p - 1);
    };

    const handleNext = () => {
        if (page < totalPages - 1) setPage(p => p + 1);
    };

    return (
        <div className="transactions-list">
            {/* Top Bar */}
            <div className="transactions-top-bar main-header">
                <h2 className="section-title-internal">Транзакції</h2>
                <button className="analytics-button" onClick={onAnalytics} title="Перейти до аналітики">
                    <span className="analytics-icon">📊</span>
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
                {/* Date/Type filters are hidden as they are not yet supported by new backend pagination */}
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
                                key={`${tr.transactionDate}-${idx}`}
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
