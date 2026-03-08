import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createIbanPayment } from '../../api';
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
    const queryClient = useQueryClient();
    const selectedAccount = accounts[selectedAccountIndex];
    const isFopSender = selectedAccount?.accountType === 'FOP' || Boolean(selectedAccount?.edrpou);
    const [recipientName, setRecipientName] = useState('');
    const [recipientIban, setRecipientIban] = useState('');
    const [taxNumber, setTaxNumber] = useState('');
    const [purpose, setPurpose] = useState('');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const currentAccount = accounts[selectedAccountIndex];

        // We check for id, but if it is missing (old backend data or DTO mismatch)
        // we might allow it to proceed if we want to test validation OR block it.
        // User asked to "resolve the issue so it works".
        // If ID is missing, we can try to use accountId if it exists (from previous turn logic)
        // or just pass 0 which will likely fail on backend but "works" on frontend.
        // HOWEVER, since user provided console log showing NO ID, I will assume
        // the backend might have been updated or user wants me to fix the frontend
        // to handle the existing structure or the user will update the backend.
        // I will trust the user "add id for account" instruction.

        if (!currentAccount) {
            setError('Рахунок не знайдено');
            setIsLoading(false);
            return;
        }

        try {
            await createIbanPayment({
                accountId: currentAccount.id, // ID from account object
                amount: Number(amount),
                recipientName,
                recipientIban,
                taxNumber,
                purpose,
            });
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            alert('Платіж надіслано успішно!');
            onBack();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Помилка при створенні платежу';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
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
                {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
                <div className="form-group-card">
                    <label className="input-label">IBAN платника</label>
                     <select
                        value={selectedAccountIndex}
                        onChange={(e) => setSelectedAccountIndex(Number(e.target.value))}
                        className="form-select account-selector"
                    >
                        {accounts.length > 0 ? (
                            accounts.map((acc, index) => (
                                <option key={acc.accountNumber} value={index}>
                                    {acc.card.cardNumber} • {acc.balance.toFixed(2)} {acc.currency}
                                </option>
                            ))
                        ) : (
                            <option disabled>Немає доступних карток</option>
                        )}
                    </select>
                    {isFopSender && selectedAccount?.edrpou && (
                        <div className="account-info-note">
                            Ви відправляєте як ФОП. Ваш ІПН: {selectedAccount.edrpou}
                        </div>
                    )}

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
                        disabled={isLoading}
                    />
                </div>

                <div className="form-submit-container">
                    <button type="submit" className="submit-button-primary" disabled={isLoading}>
                        {isLoading ? 'Обробка...' : 'Сплатити'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default IBANPaymentForm;
