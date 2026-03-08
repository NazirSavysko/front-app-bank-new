// src/selections/transation/TransactionsSection.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
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

const PAGE_SIZE = 10;

const TransactionsSection: React.FC<TransactionsSectionProps> = ({
                                                                     accounts,
                                                                     selectedAccountIndex,
                                                                     setSelectedAccountIndex,
                                                                     onAnalytics
                                                                  }) => {
    const selectedAccount = accounts[selectedAccountIndex];
    const accountNumber = selectedAccount?.accountNumber;
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

    const {
        data,
        isLoading,
        isError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['transactions', accountNumber],
        queryFn: ({ pageParam }) => fetchTransactions(accountNumber!, pageParam, PAGE_SIZE),
        enabled: !!accountNumber,
        initialPageParam: 0,
        getNextPageParam: lastPage => (
            lastPage.last
                ? undefined
                : lastPage.pageable.pageNumber + 1
        ),
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    const transactions = useMemo(
        () => data?.pages.flatMap(page => page.content) ?? [],
        [data],
    );

    useEffect(() => {
        const root = scrollContainerRef.current;
        const trigger = loadMoreTriggerRef.current;

        if (!root || !trigger || !hasNextPage || isFetchingNextPage) {
            return;
        }

        const observer = new IntersectionObserver(
            entries => {
                const entry = entries[0];

                if (entry.isIntersecting) {
                    void fetchNextPage();
                }
            },
            {
                root,
                rootMargin: '120px 0px',
                threshold: 0.1,
            },
        );

        observer.observe(trigger);

        return () => {
            observer.disconnect();
        };
    }, [fetchNextPage, hasNextPage, isFetchingNextPage, transactions.length]);

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

            <div className="account-transactions" ref={scrollContainerRef}>
                {isLoading ? (
                    <div className="transactions-loading-state" aria-live="polite" aria-label="Завантаження транзакцій">
                        <div className="transactions-spinner" />
                    </div>
                ) : isError ? (
                    <div className="transactions-error-state">Помилка завантаження транзакцій</div>
                ) : transactions.length > 0 ? (
                    <>
                        {transactions.map((tr: Transaction, idx: number) => (
                            <TransactionCard
                                key={`${tr.transactionDate}-${idx}`}
                                transaction={tr}
                            />
                        ))}

                        <div ref={loadMoreTriggerRef} className="transactions-load-trigger" aria-hidden="true" />

                        {isFetchingNextPage && (
                            <div className="transactions-loading-more" aria-live="polite" aria-label="Завантаження наступних транзакцій">
                                <div className="transactions-spinner transactions-spinner--small" />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="transactions-empty-state">Немає транзакцій</div>
                )}
            </div>
        </div>
    );
};

export default TransactionsSection;
