// src/selections/transation/TransactionsSection.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
    const [currentPage, setCurrentPage] = useState(0);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [isLastPage, setIsLastPage] = useState(false);
    const loadedPagesRef = useRef(new Set<number>());
    const sentinelRef = useRef<HTMLDivElement>(null);

    const selectedAccount = accounts[selectedAccountIndex];
    const accountNumber = selectedAccount?.accountNumber;

    // Reset infinite scroll state when account changes
    useEffect(() => {
        setAllTransactions([]);
        setCurrentPage(0);
        setIsLastPage(false);
        loadedPagesRef.current = new Set<number>();
    }, [accountNumber]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['transactions', accountNumber, currentPage],
        queryFn: () => fetchTransactions(accountNumber!, currentPage, 10),
        enabled: !!accountNumber,
        staleTime: 0,
        gcTime: 0,
    });

    // Append new page data to accumulated list, preventing duplicates
    useEffect(() => {
        if (data?.content && !loadedPagesRef.current.has(currentPage)) {
            loadedPagesRef.current.add(currentPage);
            setAllTransactions(prev => [...prev, ...data.content]);
            setIsLastPage(data.last);
        }
    }, [data, currentPage]);

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoading && !isLastPage) {
                    setCurrentPage(p => p + 1);
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [isLoading, isLastPage]);

    if (!selectedAccount) return null;

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
                {allTransactions.length === 0 && isLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>Завантаження...</div>
                ) : isError && allTransactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>Помилка завантаження транзакцій</div>
                ) : allTransactions.length > 0 ? (
                    <>
                        {allTransactions.map((tr: Transaction, idx: number) => (
                            <TransactionCard
                                key={`${tr.transactionDate}-${tr.senderCardNumber}-${idx}`}
                                transaction={tr}
                            />
                        ))}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Немає транзакцій</div>
                )}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} style={{ height: '1px' }} />

            {/* Loading indicator for next page */}
            {isLoading && allTransactions.length > 0 && (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#718096' }}>Завантаження...</div>
            )}

            {/* End of list indicator */}
            {isLastPage && allTransactions.length > 0 && (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#718096' }}>Кінець списку</div>
            )}
        </div>
    );
};

export default TransactionsSection;
