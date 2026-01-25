// src/components/TransactionCard.tsx
import React, { useState } from 'react';
import type { Transaction } from '../types';
import { formatUkDateTime } from '../utils/datetime';

export interface TransactionCardProps {
    transaction: Transaction;
    /** Номер картки вибраного рахунку — щоб визначити, чи це надходження чи витрата */
    selectedCardNumber: string;
}

const formatAmount = (value: number) =>
    new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, selectedCardNumber }) => {
    const senderCard = transaction.senderCardNumber || '';
    const receiverCard = transaction.receiverCardNumber || '';

    const isIncoming = receiverCard === selectedCardNumber;
    const arrow = isIncoming ? '↓' : '↑';
    const statusLabel = transaction.status === 'COMPLETED' ? 'ЗАВЕРШЕНО' : transaction.status;
    const statusClass = transaction.status === 'COMPLETED' ? 'status complete' : 'status cancelled';
    const typeAttr = isIncoming ? 'incoming' : 'outgoing';
    const mainAmount = `${formatAmount(transaction.amount)} ${transaction.currencyCode}`;

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
                    <div style={{ fontWeight: 700 }}>
                        {isIncoming ? 'Надходження' : 'Витрати'} — {mainAmount}
                    </div>
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
