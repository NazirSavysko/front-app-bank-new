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
    const uahAccounts = useMemo(
        () => accounts.filter((account) => account.currencyCode === 'UAH'),
        [accounts]
    );

    useEffect(() => {
        if (uahAccounts.length > 0 && !uahAccounts.some((acc) => acc.id === selectedAccountId)) {
            setSelectedAccountId(uahAccounts[0].id);
        }
    }, [selectedAccountId, uahAccounts]);

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
            setError('Оберіть UAH рахунок для оплати');
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
                    <button type="button" className="back-button" onClick={() => navigate('/dashboard/payments')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                    <h2>Квитки на потяг</h2>
                </div>

                <form className="payment-form" onSubmit={handleSubmit}>
                    <section className="train-card">
                        <h3 className="train-section-title">Звідки списуємо</h3>
                        <div className="train-scroll-row">
                            {uahAccounts.length > 0 ? (
                                uahAccounts.map((account) => (
                                    <button
                                        key={account.id}
                                        type="button"
                                        className={`train-account-card ${selectedAccountId === account.id ? 'is-active' : ''}`}
                                        onClick={() => setSelectedAccountId(account.id)}
                                        disabled={isLoading}
                                    >
                                        <strong>**** {account.card.cardNumber.slice(-4)}</strong>
                                        <span>{account.balance.toLocaleString('uk-UA')} UAH</span>
                                    </button>
                                ))
                            ) : (
                                <p className="train-empty">Немає доступних UAH рахунків</p>
                            )}
                        </div>
                    </section>

                    <section className="train-card">
                        <h3 className="train-section-title">Маршрут та дата</h3>
                        <label className="input-label">Звідки</label>
                        <input
                            type="text"
                            className="form-input train-white-input"
                            value={fromCity}
                            onChange={(event) => setFromCity(event.target.value)}
                            placeholder="Наприклад, Київ"
                            required
                            disabled={isLoading}
                        />

                        <label className="input-label">Куди</label>
                        <input
                            type="text"
                            className="form-input train-white-input"
                            value={toCity}
                            onChange={(event) => setToCity(event.target.value)}
                            placeholder="Наприклад, Львів"
                            required
                            disabled={isLoading}
                        />

                        <label className="input-label">Дата поїздки</label>
                        <input
                            type="date"
                            className="form-input train-white-input"
                            value={departureDate}
                            onChange={(event) => setDepartureDate(event.target.value)}
                            min={minDate}
                            required
                            disabled={isLoading}
                        />
                    </section>

                    <section className="train-card">
                        <h3 className="train-section-title">Тип квитка</h3>
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
                    </section>

                    <section className="train-card">
                        <h3 className="train-section-title">Вартість квитка</h3>
                        <input
                            type="number"
                            className="form-input train-white-input"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            placeholder="0.00"
                            min="0.01"
                            step="0.01"
                            required
                            disabled={isLoading || uahAccounts.length === 0}
                        />
                    </section>

                    {error && <div className="error-message">{error}</div>}
                    {successMessage && <div className="sender-tax-info">{successMessage}</div>}

                    <button
                        type="submit"
                        className="submit-payment-btn train-submit-btn"
                        disabled={isLoading || uahAccounts.length === 0}
                    >
                        {isLoading ? 'Обробка...' : 'Оплатити'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TrainTicketForm;
