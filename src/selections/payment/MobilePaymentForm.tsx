import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createMobilePayment, sendEmailVerificationCode, verifyEmailVerificationCode } from '../../api';
import type { Account, CustomerData } from '../../types';
import PaymentVerificationModal from './PaymentVerificationModal';
import './PaymentForms.css';

const PHONE_REGEX = /^\+380\d{9}$/;
const PHONE_FORMAT_LENGTH = 13;
const SUCCESS_MESSAGE_DISPLAY_DURATION_MS = 700;

interface MobilePaymentFormProps {
    accounts: Account[];
    customer: CustomerData | null;
    onBack: () => void;
    onPaymentFlowStateChange?: (state: 'idle' | 'sending-code' | 'awaiting-code' | 'verifying-code') => void;
    onPaymentComplete?: () => Promise<void>;
    onCopy?: (msg: string) => void;
}

const MobilePaymentForm: React.FC<MobilePaymentFormProps> = ({
    accounts,
    customer,
    onBack,
    onPaymentFlowStateChange,
    onPaymentComplete,
    onCopy,
}) => {
    const queryClient = useQueryClient();

    const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
    const [phoneNumber, setPhoneNumber] = useState('+380');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSending, setEmailSending] = useState(false);
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [codeVerifying, setCodeVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const uahAccounts = useMemo(() => accounts.filter((acc) => acc.currency === 'UAH'), [accounts]);

    useEffect(() => {
        if (uahAccounts.length > 0 && !uahAccounts.some((acc) => acc.id === selectedAccountId)) {
            setSelectedAccountId(uahAccounts[0].id);
        }
    }, [selectedAccountId, uahAccounts]);

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

    useEffect(() => {
        if (!successMessage) {
            return;
        }
        const timeoutId = window.setTimeout(() => onBack(), SUCCESS_MESSAGE_DISPLAY_DURATION_MS);
        return () => window.clearTimeout(timeoutId);
    }, [onBack, successMessage]);

    const handlePhoneChange = (value: string) => {
        const cleaned = value.replace(/[^\d+]/g, '');
        if (!cleaned.startsWith('+380')) {
            setPhoneNumber('+380');
            return;
        }
        setPhoneNumber(cleaned.slice(0, PHONE_FORMAT_LENGTH));
    };

    const validatePayload = () => {
        if (!PHONE_REGEX.test(phoneNumber)) {
            throw new Error('Номер телефону має бути у форматі +380XXXXXXXXX');
        }

        const parsedAmount = Number(amount);
        if (!selectedAccountId || parsedAmount <= 0) {
            throw new Error('Перевірте рахунок та суму платежу');
        }

        return {
            accountId: selectedAccountId,
            amount: parsedAmount,
            phoneNumber,
        };
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setSuccessMessage(null);

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
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Помилка при поповненні мобільного';
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
            const payload = validatePayload();
            setError(null);
            setCodeVerifying(true);
            setIsLoading(true);

            await verifyEmailVerificationCode(customer.email, verificationCode);
            await createMobilePayment(payload);
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await onPaymentComplete?.();

            setShowEmailVerification(false);
            setVerificationCode('');
            setSuccessMessage('Поповнення мобільного успішне!');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Помилка при поповненні мобільного';
            setError(errorMessage);
        } finally {
            setCodeVerifying(false);
            setIsLoading(false);
        }
    };

    const isBlockingAction = isLoading || emailSending || codeVerifying || showEmailVerification;

    return (
        <div className="payment-form-wrapper">
            <div className="payment-form-container">
                <div className="payment-header">
                    <button type="button" className="back-button" onClick={onBack} disabled={isBlockingAction}>
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
                            disabled={uahAccounts.length === 0 || isBlockingAction}
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
                            disabled={isBlockingAction}
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
                            disabled={isBlockingAction}
                        />
                    </div>

                    {error && !showEmailVerification && <div className="error-message">{error}</div>}
                    {successMessage && <div className="sender-tax-info">{successMessage}</div>}

                    <button type="submit" className="submit-payment-btn" disabled={isLoading || emailSending || uahAccounts.length === 0}>
                        {emailSending ? 'Відправка коду...' : isLoading ? 'Обробка...' : 'Поповнити'}
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
                    setError(null);
                }}
                isSubmitting={codeVerifying}
                error={error}
            />
        </div>
    );
};

export default MobilePaymentForm;
