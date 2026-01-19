import React, { useEffect, useState } from 'react';
import type { Account } from '../types';

export interface AccountCardProps {
    /** Account to display */
    account: Account;
    /** Callback invoked when a piece of information is copied */
    onCopy?: (message: string) => void;
}

/**
 * AccountCard renders a visual representation of a bank account including
 * its card details, balance and account number. Sensitive information
 * like the card number and CVV are masked by default and revealed on
 * click. Copied items trigger the optional `onCopy` callback.
 */
const AccountCard: React.FC<AccountCardProps> = ({ account, onCopy }) => {
    const { card } = account;
    const [showCvv, setShowCvv] = useState(false);
    const [showNumber, setShowNumber] = useState(false);
    const [showAccountNumber, setShowAccountNumber] = useState(false);

    /** Format the card number into chunks of four digits separated by spaces. */
    const formatCardNumber = (num: string) => num.replace(/(\d{4})(?=\d)/g, '$1 ');

    /** Mask all but the last four digits of the card number for display. */
    const maskCardNumber = (num: string) => `**** **** **** ${num.slice(-4)}`;

    /** Convert the ISO expiration date into a MM/YY format. Note that the
     * backend stores a full ISO timestamp for the expiration date.
     */
    const formatExpDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${month}/${year}`;
    };

    /** Mask the account number by only showing the first and last four digits.
     * Used for privacy when displaying the account number.
     */
    const maskAccountNumber = (num: string) => {
        if (num.length <= 8) return num;
        return `${num.slice(0, 4)}****${num.slice(-4)}`;
    };

    // Auto-hide CVV after a delay when revealed
    useEffect(() => {
        if (!showCvv) return;
        const timer = window.setTimeout(() => setShowCvv(false), 5000);
        return () => window.clearTimeout(timer);
    }, [showCvv]);

    // Auto-hide card number after a delay
    useEffect(() => {
        if (!showNumber) return;
        const timer = window.setTimeout(() => setShowNumber(false), 5000);
        return () => window.clearTimeout(timer);
    }, [showNumber]);

    // Auto-hide account number after a delay
    useEffect(() => {
        if (!showAccountNumber) return;
        const timer = window.setTimeout(() => setShowAccountNumber(false), 5000);
        return () => window.clearTimeout(timer);
    }, [showAccountNumber]);

    /** Toggle card number display and copy to clipboard when clicked. */
    const handleNumberClick = () => {
        setShowNumber(!showNumber);
        navigator.clipboard
            .writeText(card.cardNumber)
            .then(() => onCopy?.('Номер картки скопійовано'))
            .catch(() => console.error('Не вдалося скопіювати номер картки'));
    };

    /** Toggle account number display and copy to clipboard when clicked. */
    const handleAccountClick = () => {
        setShowAccountNumber(!showAccountNumber);
        navigator.clipboard
            .writeText(account.accountNumber)
            .then(() => onCopy?.('Номер рахунку скопійовано'))
            .catch(() => console.error('Не вдалося скопіювати номер рахунку'));
    };

    return (
        <div className="account-card">
            <div className="card-display">
                <div className="bank-name">Bank</div>
                <div className="card-number-display" onClick={handleNumberClick}>
                    {showNumber ? formatCardNumber(card.cardNumber) : maskCardNumber(card.cardNumber)}
                </div>
                <div className="card-footer">
                    <div style={{ marginLeft: 'auto' }}>
                        <span style={{ fontSize: '8px', display: 'block', opacity: 0.8 }}>VALID THRU</span>
                        <span style={{ fontSize: '14px' }}>{formatExpDate(card.expirationDate)}</span>
                    </div>
                </div>
                <div className="card-cvv-display" onClick={() => setShowCvv(!showCvv)}>
                    CVV: {showCvv ? card.cvv : '***'}
                </div>
            </div>
            <div className="card-info">
                <div className="card-balance">
                    Баланс: {account.balance.toLocaleString()} {account.currency}
                </div>
                <div className="card-status">Статус: {account.status}</div>
                <div className="account-number" onClick={handleAccountClick}>
                    Номер рахунку: {showAccountNumber ? account.accountNumber : maskAccountNumber(account.accountNumber)}
                </div>
            </div>
        </div>
    );
};

export default AccountCard;
