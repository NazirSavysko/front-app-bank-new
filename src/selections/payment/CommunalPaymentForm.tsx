import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createCommunalPayment, sendEmailVerificationCode, verifyEmailVerificationCode } from '../../api';
import { useAccounts } from '../../hooks/useAccounts';
import type { CustomerData } from '../../types';
import PaymentVerificationModal from './PaymentVerificationModal';
import './PaymentForms.css';

interface CommunalPaymentFormProps {
    customer: CustomerData | null;
    onBack: () => void;
    onPaymentFlowStateChange?: (state: 'idle' | 'sending-code' | 'awaiting-code' | 'verifying-code') => void;
    onPaymentComplete?: () => Promise<void>;
    onCopy?: (msg: string) => void;
}

const utilityProviders = [
    { name: 'YASNO (ДТЕК)', service: 'Електроенергія', icon: '💡' },
    { name: 'Київводоканал', service: 'Водопостачання', icon: '💧' },
    { name: 'Нафтогаз України', service: 'Газопостачання', icon: '🔥' },
    { name: 'Київтеплоенерго', service: 'Опалення', icon: '♨️' },
];

const CommunalPaymentForm: React.FC<CommunalPaymentFormProps> = ({
    customer,
    onBack,
    onPaymentFlowStateChange,
    onPaymentComplete,
    onCopy,
}) => {
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
    const [emailSending, setEmailSending] = useState(false);
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [codeVerifying, setCodeVerifying] = useState(false);

    useEffect(() => {
        if (communalUahAccounts.length > 0 && !communalUahAccounts.some((account) => account.id === selectedAccountId)) {
            setSelectedAccountId(communalUahAccounts[0].id);
        }
    }, [communalUahAccounts, selectedAccountId]);

    const paymentFlowState = codeVerifying
        ? 'verifying-code'
        : emailSending
            ? 'sending-code'
            : showEmailVerification
                ? 'awaiting-code'
                : 'idle';

    useEffect(() => {
        onPaymentFlowStateChange?.(paymentFlowState);
    }, [onPaymentFlowStateChange, paymentFlowState]);

    useEffect(() => {
        return () => {
            onPaymentFlowStateChange?.('idle');
        };
    }, [onPaymentFlowStateChange]);

    const parsedAmount = Number(amount);
    const isSubmitDisabled =
        isLoading ||
        emailSending ||
        !selectedAccountId ||
        !selectedProvider ||
        personalAccount.trim().length === 0 ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0;

    const handleHorizontalWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        const row = event.currentTarget;
        const hasHorizontalOverflow = row.scrollWidth > row.clientWidth;
        if (!hasHorizontalOverflow) {
            return;
        }

        const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        const scrollDelta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? dominantDelta * 16 : dominantDelta;

        event.preventDefault();
        event.stopPropagation();
        row.scrollBy({ left: scrollDelta });
    };

    const validatePayload = () => {
        if (!selectedAccountId || !selectedProvider || personalAccount.trim().length === 0) {
            throw new Error('Заповніть особовий рахунок і оберіть постачальника');
        }

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            throw new Error('Вкажіть коректну суму оплати');
        }

        return {
            accountId: selectedAccountId,
            amount: parsedAmount,
            utilityProvider: selectedProvider,
            personalAccount: personalAccount.trim(),
        };
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (!customer) {
            setError('Не знайдено дані користувача для підтвердження платежу');
            return;
        }

        try {
            validatePayload();
            setEmailSending(true);
            await sendEmailVerificationCode(customer.email);
            setVerificationCode('');
            setShowEmailVerification(true);
            onCopy?.('Код підтвердження відправлено на пошту');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при оплаті комунальних послуг');
        } finally {
            setEmailSending(false);
        }
    };

    const handleConfirmPayment = async () => {
        if (!customer) {
            setError('Не знайдено дані користувача для підтвердження платежу');
            return;
        }

        try {
            const payload = validatePayload();
            setError('');
            setCodeVerifying(true);
            setIsLoading(true);

            await verifyEmailVerificationCode(customer.email, verificationCode);
            await createCommunalPayment(payload);
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await onPaymentComplete?.();

            setShowEmailVerification(false);
            setVerificationCode('');
            onCopy?.('Комунальний платіж виконано успішно');
            onBack();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при оплаті комунальних послуг');
        } finally {
            setCodeVerifying(false);
            setIsLoading(false);
        }
    };

    const isBlockingAction = isLoading || emailSending || codeVerifying || showEmailVerification;

    return (
        <div className="payment-form-wrapper">
            <div className="payment-form-container communal-root">
                <div className="payment-header">
                    <button type="button" className="back-button" onClick={onBack} disabled={isBlockingAction}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                    <h2>Комунальні платежі</h2>
                </div>

                <form className="payment-form" onSubmit={handleSubmit}>
                    <section className="communal-card">
                        <h3>Оберіть рахунок для оплати (ФОП або картка UAH)</h3>
                        <div className="communal-scroll-row" onWheel={handleHorizontalWheel}>
                            {communalUahAccounts.length > 0 ? (
                                communalUahAccounts.map((account) => (
                                    <button
                                        key={account.id}
                                        type="button"
                                        className={`communal-option-card ${selectedAccountId === account.id ? 'is-active' : ''}`}
                                        onClick={() => setSelectedAccountId(account.id)}
                                        disabled={isBlockingAction}
                                    >
                                        <strong>{account.card?.cardNumber ? `**** ${account.card.cardNumber.slice(-4)}` : 'Номер картки недоступний'}</strong>
                                        <span>{account.balance.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} UAH</span>
                                        <small>**** {account.accountNumber.slice(-4)}</small>
                                    </button>
                                ))
                            ) : (
                                <p className="communal-empty-state">Немає доступних рахунків або карток у UAH</p>
                            )}
                        </div>
                    </section>

                    <section className="communal-card">
                        <h3>Оберіть постачальника</h3>
                        <div className="communal-scroll-row" onWheel={handleHorizontalWheel}>
                            {utilityProviders.map((provider) => (
                                <button
                                    key={provider.name}
                                    type="button"
                                    className={`communal-option-card communal-provider-card ${selectedProvider === provider.name ? 'is-active' : ''}`}
                                    onClick={() => setSelectedProvider(provider.name)}
                                    disabled={isBlockingAction}
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
                            disabled={isBlockingAction}
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
                            disabled={isBlockingAction || communalUahAccounts.length === 0}
                        />
                    </section>

                    {error && !showEmailVerification && <div className="error-message">{error}</div>}

                    <button
                        type="submit"
                        className="submit-payment-btn communal-submit-btn"
                        disabled={isSubmitDisabled || communalUahAccounts.length === 0}
                    >
                        {emailSending ? 'Відправка коду...' : isLoading ? 'Обробка...' : 'Оплатити'}
                    </button>
                </form>
            </div>

            <PaymentVerificationModal
                isOpen={showEmailVerification}
                code={verificationCode}
                onCodeChange={setVerificationCode}
                onSubmit={handleConfirmPayment}
                onClose={() => {
                    if (codeVerifying) {
                        return;
                    }
                    setShowEmailVerification(false);
                    setVerificationCode('');
                    setError('');
                }}
                isSubmitting={codeVerifying}
                error={error || null}
            />
        </div>
    );
};

export default CommunalPaymentForm;
