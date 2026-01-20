// src/selections/transation/TransactionsSection.tsx
import React from 'react';
import type { Account, Transaction } from '../../types';
import TransactionCard from '../../components/TransactionCard';
import { parseSafeDate } from '../../utils/datetime';
import './TransactionsSection.css';

export interface TransactionsSectionProps {
    accounts: Account[];
    selectedAccountIndex: number;
    setSelectedAccountIndex: (index: number) => void;
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
                                                                     filterStartDate,
                                                                     setFilterStartDate,
                                                                     filterEndDate,
                                                                     setFilterEndDate,
                                                                     filterType,
                                                                     setFilterType,
                                                                     onAnalytics
                                                                 }) => {
    const selectedAccount = accounts[selectedAccountIndex];
    const selectedCard = selectedAccount.card.cardNumber;

    // Беремо транзакції ТІЛЬКИ обраного рахунку (без flatMap по всіх рахунках)
    let filtered: Transaction[] = [...(selectedAccount.transactions || [])];

    // Сумісність зі старими даними:
    const getSenderCard = (tr: Transaction) =>
        tr.senderCardNumber ?? (!tr.isRecipient ? tr.numberOfCard : undefined) ?? '';
    const getReceiverCard = (tr: Transaction) =>
        tr.receiverCardNumber ?? (tr.isRecipient ? tr.numberOfCard : undefined) ?? '';

    // Фільтри по даті
    if (filterStartDate) {
        const from = new Date(filterStartDate);
        filtered = filtered.filter(tr => parseSafeDate(tr.transactionDate) >= from);
    }
    if (filterEndDate) {
        const to = new Date(filterEndDate);
        // включно до кінця дня
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter(tr => parseSafeDate(tr.transactionDate) <= to);
    }

    // Фільтр за напрямком (приход/витрата)
    if (filterType !== 'all') {
        filtered = filtered.filter(tr => {
            const isIncoming = getReceiverCard(tr) === selectedCard;
            return filterType === 'received' ? isIncoming : !isIncoming;
        });
    }

    // Дедуплікація транзакцій усередині рахунку (на випадок, якщо бек іноді дублює)
    const uniq = new Map<string, Transaction>();
    for (const tr of filtered) {
        const key = [
            parseSafeDate(tr.transactionDate).getTime(),
            tr.amount,
            tr.currencyCode,
            getSenderCard(tr),
            getReceiverCard(tr),
            tr.status,
            tr.description || ''
        ].join('|');
        if (!uniq.has(key)) uniq.set(key, tr);
    }
    filtered = Array.from(uniq.values());

    // Сортуємо за датою (нові зверху)
    filtered.sort(
        (a, b) => parseSafeDate(b.transactionDate).getTime() - parseSafeDate(a.transactionDate).getTime()
    );

    return (
        <div className="transactions-list">
            {/* Головний заголовок "Транзакції" і кнопка аналітики */}
            <div className="transactions-top-bar main-header">
                <h2 className="section-title-internal">Транзакції</h2>
                <button className="analytics-button" onClick={onAnalytics} title="Перейти до аналітики">
                    <span className="analytics-icon">📊</span>
                    Аналітика
                </button>
            </div>

            {/* Панель фільтрів */}
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

                <div className="filter-group">
                    <label className="filter-label">Від дати:</label>
                    <input
                        type="date"
                        value={filterStartDate}
                        onChange={e => setFilterStartDate(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <label className="filter-label">До дати:</label>
                    <input
                        type="date"
                        value={filterEndDate}
                        onChange={e => setFilterEndDate(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <label className="filter-label">Тип:</label>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value as 'all' | 'sent' | 'received')}
                    >
                        <option value="all">Всі транзакції</option>
                        <option value="sent">Тільки витрати</option>
                        <option value="received">Тільки надходження</option>
                    </select>
                </div>
            </div>

            {/* Заголовок історії (схожий стиль, але менший або такий же) */}
            <h3 className="history-headline">Історія транзакцій</h3>

            {/* Список карток (скролиться) */}
            <div className="account-transactions">

                {filtered.length > 0 ? (
                    <>
                        {filtered.map((tr, idx) => (
                            <TransactionCard
                                key={`${parseSafeDate(tr.transactionDate).getTime()}-${idx}`}
                                transaction={tr}
                                selectedCardNumber={selectedCard}
                            />
                        ))}
                    </>
                ) : (
                    <p>Немає транзакцій за вибраними параметрами</p>
                )}
            </div>
        </div>
    );
};

export default TransactionsSection;
