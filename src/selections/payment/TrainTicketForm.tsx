import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createTrainPayment } from '../../api';
import { useAccounts } from '../../hooks/useAccounts';
import './PaymentForms.css';

const TICKET_TYPES = [
    { value: 'INTERCITY', label: '🚆 Інтерсіті' },
    { value: 'KUPE', label: '🛏️ Купе' },
    { value: 'PLATSKART', label: '🚞 Плацкарт' },
];
const SUCCESS_DELAY_MS = 700;

const TrainTicketForm: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { accounts } = useAccounts();

    const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
    const [fromCity, setFromCity] = useState('');
    const [toCity, setToCity] = useState('');
    const [departureDate, setDepartureDate] = useState('');
    const [ticketType, setTicketType] = useState(TICKET_TYPES[0].value);
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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

    const isValidDepartureDate = departureDate ? departureDate >= minDate : false;

    useEffect(() => {
        if (!successMessage) {
            return;
        }
        const timeoutId = window.setTimeout(() => navigate('/dashboard/payments'), SUCCESS_DELAY_MS);
        return () => window.clearTimeout(timeoutId);
    }, [navigate, successMessage]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');

        const parsedAmount = Number(amount);

        if (!selectedAccountId) {
            setError('Оберіть рахунок для оплати');
            return;
        }

        if (!fromCity.trim() || !toCity.trim()) {
            setError('Вкажіть міста відправлення та прибуття');
            return;
        }

        if (!isValidDepartureDate) {
            setError('Дата поїздки має бути сьогодні або пізніше');
            return;
        }

        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setError('Вкажіть коректну суму');
            return;
        }

        setIsLoading(true);
        try {
            await createTrainPayment({
                accountId: selectedAccountId,
                amount: parsedAmount,
                fromCity: fromCity.trim(),
                toCity: toCity.trim(),
                departureDate,
                ticketType,
            });
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            setSuccessMessage('Оплату квитків успішно виконано!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при оплаті квитків');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="payment-form-wrapper">
            <div className="payment-form-container train-ticket-root">
                <div className="payment-header">
                    <button className="back-button" onClick={() => navigate('/dashboard/payments')}>
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
                                        onClick={() => setSelectedAccountId(acc.id)}
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
                            disabled={isLoading}
                        />
                        <input
                            type="text"
                            className="form-input train-white-input"
                            value={toCity}
                            onChange={(event) => setToCity(event.target.value)}
                            placeholder="Наприклад, Львів"
                            required
                            disabled={isLoading}
                        />
                        <input
                            type="date"
                            className="form-input train-white-input"
                            value={departureDate}
                            onChange={(event) => setDepartureDate(event.target.value)}
                            min={minDate}
                            required
                            disabled={isLoading}
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
                                    disabled={isLoading}
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
                            disabled={isLoading || accountsList.length === 0}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}
                    {successMessage && <div className="sender-tax-info">{successMessage}</div>}

                    <button
                        type="submit"
                        className="submit-payment-btn train-submit-btn"
                        disabled={isLoading || accountsList.length === 0}
                    >
                        {isLoading ? 'Обробка...' : 'Оплатити'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TrainTicketForm;
