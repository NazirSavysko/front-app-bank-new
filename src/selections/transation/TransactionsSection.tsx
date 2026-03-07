// src/selections/transation/TransactionsSection.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTransactions } from '../../api';
import type { Account, Transaction } from '../../types';
import TransactionCard from '../../components/TransactionCard.tsx';
import './TransactionsSection.css';

const PAGE_SIZE = 10;

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
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);
    // Ref-based guard: avoids stale-closure issues when account switches mid-request
    const loadingRef = useRef(false);

    const selectedAccount = accounts[selectedAccountIndex];
    const accountNumber = selectedAccount?.accountNumber;

    // Reset state when account changes; also reset the loading ref so that a
    // switch while a request is in-flight doesn't block the new account's load.
    useEffect(() => {
        loadingRef.current = false;
        setTransactions([]);
        setPage(0);
        setHasMore(true);
        setIsError(false);
        setLoading(false);
    }, [accountNumber]);

    // Fetch a single page and append results
    const loadPage = useCallback(async (pageToLoad: number) => {
        if (!accountNumber || loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        setIsError(false);
        try {
            const data = await fetchTransactions(accountNumber, pageToLoad, PAGE_SIZE);
            const newItems = data.content ?? [];
            // Mark end-of-data when: empty list, partial page, or backend signals last page
            if (newItems.length === 0 || newItems.length < PAGE_SIZE || data.last) {
                setHasMore(false);
            }
            if (newItems.length > 0) {
                setTransactions(prev => [...prev, ...newItems]);
            }
        } catch {
            setIsError(true);
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [accountNumber]);

    // Load the current page whenever `page` or `accountNumber` changes
    useEffect(() => {
        loadPage(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, accountNumber]);

    // IntersectionObserver triggers next page only when hasMore && !loading
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    setPage(p => p + 1);
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, loading]);

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
                {transactions.length === 0 && loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>Завантаження...</div>
                ) : isError && transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>Помилка завантаження транзакцій</div>
                ) : transactions.length > 0 ? (
                    <>
                        {transactions.map((tr: Transaction, idx: number) => (
                            <TransactionCard
                                key={`${tr.transactionDate}-${tr.senderCardNumber}-${idx}`}
                                transaction={tr}
                            />
                        ))}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Транзакцій поки немає</div>
                )}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} style={{ height: '1px' }} />

            {/* Loading indicator for next page */}
            {loading && transactions.length > 0 && (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#718096' }}>Завантаження...</div>
            )}

            {/* End of list indicator */}
            {!hasMore && transactions.length > 0 && (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#718096' }}>Кінець списку</div>
            )}
        </div>
    );
};

export default TransactionsSection;
