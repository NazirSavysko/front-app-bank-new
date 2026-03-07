// src/components/TransactionCard.tsx
import React, { useState } from 'react';
import type { Transaction } from '../types';
import { formatUkDateTime } from '../utils/datetime';

export interface TransactionCardProps {
    transaction: Transaction;
}

const formatAmount = (value: number) =>
    new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

/**
 * Try to extract the internet-provider name from a transaction.
 * Priority: explicit `providerName` field → parse from description.
 * Backend typically formats the description as one of:
 *   "Internet Payment: Lanet | Contract: 12345"
 *   "Оплата інтернету: Lanet"
 */
const extractProviderName = (transaction: Transaction): string => {
    if (transaction.providerName) return transaction.providerName;

    const desc = transaction.description ?? '';
    const match = desc.match(/(?:Internet Payment|Оплата інтернету)[:\s]+([^|]+)/i);
    return match ? match[1].trim() : desc;
};

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
    const subtype = transaction.transactionSubtype;
    const isInternetPayment = subtype === 'INTERNET_PAYMENT';
    const isIbanPayment    = subtype === 'IBAN_PAYMENT';
    const isIbanReceipt    = subtype === 'IBAN_RECEIPT';
    const isIban           = isIbanPayment || isIbanReceipt;

    // Direction: IBAN_RECEIPT and isRecipient=true are both "incoming"
    const isIncoming = isIbanReceipt || (!isIbanPayment && !isInternetPayment && transaction.isRecipient);

    const arrow = isIncoming ? '↓' : '↑';
    const typeAttr = isIncoming ? 'incoming' : 'outgoing';
    const mainAmount = `${formatAmount(transaction.amount)} ${transaction.currencyCode}`;

    // Direction label (Надходження / Витрати)
    const directionLabel = isIncoming ? 'Надходження' : 'Витрати';

    // Type label shown as subtitle in the header
    let typeLabel: string;
    if (isInternetPayment) {
        typeLabel = 'Internet Payment';
    } else if (isIbanReceipt) {
        typeLabel = 'IBAN Receipt';
    } else if (isIbanPayment) {
        typeLabel = 'IBAN Transfer';
    } else {
        typeLabel = 'Card Transfer';
    }

    // Icon
    let typeIcon: string;
    if (isInternetPayment) {
        typeIcon = '🌐';
    } else if (isIban) {
        typeIcon = '🏦';
    } else {
        typeIcon = '💳';
    }

    const statusLabel = transaction.status === 'COMPLETED' ? 'ЗАВЕРШЕНО' : transaction.status;
    const statusClass = transaction.status === 'COMPLETED' ? 'status complete' : 'status cancelled';

    const senderCard   = transaction.senderCardNumber || '';
    const receiverCard = transaction.receiverCardNumber || '';

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
                        {directionLabel} — {mainAmount}
                    </div>
                    <div style={{ fontSize: '0.85em', color: '#718096' }}>
                        {typeIcon} {typeLabel}
                        {isInternetPayment && (
                            <span> · {extractProviderName(transaction)}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="transaction-body">
                {/* Sender */}
                {!isInternetPayment && (
                    <div>
                        <strong>Відправник:</strong>
                        <div>
                            {isIban && transaction.senderIban ? (
                                <span>{transaction.senderIban}</span>
                            ) : (
                                <>
                                    {transaction.sender ? (
                                        <span>{transaction.sender.firstName} {transaction.sender.lastName}</span>
                                    ) : (
                                        <span>Карта</span>
                                    )}
                                    {senderCard && <span> **** {senderCard.slice(-4)}</span>}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Receiver */}
                {!isInternetPayment && (
                    <div>
                        <strong>Отримувач:</strong>
                        <div>
                            {isIban && transaction.receiverIban ? (
                                <span>
                                    {transaction.recipientName && <span>{transaction.recipientName} · </span>}
                                    {transaction.receiverIban}
                                </span>
                            ) : (
                                <>
                                    {transaction.receiver ? (
                                        <span>{transaction.receiver.firstName} {transaction.receiver.lastName}</span>
                                    ) : (
                                        <span>Карта</span>
                                    )}
                                    {receiverCard && <span> **** {receiverCard.slice(-4)}</span>}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Internet-payment: show provider name */}
                {isInternetPayment && (
                    <div>
                        <strong>Провайдер:</strong>
                        <div>{extractProviderName(transaction)}</div>
                    </div>
                )}

                {/* Description */}
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
