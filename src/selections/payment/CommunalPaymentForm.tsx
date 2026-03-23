import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createCommunalPayment } from '../../api';
import { useAccounts } from '../../hooks/useAccounts';
import './PaymentForms.css';

interface CommunalPaymentFormProps {
    onBack: () => void;
    onPaymentComplete?: () => Promise<void>;
    onCopy?: (msg: string) => void;
}

const utilityProviders = [
    { name: 'YASNO (ДТЕК)', service: 'Електроенергія', icon: '💡' },
    { name: 'Київводоканал', service: 'Водопостачання', icon: '💧' },
    { name: 'Нафтогаз України', service: 'Газопостачання', icon: '🔥' },
    { name: 'Київтеплоенерго', service: 'Опалення', icon: '♨️' },
];

const CommunalPaymentForm: React.FC<CommunalPaymentFormProps> = ({ onBack, onPaymentComplete, onCopy }) => {
    const queryClient = useQueryClient();
    const { accounts } = useAccounts();

    const communalUahAccounts = useMemo(
        () =>
            accounts.filter(
                (account) =>
                    (account.accountType === 'FOP' || account.accountType === 'CURRENT') &&
                    (account.currencyCode === 'UAH' || account.currency === 'UAH')
            ),
        [accounts]
    );

    const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
    const [selectedProvider, setSelectedProvider] = useState('');
    const [personalAccount, setPersonalAccount] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (communalUahAccounts.length > 0 && !communalUahAccounts.some((account) => account.id === selectedAccountId)) {
            setSelectedAccountId(communalUahAccounts[0].id);
        }
    }, [communalUahAccounts, selectedAccountId]);

    const parsedAmount = Number(amount);
    const isSubmitDisabled =
        isLoading ||
        !selectedAccountId ||
        !selectedProvider ||
        personalAccount.trim().length === 0 ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (isSubmitDisabled) {
            setError('Заповніть особовий рахунок і коректну суму оплати');
            return;
        }

        try {
            setIsLoading(true);
            await createCommunalPayment({
                accountId: selectedAccountId,
                amount: parsedAmount,
                utilityProvider: selectedProvider,
                personalAccount: personalAccount.trim(),
            });
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await onPaymentComplete?.();
            onCopy?.('Комунальний платіж виконано успішно');
            alert('Оплату комунальних послуг успішно виконано!');
            onBack();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при оплаті комунальних послуг');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="payment-form-wrapper">
            <div className="payment-form-container communal-root">
                <div className="payment-header">
                    <button type="button" className="back-button" onClick={onBack} disabled={isLoading}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                    <h2>Комунальні платежі</h2>
                </div>

                <form className="payment-form" onSubmit={handleSubmit}>
                    <section className="communal-card">
                        <h3>Оберіть рахунок для оплати (ФОП або картка UAH)</h3>
                        <div className="communal-scroll-row">
                            {communalUahAccounts.length > 0 ? (
                                communalUahAccounts.map((account) => (
                                    <button
                                        key={account.id}
                                        type="button"
                                        className={`communal-option-card ${selectedAccountId === account.id ? 'is-active' : ''}`}
                                        onClick={() => setSelectedAccountId(account.id)}
                                        disabled={isLoading}
                                    >
                                        <strong>{account.card?.cardNumber ? `**** ${account.card.cardNumber.slice(-4)}` : 'Номер картки недоступний'}</strong>
                                        <span>{account.balance.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} UAH</span>
                                        <small>{account.accountNumber}</small>
                                    </button>
                                ))
                            ) : (
                                <p className="communal-empty-state">Немає доступних рахунків або карток у UAH</p>
                            )}
                        </div>
                    </section>

                    <section className="communal-card">
                        <h3>Оберіть постачальника</h3>
                        <div className="communal-scroll-row">
                            {utilityProviders.map((provider) => (
                                <button
                                    key={provider.name}
                                    type="button"
                                    className={`communal-option-card communal-provider-card ${selectedProvider === provider.name ? 'is-active' : ''}`}
                                    onClick={() => setSelectedProvider(provider.name)}
                                    disabled={isLoading}
                                >
                                    <span className="communal-provider-icon" aria-hidden="true">{provider.icon}</span>
                                    <strong>{provider.name}</strong>
                                    <small>{provider.service}</small>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="communal-card">
                        <label className="input-label" htmlFor="communal-personal-account">Особовий рахунок</label>
                        <input
                            id="communal-personal-account"
                            type="text"
                            className="form-input communal-white-input"
                            value={personalAccount}
                            onChange={(event) => setPersonalAccount(event.target.value)}
                            placeholder="Введіть номер особового рахунку"
                            disabled={isLoading}
                        />

                        <label className="input-label mt-4" htmlFor="communal-amount">Сума до сплати</label>
                        <input
                            id="communal-amount"
                            type="number"
                            className="form-input communal-white-input"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                            disabled={isLoading || communalUahAccounts.length === 0}
                        />
                    </section>

                    {error && <div className="error-message">{error}</div>}

                    <button
                        type="submit"
                        className="submit-payment-btn communal-submit-btn"
                        disabled={isSubmitDisabled || communalUahAccounts.length === 0}
                    >
                        {isLoading ? 'Обробка...' : 'Оплатити'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CommunalPaymentForm;
