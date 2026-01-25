// src/selections/transation/TransactionsSection.tsx
import React, { useEffect, useState } from 'react';
import type { Account, Transaction, Page } from '../../types';
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
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const selectedAccount = accounts[selectedAccountIndex];
    const accountNumber = selectedAccount?.accountNumber;
    const selectedCard = selectedAccount?.card.cardNumber;

    // Reset pagination when account changes
    useEffect(() => {
        if (accountNumber) setPage(0);
    }, [accountNumber]);

    // Fetch transactions
    useEffect(() => {
        if (!accountNumber) return;

        const fetchTrx = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('accessToken');
                const res = await fetch(`/api/transactions/transactions?accountNumber=${accountNumber}&page=${page}&size=10`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: token ? `Bearer ${token}` : ''
                    }
                });
                if (res.ok) {
                    const data: Page<Transaction> = await res.json();
                    setTransactions(data.content);
                    setTotalPages(data.totalPages);
                } else {
                    console.error('Failed to fetch transactions');
                    setTransactions([]);
                }
            } catch (err) {
                console.error(err);
                setTransactions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTrx();
    }, [accountNumber, page]);

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
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>Завантаження...</div>
                ) : transactions.length > 0 ? (
                    <>
                        {transactions.map((tr, idx) => (
                            <TransactionCard
                                key={`${tr.transactionDate}-${idx}`}
                                transaction={tr}
                                selectedCardNumber={selectedCard!}
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
                        disabled={page === 0 || loading}
                    >
                        &larr; Назад
                    </button>
                    <span className="pagination-info">
                        Сторінка {page + 1} з {totalPages}
                    </span>
                    <button
                        className="pagination-btn"
                        onClick={handleNext}
                        disabled={page >= totalPages - 1 || loading}
                    >
                        Вперед &rarr;
                    </button>
                </div>
            )}
        </div>
    );
};

export default TransactionsSection;
