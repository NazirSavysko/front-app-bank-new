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
    switch (type) {
        case 'TRANSFER':
            return 'Переказ';
        case 'IBAN_PAYMENT':
            return 'Платіж IBAN';
        case 'INTERNET_PAYMENT':
            return 'Інтернет-платіж';
        default:
            return 'Інша операція';
    }
};

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
    const isIncoming = transaction.direction === 'INCOME';
    const sign = isIncoming ? '+' : '−';
    const statusLabel = transaction.status === 'COMPLETED' ? 'ВИКОНАНО' : transaction.status;
    const statusClass = transaction.status === 'COMPLETED' ? 'status complete' : 'status cancelled';
    const typeAttr = isIncoming ? 'incoming' : 'outgoing';
    const mainAmount = `${sign}${formatAmount(transaction.amount)} ${transaction.currency}`;
    const typeLabel = translateTransactionType(transaction.type);

    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={`transaction-card ${expanded ? 'expanded' : ''}`}
            data-type={typeAttr}
            onClick={() => setExpanded(v => !v)}
        >
            <div className="transaction-header">
                <div className="arrow">{sign}</div>
                <div>
                    <div style={{ fontWeight: 700, color: isIncoming ? 'var(--green-600)' : 'var(--red-600)' }}>
                        {mainAmount}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-subtle)' }}>{typeLabel}</div>
                </div>
            </div>

            <div className="transaction-body">
                {transaction.type === 'TRANSFER' && (
                    <>
                        {transaction.counterpartyName && (
                            <div>
                                <strong>{isIncoming ? 'Відправник:' : 'Отримувач:'}</strong>
                                <div>{transaction.counterpartyName}</div>
                            </div>
                        )}
                        {transaction.counterpartyCard && (
                            <div>
                                <strong>Картка:</strong>
                                <div>**** {transaction.counterpartyCard.length >= 4 ? transaction.counterpartyCard.slice(-4) : transaction.counterpartyCard}</div>
                            </div>
                        )}
                    </>
                )}
                {transaction.type === 'IBAN_PAYMENT' && (
                    <>
                        {transaction.beneficiaryName && (
                            <div>
                                <strong>Отримувач:</strong>
                                <div>{transaction.beneficiaryName}</div>
                            </div>
                        )}
                        {transaction.iban && (
                            <div>
                                <strong>IBAN:</strong>
                                <div>{transaction.iban}</div>
                            </div>
                        )}
                    </>
                )}
                {transaction.type === 'INTERNET_PAYMENT' && (
                    <>
                        {transaction.provider && (
                            <div>
                                <strong>Провайдер:</strong>
                                <div>{transaction.provider}</div>
                            </div>
                        )}
                    </>
                )}
                {transaction.description && (
                    <div style={{ flexBasis: '100%' }}>
                        <strong>Опис:</strong>
                        <div>{transaction.description}</div>
                    </div>
                )}
            </div>

            <div className="transaction-footer">
                <span className={statusClass}>{statusLabel}</span>
                <span>{formatUkDateTime(transaction.date)}</span>
            </div>
        </div>
    );
};

export default TransactionCard;
