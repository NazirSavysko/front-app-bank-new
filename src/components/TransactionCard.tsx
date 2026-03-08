// src/components/TransactionCard.tsx
import React, { useState } from 'react';
import type { Transaction } from '../types';
import { formatUkDateTime } from '../utils/datetime';

export interface TransactionCardProps {
    transaction: Transaction;
}

const formatAmount = (value: number) =>
    new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const getTransactionTitle = (transaction: Transaction) => {
    switch (transaction.transactionType) {
        case 'IBAN_PAYMENT':
            return transaction.isRecipient ? 'Поповнення за IBAN' : 'Оплата за IBAN';
        case 'TRANSFER':
            return transaction.isRecipient ? 'Поповнення з картки' : 'Переказ на картку';
        case 'INTERNET_PAYMENT':
            return 'Оплата інтернету';
        default:
            return transaction.isRecipient ? 'Надходження' : 'Витрати';
    }
};

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
    const senderCard = transaction.senderCardNumber || '';
    const receiverCard = transaction.receiverCardNumber || '';

    const isIncoming = transaction.isRecipient;
    const arrow = isIncoming ? '↓' : '↑';
    const statusLabel = transaction.status === 'COMPLETED' ? 'ЗАВЕРШЕНО' : transaction.status;
    const statusClass = transaction.status === 'COMPLETED' ? 'status complete' : 'status cancelled';
    const typeAttr = isIncoming ? 'incoming' : 'outgoing';
    const amountPrefix = isIncoming ? '+' : '-';
    const mainAmount = `${amountPrefix}${formatAmount(transaction.amount)} ${transaction.currencyCode}`;
    const amountColor = isIncoming ? 'var(--green-600)' : 'var(--red-600)';
    const title = getTransactionTitle(transaction);
    const subtitle = transaction.transactionType === 'IBAN_PAYMENT' ? transaction.description : '';
    const senderName = `${transaction.sender?.firstName ?? ''} ${transaction.sender?.lastName ?? ''}`.trim() || 'Карта';
    const receiverName = `${transaction.receiver?.firstName ?? ''} ${transaction.receiver?.lastName ?? ''}`.trim() || 'Карта';

    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={`transaction-card ${expanded ? 'expanded' : ''}`}
            data-type={typeAttr}
            onClick={() => setExpanded(v => !v)}
        >
            <div className="transaction-header">
                <div className="arrow">{arrow}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', width: '100%' }}>
                    <div>
                        <div style={{ fontWeight: 700 }}>{title}</div>
                        {subtitle && (
                            <div style={{ marginTop: '.2rem', fontSize: '.92rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                {subtitle}
                            </div>
                        )}
                    </div>
                    <div style={{ fontWeight: 700, color: amountColor, whiteSpace: 'nowrap' }}>
                        {mainAmount}
                    </div>
                </div>
            </div>

            <div className="transaction-body">
                <div>
                    <strong>Відправник:</strong>
                    <div>
                        <span>{senderName}</span>
                        {senderCard && ` **** ${senderCard.slice(-4)}`}
                    </div>
                </div>
                <div>
                    <strong>Отримувач:</strong>
                    <div>
                        <span>{receiverName}</span>
                        {receiverCard && ` **** ${receiverCard.slice(-4)}`}
                    </div>
                </div>
                {transaction.description && transaction.transactionType !== 'IBAN_PAYMENT' && (
                    <div style={{ flexBasis: '100%' }}>
                        <strong>Опис:</strong>
                        <div>{transaction.description}</div>
                    </div>
                )}
            </div>

            <div className="transaction-footer">
                <span className={statusClass}>{statusLabel}</span>
                <span>{formatUkDateTime(transaction.transactionDate)}</span>
            </div>
        </div>
    );
};

export default TransactionCard;
