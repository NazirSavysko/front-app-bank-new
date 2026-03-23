import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createIbanPayment, sendEmailVerificationCode, verifyEmailVerificationCode } from '../../api';
import type { Account, CustomerData } from '../../types';
import PaymentVerificationModal from './PaymentVerificationModal';
import './PaymentForms.css';

const UKRAINIAN_IBAN_REGEX = /^UA\d{6}[A-Z0-9]{26}$/;
const UKRAINIAN_IBAN_ERROR =
    'Невірний формат IBAN. IBAN має починатися з UA, потім 6 цифр, потім 26 символів (великі літери або цифри), всього 34 символи без пробілів.';

interface IBANPaymentFormProps {
    accounts: Account[];
    customer: CustomerData | null;
    selectedAccountIndex: number;
    setSelectedAccountIndex: (index: number) => void;
    onBack: () => void;
    onPaymentFlowStateChange?: (state: 'idle' | 'sending-code' | 'awaiting-code' | 'verifying-code') => void;
    onPaymentComplete?: () => Promise<void>;
    onCopy?: (msg: string) => void;
}

const IBANPaymentForm: React.FC<IBANPaymentFormProps> = ({
    accounts,
    customer,
    selectedAccountIndex,
    setSelectedAccountIndex,
    onBack,
    onPaymentFlowStateChange,
    onPaymentComplete,
    onCopy,
}) => {
    const queryClient = useQueryClient();
    const selectedAccount = accounts[selectedAccountIndex];
    const senderTaxIdMessage = selectedAccount
        ? selectedAccount.accountType === 'FOP'
            ? `Ви відправляєте як ФОП. Ваш ЄДРПОУ: ${selectedAccount.edrpou}`
            : `Ваш ІПН: ${selectedAccount.edrpou}`
        : null;

    const [recipientName, setRecipientName] = useState('');
    const [recipientIban, setRecipientIban] = useState('');
    const [taxNumber, setTaxNumber] = useState('');
    const [purpose, setPurpose] = useState('');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSending, setEmailSending] = useState(false);
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [codeVerifying, setCodeVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ibanError =
        recipientIban.length === 0
            ? null
            : !UKRAINIAN_IBAN_REGEX.test(recipientIban)
                ? UKRAINIAN_IBAN_ERROR
                : null;

    const isSubmitDisabled = isLoading || emailSending || codeVerifying || Boolean(ibanError);
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
            recipientName,
            recipientIban,
            taxNumber,
            purpose,
        };
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (ibanError) {
            setError(ibanError);
            return;
        }

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
            onCopy?.('Код підтвердження відправлено на пошту');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Помилка при створенні платежу';
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
            await createIbanPayment(payload);
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await onPaymentComplete?.();

            setShowEmailVerification(false);
            setVerificationCode('');
            alert('Платіж надіслано успішно!');
            onBack();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Помилка при створенні платежу';
            setError(errorMessage);
        } finally {
            setCodeVerifying(false);
            setIsLoading(false);
        }
    };

    return (
        <div className="payment-form-wrapper">
            <div className="payment-form-container">
                <div className="payment-header">
                    <button className="back-button" onClick={onBack} disabled={showEmailVerification || emailSending || codeVerifying}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                    <h2>Платіж за IBAN</h2>
                </div>

                <form className="payment-form" onSubmit={handleSubmit}>
                    <div className="form-group-card account-selector-card">
                        <label className="input-label">Картка платника</label>
                        <div className="custom-select-wrapper">
                            <select
                                className="form-select account-select"
                                value={selectedAccountIndex}
                                onChange={(e) => setSelectedAccountIndex(Number(e.target.value))}
                                disabled={showEmailVerification || emailSending || codeVerifying}
                            >
                                {accounts.map((acc, idx) => (
                                    <option key={acc.id || idx} value={idx}>
                                        **** {acc.card.cardNumber.slice(-4)} • {acc.balance.toFixed(2)} {acc.currency}
                                    </option>
                                ))}
                            </select>
                            <div className="select-arrow">▼</div>
                        </div>
                        {senderTaxIdMessage && <div className="sender-tax-info">{senderTaxIdMessage}</div>}
                    </div>

                    <div className="form-group">
                        <label className="input-label mt-4">Назва отримувача (ПІБ або Компанія)</label>
                        <input
                            type="text"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Введіть назву"
                            required
                            className="form-input"
                            disabled={showEmailVerification || emailSending || codeVerifying}
                        />

                        <label className="input-label mt-4">IBAN отримувача (UA...)</label>
                        <input
                            type="text"
                            value={recipientIban}
                            onChange={(e) => setRecipientIban(e.target.value.toUpperCase().slice(0, 34))}
                            placeholder="UA000000000000000000000000000"
                            required
                            className="form-input"
                            maxLength={34}
                            autoCapitalize="characters"
                            spellCheck={false}
                            aria-invalid={Boolean(ibanError)}
                            disabled={showEmailVerification || emailSending || codeVerifying}
                        />
                        {ibanError && <div className="field-error-message">{ibanError}</div>}

                        <label className="input-label mt-4">ЄДРПОУ / ІПН</label>
                        <input
                            type="text"
                            value={taxNumber}
                            onChange={(e) => setTaxNumber(e.target.value)}
                            placeholder="12345678"
                            required
                            className="form-input"
                            disabled={showEmailVerification || emailSending || codeVerifying}
                        />

                        <label className="input-label mt-4">Призначення платежу</label>
                        <input
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="Введіть призначення"
                            required
                            className="form-input"
                            disabled={showEmailVerification || emailSending || codeVerifying}
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
                            disabled={isLoading || showEmailVerification || emailSending || codeVerifying}
                        />
                    </div>

                    <button type="submit" className="submit-payment-btn" disabled={isSubmitDisabled}>
                        {emailSending ? 'Відправка коду...' : isLoading ? 'Обробка...' : 'Сплатити'}
                    </button>
                </form>

                {error && <div className="error-message">{error}</div>}
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

export default IBANPaymentForm;
