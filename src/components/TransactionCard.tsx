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
    TAX_PAYMENT: {
        incoming: 'Повернення податків',
        outgoing: 'Оплата податків',
    },
    INTERNET_PAYMENT: {
        incoming: 'Оплата інтернету',
        outgoing: 'Оплата інтернету',
    },
} as const;

const TRANSACTION_ICON_VARIANTS: Record<string, string> = {
    TRANSFER: 'transfer',
    IBAN_PAYMENT: 'iban-payment',
    TAX_PAYMENT: 'tax-payment',
    INTERNET_PAYMENT: 'internet-payment',
    MOBILE_PAYMENT: 'mobile-payment',
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

const TransactionTypeIcon: React.FC<{
    transactionType: string;
    isMobileTopUp: boolean;
    isTaxPayment: boolean;
    isElectronicsPurchase: boolean;
    isTrainTicket: boolean;
    isAirTicket: boolean;
    isBusTicket: boolean;
    isCityTransportTicket: boolean;
}> = ({ transactionType, isMobileTopUp, isTaxPayment, isElectronicsPurchase, isTrainTicket, isAirTicket, isBusTicket, isCityTransportTicket }) => {
    if (isMobileTopUp) {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
        );
    }

    if (isElectronicsPurchase) {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
        );
    }

    if (isTaxPayment) {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="3" x2="21" y1="21" y2="21" />
                <line x1="6" x2="6" y1="10" y2="18" />
                <line x1="10" x2="10" y1="10" y2="18" />
                <line x1="14" x2="14" y1="10" y2="18" />
                <line x1="18" x2="18" y1="10" y2="18" />
                <polygon points="12 2 20 7 4 7" />
            </svg>
        );
    }

    if (isTrainTicket) {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="3.5" width="14" height="12" rx="3"></rect>
                <path d="M9 8h.01"></path>
                <path d="M15 8h.01"></path>
                <path d="M8 15.5 6 20"></path>
                <path d="M16 15.5 18 20"></path>
                <path d="M8 11.5h8"></path>
            </svg>
        );
    }

    if (isAirTicket) {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m2 14 20-4-8 8-2 5-2-5-8-4Z"></path>
            </svg>
        );
    }

    if (isBusTicket) {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="4" width="16" height="12" rx="3"></rect>
                <path d="M7 16v3"></path>
                <path d="M17 16v3"></path>
                <path d="M8 9h8"></path>
            </svg>
        );
    }

    if (isCityTransportTicket) {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="4" width="14" height="10" rx="2.5"></rect>
                <path d="M8 17h8"></path>
                <path d="M9 14v3"></path>
                <path d="M15 14v3"></path>
            </svg>
        );
    }

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
        case 'TAX_PAYMENT':
            return (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="3" x2="21" y1="21" y2="21" />
                    <line x1="6" x2="6" y1="10" y2="18" />
                    <line x1="10" x2="10" y1="10" y2="18" />
                    <line x1="14" x2="14" y1="10" y2="18" />
                    <line x1="18" x2="18" y1="10" y2="18" />
                    <polygon points="12 2 20 7 4 7" />
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
    const descriptionLower = (transaction.description || '').toLowerCase();
    const isMobileTopUp =
        descriptionLower.includes('поповнення мобільного') ||
        descriptionLower.includes('поповнення рахунку мобільного') ||
        transaction.transactionType === 'MOBILE_PAYMENT';
    const isTaxPayment =
        descriptionLower.includes('оплата податків') ||
        transaction.transactionType === 'TAX_PAYMENT';
    const isElectronicsPurchase =
        descriptionLower.includes('купівля електроніки') ||
        transaction.transactionType === 'ELECTRONICS_PAYMENT';
    const isTrainTicket =
        descriptionLower.includes('квиток на потяг') ||
        descriptionLower.includes('потяг');
    const isAirTicket =
        descriptionLower.includes('авіаквиток') ||
        descriptionLower.includes('авіалінії') ||
        descriptionLower.includes('літак');
    const isBusTicket =
        descriptionLower.includes('квиток на автобус') ||
        descriptionLower.includes('автобус');
    const isCityTransportTicket =
        descriptionLower.includes('квиток на міський транспорт') ||
        descriptionLower.includes('проїзний на міський транспорт') ||
        descriptionLower.includes('міський транспорт');

    const shortTitle = (() => {
        if (isTaxPayment) {
            return isIncoming ? TRANSACTION_TITLES.TAX_PAYMENT.incoming : TRANSACTION_TITLES.TAX_PAYMENT.outgoing;
        }

        if (isElectronicsPurchase) {
            return 'Купівля електроніки';
        }
        if (isTrainTicket) {
            return 'Потяг';
        }
        if (isAirTicket) {
            return 'Авіалінії';
        }
        if (isBusTicket) {
            return 'Автобус';
        }
        if (isCityTransportTicket) {
            return 'Міський';
        }

        switch (transaction.transactionType) {
            case 'TRANSFER':
                return isIncoming ? TRANSACTION_TITLES.TRANSFER.incoming : TRANSACTION_TITLES.TRANSFER.outgoing;
            case 'IBAN_PAYMENT':
                return isIncoming ? TRANSACTION_TITLES.IBAN_PAYMENT.incoming : TRANSACTION_TITLES.IBAN_PAYMENT.outgoing;
            case 'TAX_PAYMENT':
                return isIncoming ? TRANSACTION_TITLES.TAX_PAYMENT.incoming : TRANSACTION_TITLES.TAX_PAYMENT.outgoing;
            case 'INTERNET_PAYMENT':
                return TRANSACTION_TITLES.INTERNET_PAYMENT.outgoing;
            case 'MOBILE_PAYMENT':
                return 'Поповнення мобільного';
            default:
                return isMobileTopUp ? 'Поповнення мобільного' : 'Транзакція';
        }
    })();
    const amountColor = isIncoming ? 'var(--green-600)' : 'var(--red-600)';
    const iconVariant = (() => {
        if (isTrainTicket) return 'transport-train';
        if (isAirTicket) return 'transport-air';
        if (isBusTicket) return 'transport-bus';
        if (isCityTransportTicket) return 'transport-city';
        if (isMobileTopUp) return 'mobile-payment';
        if (isElectronicsPurchase) return 'electronics';
        if (isTaxPayment) return 'tax-payment';
        return TRANSACTION_ICON_VARIANTS[transaction.transactionType] || 'transfer';
    })();

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
                    <TransactionTypeIcon
                        transactionType={transaction.transactionType}
                        isMobileTopUp={isMobileTopUp}
                        isTaxPayment={isTaxPayment}
                        isElectronicsPurchase={isElectronicsPurchase}
                        isTrainTicket={isTrainTicket}
                        isAirTicket={isAirTicket}
                        isBusTicket={isBusTicket}
                        isCityTransportTicket={isCityTransportTicket}
                    />
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
                ) : (transaction.transactionType === 'INTERNET_PAYMENT' || isMobileTopUp || isTaxPayment || isElectronicsPurchase) ? (
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
