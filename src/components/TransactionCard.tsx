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

const TRANSACTION_LABELS: Record<string, string> = {
    TRANSFER: 'Переказ на картку',
    IBAN_PAYMENT: 'Оплата за IBAN',
    INTERNET_PAYMENT: 'Поповнення інтернету',
};

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
    const senderCard = transaction.senderCardNumber || '';
    const receiverCard = transaction.receiverCardNumber || '';
    const isExternalPayment =
        transaction.transactionType === 'IBAN_PAYMENT' || transaction.transactionType === 'INTERNET_PAYMENT';
    const isIncoming = !isExternalPayment && transaction.isRecipient;
    const arrow = isIncoming ? '↓' : '↑';
    const statusLabel = STATUS_LABELS[transaction.status] || transaction.status;
    const statusClass = transaction.status === 'COMPLETED' ? 'status complete' : 'status cancelled';
    const typeAttr = isIncoming ? 'incoming' : 'outgoing';
    const amountPrefix = isIncoming ? '+' : '-';
    const mainAmount = `${amountPrefix}${formatAmount(transaction.amount)} ${transaction.currencyCode}`;
    const operationLabel = TRANSACTION_LABELS[transaction.transactionType] || 'Транзакція';
    const amountColor = isIncoming ? 'var(--green-600)' : 'var(--red-600)';

    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={`transaction-card ${expanded ? 'expanded' : ''}`}
            data-type={typeAttr}
            onClick={() => setExpanded(v => !v)}
        >
            <div className="transaction-header">
                <div className="arrow">{arrow}</div>
                <div>
                    <div style={{ fontWeight: 700 }}>{operationLabel}</div>
                    <div style={{ fontWeight: 700, color: amountColor }}>
                        {mainAmount}
                    </div>
                </div>
            </div>

            <div className="transaction-body">
                {isExternalPayment ? (
                    <div style={{ flexBasis: '100%' }}>
                        <strong>Опис:</strong>
                        <div>{transaction.description}</div>
                    </div>
                ) : (
                    <>
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

export default TransactionCard;
