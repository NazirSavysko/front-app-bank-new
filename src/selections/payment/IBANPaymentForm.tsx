import React, { useState, useEffect, useMemo } from 'react';
import type { Account } from '../../types';
import './PaymentForms.css';

interface IBANPaymentFormProps {
    accounts: Account[];
    selectedAccountIndex: number;
    setSelectedAccountIndex: (index: number) => void;
    onBack: () => void;
}

const IBANPaymentForm: React.FC<IBANPaymentFormProps> = ({
                                                             accounts,
                                                             selectedAccountIndex,
                                                             setSelectedAccountIndex,
                                                             onBack,
                                                         }) => {
    const [recipientName, setRecipientName] = useState('');
    const [recipientIban, setRecipientIban] = useState('');
    const [taxNumber, setTaxNumber] = useState('');
    const [purpose, setPurpose] = useState('');
    const [amount, setAmount] = useState('');

    // Filter for UAH accounts only
    const uahAccounts = useMemo(() => accounts.filter(acc => acc.currency === 'UAH'), [accounts]);

    useEffect(() => {
        // If current selected account is not UAH (or not in list), switch to first available UAH account
        if (uahAccounts.length > 0) {
            const currentAccount = accounts[selectedAccountIndex];
            if (!currentAccount || currentAccount.currency !== 'UAH') {
                const firstUahIndex = accounts.findIndex(a => a.currency === 'UAH');
                if (firstUahIndex !== -1) {
                    setSelectedAccountIndex(firstUahIndex);
                }
            }
        }
    }, [accounts, selectedAccountIndex, setSelectedAccountIndex, uahAccounts]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Sending IBAN payment:', {
            accountId: accounts[selectedAccountIndex].accountNumber,
            amount,
            recipientName,
            recipientIban,
            taxNumber,
            purpose,
        });
        alert('Платіж надіслано! (Демо)');
    };

    return (
        <div className="payment-form-container">
            <div className="payment-header">
                <button className="back-button" onClick={onBack}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                </button>
                <h2>Платіж за IBAN</h2>
            </div>

            <form onSubmit={handleSubmit} className="payment-form">
                <div className="form-group-card">
                    <label className="input-label">IBAN платника</label>
                     <select
                        value={selectedAccountIndex}
                        onChange={(e) => setSelectedAccountIndex(Number(e.target.value))}
                        className="form-select account-selector"
                    >
                        {uahAccounts.length > 0 ? (
                            uahAccounts.map((acc) => {
                                // We need the original index to update state correctly
                                const originalIndex = accounts.findIndex(a => a.accountNumber === acc.accountNumber);
                                return (
                                    <option key={acc.accountNumber} value={originalIndex}>
                                        {acc.card.cardNumber} • {acc.balance.toFixed(2)} {acc.currency}
                                    </option>
                                );
                            })
                        ) : (
                            <option disabled>Немає доступних UAH карток</option>
                        )}
                    </select>

                    <label className="input-label mt-4">Назва отримувача (ПІБ або Компанія)</label>
                    <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Введіть назву"
                        required
                        className="form-input"
                    />

                    <label className="input-label mt-4">IBAN отримувача (UA...)</label>
                    <input
                        type="text"
                        value={recipientIban}
                        onChange={(e) => setRecipientIban(e.target.value)}
                        placeholder="UA000000000000000000000000000"
                        required
                        className="form-input"
                    />

                    <label className="input-label mt-4">ЄДРПОУ / ІПН</label>
                    <input
                        type="text"
                        value={taxNumber}
                        onChange={(e) => setTaxNumber(e.target.value)}
                        placeholder="12345678"
                        required
                        className="form-input"
                    />

                    <label className="input-label mt-4">Призначення платежу</label>
                    <input
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="Введіть призначення"
                        required
                        className="form-input"
                    />

                    <label className="input-label mt-4">Сума переказу</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        required
                        className="form-input"
                    />
                </div>

                <div className="form-submit-container">
                    <button type="submit" className="submit-button-primary">Сплатити</button>
                </div>
            </form>
        </div>
    );
};

export default IBANPaymentForm;
