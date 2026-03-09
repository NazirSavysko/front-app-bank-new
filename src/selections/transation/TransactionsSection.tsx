// src/selections/transation/TransactionsSection.tsx
import React, { useEffect, useRef } from 'react';
import type { Account, Transaction } from '../../types';
import TransactionCard from '../../components/TransactionCard.tsx';
import { useTransactions } from '../../hooks/useTransactions';
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
                                                                     setSelectedAccountIndex
                                                                  }) => {
    const transactionsContainerRef = useRef<HTMLDivElement | null>(null);
    const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

    const selectedAccount = accounts[selectedAccountIndex];
    const accountNumber = selectedAccount?.accountNumber;

    const {
        transactions,
        isLoading,
        isError,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    } = useTransactions(accountNumber);

    useEffect(() => {
        const triggerElement = loadMoreTriggerRef.current;

        if (!triggerElement) {
            return;
        }

        const observer = new IntersectionObserver(
            entries => {
                const entry = entries[0];

                if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    void fetchNextPage();
                }
            },
            {
                root: transactionsContainerRef.current,
                rootMargin: '0px 0px 120px 0px',
            }
        );

        observer.observe(triggerElement);

        return () => observer.disconnect();
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    if (!selectedAccount) return null;

    return (
        <div className="transactions-list">
            {/* Top Bar */}
            <div className="transactions-top-bar main-header">
                <h2 className="section-title-internal">Транзакції</h2>
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

            <div className="account-transactions" ref={transactionsContainerRef}>
                {isLoading ? (
                    <div className="transactions-loading transactions-loading--initial">
                        <div className="transactions-spinner transactions-spinner--lg" aria-label="Завантаження транзакцій"></div>
                    </div>
                ) : isError ? (
                    <div className="transactions-message transactions-message--error">Помилка завантаження транзакцій</div>
                ) : transactions.length > 0 ? (
                    <>
                        {transactions.map((tr: Transaction, idx: number) => (
                            <TransactionCard
                                key={`${tr.transactionDate}-${idx}`}
                                transaction={tr}
                            />
                        ))}
                        {hasNextPage && (
                            <div
                                ref={loadMoreTriggerRef}
                                className="transactions-load-trigger"
                                aria-hidden="true"
                            ></div>
                        )}
                        {isFetchingNextPage && (
                            <div className="transactions-loading transactions-loading--more">
                                <div className="transactions-spinner transactions-spinner--sm" aria-label="Завантаження додаткових транзакцій"></div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="transactions-message transactions-empty-state">Немає транзакцій</div>
                )}
            </div>
        </div>
    );
};

export default TransactionsSection;
