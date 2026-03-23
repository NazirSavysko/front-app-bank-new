import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createTrainPayment, sendEmailVerificationCode, verifyEmailVerificationCode } from '../../api';
import type { Account, CustomerData } from '../../types';
import PaymentVerificationModal from './PaymentVerificationModal';
import './PaymentForms.css';

const TICKET_TYPES = [
    { value: 'INTERCITY', label: ' Інтерсіті ' },
    { value: 'KUPE', label: ' Купе' },
    { value: 'PLATSKART', label: ' Плацкарт' },
];
const SUCCESS_DELAY_MS = 700;

interface TrainTicketFormProps {
    accounts: Account[];
    customer: CustomerData | null;
    onBack: () => void;
    onPaymentFlowStateChange?: (state: 'idle' | 'sending-code' | 'awaiting-code' | 'verifying-code') => void;
    onPaymentComplete?: () => Promise<void>;
    onCopy?: (msg: string) => void;
}

const TrainTicketForm: React.FC<TrainTicketFormProps> = ({
    accounts,
    customer,
    onBack,
    onPaymentFlowStateChange,
    onPaymentComplete,
    onCopy,
}) => {
    const queryClient = useQueryClient();

    const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
    const [fromCity, setFromCity] = useState('');
    const [toCity, setToCity] = useState('');
    const [departureDate, setDepartureDate] = useState('');
    const [ticketType, setTicketType] = useState(TICKET_TYPES[0].value);
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSending, setEmailSending] = useState(false);
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [codeVerifying, setCodeVerifying] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const minDate = useMemo(() => new Date().toISOString().split('T')[0], []);
    const accountsList = useMemo(
        () => accounts.filter((account) => account.currency === 'UAH'),
        [accounts]
    );

    useEffect(() => {
        if (accountsList.length > 0 && !accountsList.some((acc) => acc.id === selectedAccountId)) {
            setSelectedAccountId(accountsList[0].id);
        }
    }, [selectedAccountId, accountsList]);

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

    const isValidDepartureDate = departureDate ? departureDate >= minDate : false;

    useEffect(() => {
        if (!successMessage) {
            return;
        }
        const timeoutId = window.setTimeout(() => onBack(), SUCCESS_DELAY_MS);
        return () => window.clearTimeout(timeoutId);
    }, [onBack, successMessage]);

    const buildPayload = () => {
        const parsedAmount = Number(amount);

        if (!selectedAccountId) {
            throw new Error('Оберіть рахунок для оплати');
        }

        if (!fromCity.trim() || !toCity.trim()) {
            throw new Error('Вкажіть міста відправлення та прибуття');
        }

        if (!isValidDepartureDate) {
            throw new Error('Дата поїздки має бути сьогодні або пізніше');
        }

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            throw new Error('Вкажіть коректну суму');
        }

        return {
            accountId: selectedAccountId,
            amount: parsedAmount,
            fromCity: fromCity.trim(),
            toCity: toCity.trim(),
            departureDate,
            ticketType,
        };
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!customer) {
            setError('Не знайдено дані користувача для підтвердження платежу');
            return;
        }

        try {
            buildPayload();
            setEmailSending(true);
            await sendEmailVerificationCode(customer.email);
            setVerificationCode('');
            setShowEmailVerification(true);
            onCopy?.('Код підтвердження відправлено на пошту');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при оплаті квитків');
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
            setError('');
            setCodeVerifying(true);
            setIsLoading(true);

            await verifyEmailVerificationCode(customer.email, verificationCode);
            await createTrainPayment(payload);
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await onPaymentComplete?.();

            setShowEmailVerification(false);
            setVerificationCode('');
            setSuccessMessage('Оплату квитків успішно виконано!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при оплаті квитків');
        } finally {
            setCodeVerifying(false);
            setIsLoading(false);
        }
    };

    const isBlockingAction = isLoading || emailSending || codeVerifying || showEmailVerification;

    return (
        <div className="payment-form-wrapper">
            <div className="payment-form-container train-ticket-root">
                <div className="payment-header">
                    <button className="back-button" onClick={onBack} disabled={isBlockingAction}>
                        ← Назад
                    </button>
                    <h2>Квитки на потяг</h2>
                </div>

                <form className="payment-form train-form" onSubmit={handleSubmit}>
                    {accountsList.length === 0 ? (
                        <div className="error-message">У вас немає рахунків у гривні (UAH) або ФОП для оплати</div>
                    ) : (
                        <div className="form-group">
                            <label className="input-label">Звідки списати</label>
                            <div className="train-scroll-row">
                                {accountsList.map((acc) => (
                                    <div
                                        key={acc.id}
                                        className={`train-account-card ${selectedAccountId === acc.id ? 'is-active' : ''}`}
                                        onClick={() => {
                                            if (!isBlockingAction) {
                                                setSelectedAccountId(acc.id);
                                            }
                                        }}
                                    >
                                        <div className="train-account-name">
                                            {acc.accountType === 'FOP' ? 'ФОП Рахунок' : 'Поточний рахунок'}
                                        </div>
                                        <div className="train-account-balance">
                                            {acc.balance.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} {acc.currencyCode || acc.currency}
                                        </div>
                                        <div className="train-account-number">*{acc.accountNumber.slice(-4)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="input-label">Маршрут</label>
                        <input
                            type="text"
                            className="form-input train-white-input"
                            value={fromCity}
                            onChange={(event) => setFromCity(event.target.value)}
                            placeholder="Наприклад, Київ"
                            required
                            disabled={isBlockingAction}
                        />
                        <input
                            type="text"
                            className="form-input train-white-input"
                            value={toCity}
                            onChange={(event) => setToCity(event.target.value)}
                            placeholder="Наприклад, Львів"
                            required
                            disabled={isBlockingAction}
                        />
                        <input
                            type="date"
                            className="form-input train-white-input"
                            value={departureDate}
                            onChange={(event) => setDepartureDate(event.target.value)}
                            min={minDate}
                            required
                            disabled={isBlockingAction}
                        />
                    </div>

                    <div className="form-group">
                        <label className="input-label">Тип квитка</label>
                        <div className="train-scroll-row">
                            {TICKET_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    className={`train-ticket-card ${ticketType === type.value ? 'is-active' : ''}`}
                                    onClick={() => setTicketType(type.value)}
                                    disabled={isBlockingAction}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="input-label">Вартість квитка</label>
                        <input
                            type="number"
                            className="form-input train-white-input"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                            required
                            disabled={isBlockingAction || accountsList.length === 0}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}
                    {successMessage && <div className="sender-tax-info">{successMessage}</div>}

                    <button
                        type="submit"
                        className="submit-payment-btn train-submit-btn"
                        disabled={isLoading || emailSending || accountsList.length === 0}
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

export default TrainTicketForm;
