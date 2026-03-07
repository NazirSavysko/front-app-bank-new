// src/components/TransactionCard.tsx
import React, { useState } from 'react';
import type { Transaction } from '../types';
import { formatUkDateTime } from '../utils/datetime';

export interface TransactionCardProps {
    transaction: Transaction;
}

const formatAmount = (value: number) =>
    new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const translateTransactionType = (type: string): string => {
    const normalized = (type || '').toUpperCase().replace(/\s+/g, '_');
    switch (normalized) {
        case 'IBAN_RECEIPT':
        case 'IBAN_TRANSFER':
            return 'Зарахування по IBAN';
        case 'CARD_TRANSFER':
        case 'TRANSFER':
            return 'Переказ по картці';
        case 'SERVICE_PAYMENT':
        case 'INTERNET_PAYMENT':
            return 'Оплата послуг';
        default:
            return 'Інша операція';
    }
};

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
    const senderCard = transaction.senderCardNumber || '';
    const receiverCard = transaction.receiverCardNumber || '';

    const isIncoming = transaction.isRecipient;
    const statusLabel = transaction.status === 'COMPLETED' ? 'ВИКОНАНО' : transaction.status;
    const statusClass = transaction.status === 'COMPLETED' ? 'status complete' : 'status cancelled';
    const typeAttr = isIncoming ? 'incoming' : 'outgoing';
    const mainAmount = `${formatAmount(transaction.amount)} ${transaction.currencyCode}`;
    const typeLabel = translateTransactionType(transaction.transactionType);

    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={`transaction-card ${expanded ? 'expanded' : ''}`}
            data-type={typeAttr}
            onClick={() => setExpanded(v => !v)}
        >
            <div className="transaction-header">
                <div>
                    <div style={{ fontWeight: 700 }}>
                        {isIncoming ? 'Надходження' : 'Витрати'} — {mainAmount}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-subtle)' }}>{typeLabel}</div>
                </div>
            </div>

            <div className="transaction-body">
                <div>
                    <strong>Відправник:</strong>
                    <div>
                        {transaction.sender ? (
                            <span>{transaction.sender.firstName} {transaction.sender.lastName}</span>
                        ) : (
                            <span>Карта</span>
                        )}
                        {' '}**** {senderCard.slice(-4)}
                    </div>
                </div>
                <div>
                    <strong>Отримувач:</strong>
                    <div>
                        {transaction.receiver ? (
                            <span>{transaction.receiver.firstName} {transaction.receiver.lastName}</span>
                        ) : (
                            <span>Карта</span>
                        )}
                        {' '}**** {receiverCard.slice(-4)}
                    </div>
                </div>
                {transaction.description && (
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
