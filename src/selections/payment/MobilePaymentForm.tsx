import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createMobilePayment } from '../../api';
import { useAccounts } from '../../hooks/useAccounts';
import './PaymentForms.css';

const PHONE_REGEX = /^\+380\d{9}$/;
const SUCCESS_MESSAGE_DISPLAY_DURATION = 700;

const MobilePaymentForm: React.FC = () => {
    const queryClient = useQueryClient();
    const { accounts } = useAccounts();

    const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
    const [phoneNumber, setPhoneNumber] = useState('+380');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const uahAccounts = useMemo(() => accounts.filter((acc) => acc.currency === 'UAH'), [accounts]);

    useEffect(() => {
        if (uahAccounts.length > 0 && !uahAccounts.some((acc) => acc.id === selectedAccountId)) {
            setSelectedAccountId(uahAccounts[0].id);
        }
    }, [selectedAccountId, uahAccounts]);

    const handlePhoneChange = (value: string) => {
        const cleaned = value.replace(/[^\d+]/g, '');
        if (!cleaned.startsWith('+380')) {
            setPhoneNumber('+380');
            return;
        }
        setPhoneNumber(cleaned.slice(0, 13));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (!PHONE_REGEX.test(phoneNumber)) {
            setError('Номер телефону має бути у форматі +380XXXXXXXXX');
            return;
        }

        const parsedAmount = Number(amount);
        if (!selectedAccountId || parsedAmount <= 0) {
            setError('Перевірте рахунок та суму платежу');
            return;
        }

        setIsLoading(true);
        try {
            await createMobilePayment({
                accountId: selectedAccountId,
                amount: parsedAmount,
                phoneNumber,
            });
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setSuccessMessage('Поповнення мобільного успішне!');
            setTimeout(() => window.history.back(), SUCCESS_MESSAGE_DISPLAY_DURATION);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Помилка при поповненні мобільного';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="payment-form-wrapper">
            <div className="payment-form-container">
                <div className="payment-header">
                    <button type="button" className="back-button" onClick={() => window.history.back()}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                    <h2>Поповнення мобільного</h2>
                </div>

                <form className="payment-form" onSubmit={handleSubmit}>
                    <div className="form-group-card">
                        <label className="input-label">Звідки</label>
                        <select
                            className="form-select"
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                            disabled={uahAccounts.length === 0 || isLoading}
                        >
                            {uahAccounts.length > 0 ? (
                                uahAccounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        **** {acc.card.cardNumber.slice(-4)} • {acc.balance.toFixed(2)} {acc.currency}
                                    </option>
                                ))
                            ) : (
                                <option value={0}>Немає доступних UAH карток</option>
                            )}
                        </select>
                    </div>

                    <div className="form-group-card">
                        <label className="input-label">Номер телефону</label>
                        <input
                            type="tel"
                            className="form-input"
                            value={phoneNumber}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            placeholder="+380XXXXXXXXX"
                            required
                            disabled={isLoading}
                        />

                        <label className="input-label mt-4">Сума</label>
                        <input
                            type="number"
                            className="form-input"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}
                    {successMessage && <div className="sender-tax-info">{successMessage}</div>}

                    <button type="submit" className="submit-payment-btn" disabled={isLoading || uahAccounts.length === 0}>
                        {isLoading ? 'Обробка...' : 'Поповнити'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MobilePaymentForm;
