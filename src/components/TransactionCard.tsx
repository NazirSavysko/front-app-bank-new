// src/components/TransactionCard.tsx
import React, { useState } from 'react';
import type { Transaction } from '../types';
import { formatUkDateTime } from '../utils/datetime';

export interface TransactionCardProps {
    transaction: Transaction;
}

const formatAmount = (value: number) =>
    new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const STATUS_LABELS: Record<string, string> = {
    COMPLETED: 'Успішно',
    FAILED: 'Відхилено',
    CANCELLED: 'Скасовано',
    CANCELED: 'Скасовано',
};

const TRANSACTION_TITLES = {
    TRANSFER: {
        incoming: 'Поповнення з картки',
        outgoing: 'Переказ на картку',
    },
    IBAN_PAYMENT: {
        incoming: 'Поповнення за IBAN',
        outgoing: 'Оплата за IBAN',
    },
    INTERNET_PAYMENT: {
        incoming: 'Оплата інтернету',
        outgoing: 'Оплата інтернету',
    },
} as const;

const TRANSACTION_ICON_VARIANTS: Record<string, string> = {
    TRANSFER: 'transfer',
    IBAN_PAYMENT: 'iban-payment',
    INTERNET_PAYMENT: 'internet-payment',
};

const formatPersonName = (person?: { firstName: string; lastName: string }) => {
    if (!person) {
        return '';
    }

    return [person.firstName, person.lastName].filter(Boolean).join(' ');
};

const maskCardNumber = (cardNumber?: string) => (
    cardNumber ? (cardNumber.length > 4 ? `**** ${cardNumber.slice(-4)}` : '****') : '—'
);

const TransactionTypeIcon: React.FC<{ transactionType: string }> = ({ transactionType }) => {
    switch (transactionType) {
        case 'TRANSFER':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2.5" y="5.5" width="19" height="13" rx="2.5"></rect>
                    <path d="M2.5 10.5h19"></path>
                    <path d="M9 15.5h3"></path>
                    <path d="M13.5 3.5l3 3-3 3"></path>
                    <path d="M10.5 6.5h6"></path>
                </svg>
            );
        case 'IBAN_PAYMENT':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 10h18"></path>
                    <path d="M4 10v8"></path>
                    <path d="M9 10v8"></path>
                    <path d="M15 10v8"></path>
                    <path d="M20 10v8"></path>
                    <path d="M2 18h20"></path>
                    <path d="M12 3l9 5H3l9-5Z"></path>
                </svg>
            );
        case 'INTERNET_PAYMENT':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="8"></circle>
                    <path d="M4 12h16"></path>
                    <path d="M12 4a12 12 0 0 1 0 16"></path>
                    <path d="M12 4a12 12 0 0 0 0 16"></path>
                </svg>
            );
        default:
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M12 8v4"></path>
                    <path d="M12 16h.01"></path>
                </svg>
            );
    }
};

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
    const senderCard = transaction.senderCardNumber || '';
    const receiverCard = transaction.receiverCardNumber || '';
    const isIncoming = transaction.isRecipient === true;
    const statusLabel = STATUS_LABELS[transaction.status] || transaction.status;
    const statusClass = transaction.status === 'COMPLETED' ? 'status complete' : 'status cancelled';
    const typeAttr = isIncoming ? 'incoming' : 'outgoing';
    const amountPrefix = isIncoming ? '+' : '-';
    const mainAmount = `${amountPrefix}${formatAmount(transaction.amount)} ${transaction.currencyCode}`;
    const senderName = formatPersonName(transaction.sender);
    const receiverName = formatPersonName(transaction.receiver);
    const shortTitle = (() => {
        switch (transaction.transactionType) {
            case 'TRANSFER':
                return isIncoming ? TRANSACTION_TITLES.TRANSFER.incoming : TRANSACTION_TITLES.TRANSFER.outgoing;
            case 'IBAN_PAYMENT':
                return isIncoming ? TRANSACTION_TITLES.IBAN_PAYMENT.incoming : TRANSACTION_TITLES.IBAN_PAYMENT.outgoing;
            case 'INTERNET_PAYMENT':
                return TRANSACTION_TITLES.INTERNET_PAYMENT.outgoing;
            default:
                return 'Транзакція';
        }
    })();
    const amountColor = isIncoming ? 'var(--green-600)' : 'var(--red-600)';
    const iconVariant = TRANSACTION_ICON_VARIANTS[transaction.transactionType] || 'transfer';

    const [expanded, setExpanded] = useState(false);
    const toggleExpanded = () => setExpanded(prevExpanded => !prevExpanded);

    return (
        <div
            className={`transaction-card ${expanded ? 'expanded' : ''}`}
            data-type={typeAttr}
            onClick={toggleExpanded}
            onKeyDown={event => {
                if (event.key === 'Enter') {
                    toggleExpanded();
                }
            }}
            onKeyUp={event => {
                if (event.key === ' ') {
                    event.preventDefault();
                    toggleExpanded();
                }
            }}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
        >
            <div className="transaction-header">
                <div className={`transaction-icon transaction-icon--${iconVariant}`}>
                    <TransactionTypeIcon transactionType={transaction.transactionType} />
                </div>
                <div className="transaction-summary">
                    <div className="transaction-summary-main">
                        <div className="transaction-title">{shortTitle}</div>
                        <div className="transaction-date">{formatUkDateTime(transaction.transactionDate)}</div>
                    </div>
                    <div className="transaction-amount" style={{ color: amountColor }}>{mainAmount}</div>
                </div>
            </div>

            <div className="transaction-body">
                {transaction.transactionType === 'IBAN_PAYMENT' ? (
                    <>
                        {receiverName && (
                            <div>
                                <strong>Отримувач:</strong>
                                <div>{receiverName}</div>
                            </div>
                        )}
                        <div style={{ flexBasis: '100%' }}>
                            <strong>Опис:</strong>
                            <div>{transaction.description || '—'}</div>
                        </div>
                    </>
                ) : transaction.transactionType === 'INTERNET_PAYMENT' ? (
                    <div style={{ flexBasis: '100%' }}>
                        <strong>Опис:</strong>
                        <div>{transaction.description || '—'}</div>
                    </div>
                ) : (
                    <>
                        <div>
                            <strong>Відправник:</strong>
                            <div>
                                <span>{senderName || 'Карта'}</span>
                                {' '}
                                {maskCardNumber(senderCard)}
                            </div>
                        </div>
                        <div>
                            <strong>Отримувач:</strong>
                            <div>
                                <span>{receiverName || 'Карта'}</span>
                                {' '}
                                {maskCardNumber(receiverCard)}
                            </div>
                        </div>
                        {transaction.description && (
                            <div style={{ flexBasis: '100%' }}>
                                <strong>Опис:</strong>
                                <div>{transaction.description}</div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="transaction-footer">
                <span className={statusClass}>{statusLabel}</span>
                <span>{formatUkDateTime(transaction.transactionDate)}</span>
            </div>
        </div>
    );
};

export default React.memo(TransactionCard);
