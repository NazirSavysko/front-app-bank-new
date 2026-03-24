import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createInternetPayment, sendEmailVerificationCode, verifyEmailVerificationCode } from '../../api';
import type { Account, CustomerData } from '../../types';
import PaymentVerificationModal from './PaymentVerificationModal';
import './PaymentForms.css';

interface InternetPaymentFormProps {
    accounts: Account[];
    customer: CustomerData | null;
    selectedAccountIndex: number;
    setSelectedAccountIndex: (index: number) => void;
    onBack: () => void;
    onPaymentFlowStateChange?: (state: 'idle' | 'sending-code' | 'awaiting-code' | 'verifying-code') => void;
    onPaymentComplete?: () => Promise<void>;
    onCopy?: (msg: string) => void;
}

// Popular ISPs in Ukraine
const PROVIDERS = [
    { id: 1, name: 'Kyivstar Home Internet' },
    { id: 2, name: 'Volia' },
    { id: 3, name: 'Datagroup' },
    { id: 4, name: 'Ukrtelecom' },
    { id: 5, name: 'Tenet' },
    { id: 6, name: 'Triolan' },
    { id: 7, name: 'Lanet' },
    { id: 8, name: 'Vega Telecom' },
    { id: 9, name: 'Underground' },
    { id: 10, name: 'Fregat' },
    { id: 11, name: 'Domonet' },
    { id: 12, name: 'LocalNet' },
    { id: 13, name: 'O3' },
    { id: 14, name: 'McLaut' },
    { id: 15, name: 'KyivLink' },
    { id: 16, name: 'Boryspil.Net' },
    { id: 17, name: 'Gigabit' },
    { id: 18, name: 'X-City' },
    { id: 19, name: 'SimNet' },
    { id: 20, name: 'LinkCom' }
];

const InternetPaymentForm: React.FC<InternetPaymentFormProps> = ({
    accounts,
    customer,
    selectedAccountIndex,
    setSelectedAccountIndex,
    onBack,
    onPaymentFlowStateChange,
    onPaymentComplete,
}) => {
    const queryClient = useQueryClient();
    const [providerName, setProviderName] = useState('');
    const [contractNumber, setContractNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [emailSending, setEmailSending] = useState(false);
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [codeVerifying, setCodeVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filteredProviders = PROVIDERS.filter(p =>
        p.name.toLowerCase().includes(providerName.toLowerCase())
    );

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

    const buildPayload = () => {
        const currentAccount = accounts[selectedAccountIndex];
        if (!currentAccount) {
            throw new Error('Рахунок не знайдено');
        }

        return {
            accountId: currentAccount.id,
            amount: Number(amount),
            providerName,
            contractNumber,
        };
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!customer) {
            setError('Не знайдено дані користувача для підтвердження платежу');
            return;
        }

        try {
            buildPayload();
            setError(null);
            setEmailSending(true);
            await sendEmailVerificationCode(customer.email);
            setVerificationCode('');
            setShowEmailVerification(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Помилка при оплаті Інтернету';
            setError(errorMessage);
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
            const payload = buildPayload();
            setError(null);
            setCodeVerifying(true);
            setIsLoading(true);

            await verifyEmailVerificationCode(customer.email, verificationCode);
            await createInternetPayment(payload);
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await onPaymentComplete?.();

            setShowEmailVerification(false);
            setVerificationCode('');
            alert('Оплата Інтернету успішна!');
            onBack();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Помилка при оплаті Інтернету';
            setError(errorMessage);
        } finally {
            setCodeVerifying(false);
            setIsLoading(false);
        }
    };

    const isBlockingAction = isLoading || emailSending || codeVerifying || showEmailVerification;

    return (
        <div className="payment-form-container">
            <div className="payment-header">
                <button className="back-button" onClick={onBack} disabled={isBlockingAction}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                </button>
                <h2>Оплата Інтернету</h2>
            </div>

            <form onSubmit={handleSubmit} className="payment-form">
                {error && !showEmailVerification && <div className="payment-error-message">{error}</div>}
                <div className="form-group-card">
                    <label className="input-label">Оберіть провайдера</label>
                    <div className="input-wrapper search-wrapper">
                        <input
                            type="text"
                            value={providerName}
                            onChange={(e) => {
                                setProviderName(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            placeholder="Пошук провайдера..."
                            required
                            className="form-input"
                            disabled={isBlockingAction}
                        />
                        <span className="search-icon-right">🔍</span>
                        {showSuggestions && (
                            <ul className="provider-suggestions">
                                {filteredProviders.map(p => (
                                    <li key={p.id} onClick={() => {
                                        setProviderName(p.name);
                                        setShowSuggestions(false);
                                    }}>
                                        {p.name}
                                    </li>
                                ))}
                                {filteredProviders.length === 0 && <li className="no-results">Провайдера не знайдено</li>}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="form-group-card">
                    <label className="input-label">Номер договору</label>
                    <input
                        type="text"
                        value={contractNumber}
                        onChange={(e) => setContractNumber(e.target.value)}
                        placeholder="Введіть номер договору"
                        required
                        className="form-input"
                        disabled={isBlockingAction}
                    />

                    <label className="input-label mt-4">Номер картки платника</label>
                    <select
                        value={selectedAccountIndex}
                        onChange={(e) => setSelectedAccountIndex(Number(e.target.value))}
                        className="form-select account-selector"
                        disabled={isBlockingAction}
                    >
                        {uahAccounts.length > 0 ? (
                            uahAccounts.map((acc) => {
                                const originalIndex = accounts.findIndex(a => a.accountNumber === acc.accountNumber);
                                return (
                                    <option key={acc.accountNumber} value={originalIndex}>
                                        **** {acc.card.cardNumber.slice(-4)} • {acc.balance.toFixed(2)} {acc.currency}
                                    </option>
                                );
                            })
                        ) : (
                            <option disabled>Немає доступних UAH карток</option>
                        )}
                    </select>

                    <label className="input-label mt-4">Сума до сплати</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        required
                        className="form-input"
                        disabled={isBlockingAction}
                    />
                </div>

                <div className="form-submit-container">
                    <button type="submit" className="submit-payment-btn" disabled={isLoading || emailSending}>
                        {emailSending ? 'Відправка коду...' : isLoading ? 'Обробка...' : 'Сплатити'}
                    </button>
                </div>
            </form>

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
                    setError(null);
                }}
                isSubmitting={codeVerifying}
                error={error}
            />
        </div>
    );
};

export default InternetPaymentForm;
