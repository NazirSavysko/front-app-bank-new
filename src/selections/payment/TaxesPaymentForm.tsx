import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createTaxPayment } from '../../api';
import { useAccounts } from '../../hooks/useAccounts';
import './PaymentForms.css';

const TAX_TYPES = ['Єдиний податок (5% від доходу)'];
const RECEIVER_NAME = 'Державна податкова служба України';

const TaxesPaymentForm: React.FC = () => {
    const queryClient = useQueryClient();
    const { accounts } = useAccounts();

    const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
    const [amount, setAmount] = useState('');
    const [period, setPeriod] = useState('I квартал 2026 року');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const uahAccounts = useMemo(() => accounts.filter((acc) => acc.currencyCode === 'UAH'), [accounts]);
    const visibleUahAccounts = useMemo(
        () => (uahAccounts.length > 0 ? uahAccounts : accounts.filter((acc) => acc.currency === 'UAH')),
        [accounts, uahAccounts]
    );

    useEffect(() => {
        if (visibleUahAccounts.length > 0 && !visibleUahAccounts.some((acc) => acc.id === selectedAccountId)) {
            setSelectedAccountId(visibleUahAccounts[0].id);
        }
    }, [selectedAccountId, visibleUahAccounts]);

    const selectedAccount = visibleUahAccounts.find((acc) => acc.id === selectedAccountId);
    const parsedAmount = Number(amount);
    const isSubmitDisabled = isLoading || !selectedAccountId || !Number.isFinite(parsedAmount) || parsedAmount <= 0;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (!selectedAccountId) {
            setError('Оберіть рахунок для оплати');
            return;
        }

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setError('Вкажіть коректну суму оплати');
            return;
        }

        setIsLoading(true);
        try {
            await createTaxPayment({
                accountId: selectedAccountId,
                amount: parsedAmount,
                taxType: TAX_TYPES[0],
                period,
                receiverName: RECEIVER_NAME,
            });
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            window.history.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при оплаті податків');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="payment-form-wrapper">
            <div className="payment-form-container taxes-payment-root">
                <div className="payment-header">
                    <button type="button" className="back-button" onClick={() => window.history.back()}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                    <h2>Оплата податків</h2>
                </div>

                <form className="payment-form taxes-payment-shell" onSubmit={handleSubmit}>
                    <section className="taxes-section">
                        <h3 className="taxes-section-title">Звідки платимо</h3>
                        <div className="taxes-account-card">
                            <div className="taxes-account-icon" aria-hidden="true">
                                <span />
                            </div>
                            <div className="taxes-account-info">
                                <strong>{selectedAccount?.accountType === 'FOP' ? 'ФОП рахунок' : 'Поточний рахунок'}</strong>
                                <span>**** **** **** {selectedAccount?.card.cardNumber?.slice(-4) ?? '----'}</span>
                            </div>
                            <div className="taxes-account-balance">
                                {selectedAccount ? `${selectedAccount.balance.toLocaleString('uk-UA')} UAH` : '0 UAH'}
                            </div>
                        </div>
                        <label className="sr-only" htmlFor="tax-account-select">Рахунок списання</label>
                        <select
                            id="tax-account-select"
                            className="form-select taxes-hidden-select"
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                            disabled={isLoading || visibleUahAccounts.length === 0}
                        >
                            {visibleUahAccounts.length > 0 ? (
                                visibleUahAccounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        **** {acc.card.cardNumber.slice(-4)} • {acc.balance.toFixed(2)} UAH
                                    </option>
                                ))
                            ) : (
                                <option value={0}>Немає доступних UAH рахунків</option>
                            )}
                        </select>
                    </section>

                    <section className="taxes-section">
                        <h3 className="taxes-section-title">Куди платимо</h3>
                        <div className="taxes-grid">
                            <div>
                                <label className="input-label">Тип податку</label>
                                <select className="form-select" value={TAX_TYPES[0]} disabled>
                                    <option value={TAX_TYPES[0]}>{TAX_TYPES[0]}</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Період оплати</label>
                                <select
                                    className="form-select"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
                                    disabled={isLoading}
                                >
                                    <option value="I квартал 2026 року">I квартал 2026 року</option>
                                    <option value="II квартал 2026 року">II квартал 2026 року</option>
                                    <option value="III квартал 2026 року">III квартал 2026 року</option>
                                    <option value="IV квартал 2026 року">IV квартал 2026 року</option>
                                </select>
                            </div>
                        </div>

                        <label className="input-label">Сума до оплати</label>
                        <div className="taxes-amount-field">
                            <input
                                type="number"
                                className="form-input"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                min="0.01"
                                step="0.01"
                                required
                                disabled={isLoading || visibleUahAccounts.length === 0}
                            />
                            <span>₴</span>
                        </div>
                        <p className="taxes-hint">5% від вашого обороту за обраний період</p>
                    </section>

                    {error && <div className="error-message">{error}</div>}

                    <button
                        type="submit"
                        className="submit-payment-btn"
                        disabled={isSubmitDisabled || visibleUahAccounts.length === 0}
                    >
                        {isLoading ? 'Обробка...' : 'Сплатити податок'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TaxesPaymentForm;
