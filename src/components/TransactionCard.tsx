// src/components/TransactionCard.tsx
import React, { useState } from 'react';
import type { Transaction } from '../types';
import { formatUkDateTime } from '../utils/datetime';

export interface TransactionCardProps {
    transaction: Transaction;
}

const formatAmount = (value: number) =>
    new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const CARD_FALLBACK = 'Карта';

const formatParticipantName = (person?: Transaction['sender'] | null) =>
    `${person?.firstName ?? ''} ${person?.lastName ?? ''}`.trim();

const getParticipantName = (person?: Transaction['sender'] | null) =>
    formatParticipantName(person) || CARD_FALLBACK;

const TransferIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
        <path d="M4 9.5h16" />
        <path d="m9 15 2 2-2 2" />
        <path d="M15 17H9" />
    </svg>
);

const IbanPaymentIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h16" />
        <path d="M6 20V9.5L12 5l6 4.5V20" />
        <path d="M9 12h.01" />
        <path d="M12 12h.01" />
        <path d="M15 12h.01" />
        <path d="M10 20v-4h4v4" />
    </svg>
);

const InternetPaymentIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16" />
        <path d="M12 4a12.3 12.3 0 0 1 0 16" />
        <path d="M12 4a12.3 12.3 0 0 0 0 16" />
    </svg>
);

const DefaultTransactionIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="M8 9l4-4 4 4" />
        <path d="m8 15 4 4 4-4" />
    </svg>
);

const getTransactionIcon = (transactionType: string) => {
    switch (transactionType) {
        case 'IBAN_PAYMENT':
            return {
                className: 'transaction-icon transaction-icon--iban',
                element: <IbanPaymentIcon />,
            };
        case 'INTERNET_PAYMENT':
            return {
                className: 'transaction-icon transaction-icon--internet',
                element: <InternetPaymentIcon />,
            };
        case 'TRANSFER':
            return {
                className: 'transaction-icon transaction-icon--transfer',
                element: <TransferIcon />,
            };
        default:
            return {
                className: 'transaction-icon transaction-icon--default',
                element: <DefaultTransactionIcon />,
            };
    }
};

const getMaskedCardSuffix = (cardNumber: string) => {
    if (!cardNumber) {
        return '';
    }

    return cardNumber.length >= 4 ? ` **** ${cardNumber.slice(-4)}` : ' ****';
};

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

const renderDescription = (description: string) => (
    <div className="transaction-detail-item transaction-detail-item-full">
        <strong>Опис:</strong>
        <div className="transaction-description">{description}</div>
    </div>
);

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
    const senderCard = transaction.senderCardNumber || '';
    const receiverCard = transaction.receiverCardNumber || '';

    const isIncoming = transaction.isRecipient;
    const statusLabel = transaction.status === 'COMPLETED' ? 'ЗАВЕРШЕНО' : transaction.status;
    const statusClass = transaction.status === 'COMPLETED' ? 'status complete' : 'status cancelled';
    const typeAttr = isIncoming ? 'incoming' : 'outgoing';
    const amountPrefix = isIncoming ? '+' : '-';
    const mainAmount = `${amountPrefix}${formatAmount(transaction.amount)} ${transaction.currencyCode}`;
    const amountClass = isIncoming ? 'transaction-amount incoming' : 'transaction-amount outgoing';
    const title = getTransactionTitle(transaction);
    const icon = getTransactionIcon(transaction.transactionType);
    const formattedDate = formatUkDateTime(transaction.transactionDate);
    const senderName = getParticipantName(transaction.sender);
    const receiverName = getParticipantName(transaction.receiver);
    const ibanParticipantLabel = transaction.isRecipient ? 'Відправник:' : 'Отримувач:';
    const ibanParticipantName = transaction.isRecipient
        ? formatParticipantName(transaction.sender)
        : formatParticipantName(transaction.receiver);

    const [expanded, setExpanded] = useState(false);

    const handleToggle = () => {
        setExpanded(value => !value);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleToggle();
        }
    };

    return (
        <div
            className={`transaction-card ${expanded ? 'expanded' : ''}`}
            data-type={typeAttr}
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
        >
            <div className="transaction-header">
                <div className={icon.className} aria-hidden="true">{icon.element}</div>
                <div className="transaction-header-content">
                    <div className="transaction-header-main">
                        <div className="transaction-title">{title}</div>
                        <div className="transaction-date">{formattedDate}</div>
                    </div>
                    <div className={amountClass}>{mainAmount}</div>
                </div>
            </div>

            {expanded && (
                <>
                    <div className="transaction-body">
                        {transaction.transactionType === 'TRANSFER' && (
                            <>
                                <div className="transaction-detail-item">
                                    <strong>Відправник:</strong>
                                    <div>
                                        <span>{senderName}</span>
                                        {getMaskedCardSuffix(senderCard)}
                                    </div>
                                </div>
                                <div className="transaction-detail-item">
                                    <strong>Отримувач:</strong>
                                    <div>
                                        <span>{receiverName}</span>
                                        {getMaskedCardSuffix(receiverCard)}
                                    </div>
                                </div>
                            </>
                        )}

                        {transaction.transactionType === 'IBAN_PAYMENT' && (
                            <>
                                {ibanParticipantName && (
                                    <div className="transaction-detail-item transaction-detail-item-full">
                                        <strong>{ibanParticipantLabel}</strong>
                                        <div>{ibanParticipantName}</div>
                                    </div>
                                )}
                                {transaction.description && renderDescription(transaction.description)}
                            </>
                        )}

                        {transaction.transactionType === 'INTERNET_PAYMENT' && transaction.description && renderDescription(transaction.description)}

                        {!['TRANSFER', 'IBAN_PAYMENT', 'INTERNET_PAYMENT'].includes(transaction.transactionType) && transaction.description && renderDescription(transaction.description)}
                    </div>

                    <div className="transaction-footer">
                        <span className={statusClass}>{statusLabel}</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default TransactionCard;
