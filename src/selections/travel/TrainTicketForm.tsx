import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createTrainPayment } from '../../api';
import { useAccounts } from '../../hooks/useAccounts';
import './TrainTicketForm.css';

type TicketType = 'intercity' | 'coupe' | 'platzkart';

const BASE_PRICE = 700;
const TICKET_OFFSETS: Record<TicketType, number> = {
    intercity: 250,
    coupe: 0,
    platzkart: -150,
};

const TICKET_META: Array<{ key: TicketType; icon: string; label: string; offsetLabel: string }> = [
    { key: 'intercity', icon: '🚆', label: 'Інтерсіті', offsetLabel: '+ 250' },
    { key: 'coupe', icon: '🛏️', label: 'Купе', offsetLabel: 'Базовий' },
    { key: 'platzkart', icon: '🚞', label: 'Плацкарт', offsetLabel: '- 150' },
];

const TrainTicketForm: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { accounts } = useAccounts();

    const uahAccounts = useMemo(() => accounts.filter((account) => account.currency === 'UAH'), [accounts]);
    const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
    const [fromCity, setFromCity] = useState('Київ');
    const [toCity, setToCity] = useState('Львів');
    const [travelDate, setTravelDate] = useState('');
    const [ticketType, setTicketType] = useState<TicketType>('coupe');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (!selectedAccountId && uahAccounts.length > 0) {
            setSelectedAccountId(uahAccounts[0].id);
        }
    }, [selectedAccountId, uahAccounts]);

    const totalAmount = BASE_PRICE + TICKET_OFFSETS[ticketType];

    const swapCities = () => {
        const from = fromCity;
        setFromCity(toCity);
        setToCity(from);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);

        const from = fromCity.trim();
        const to = toCity.trim();

        if (!selectedAccountId) {
            setError('Оберіть UAH-рахунок для оплати.');
            return;
        }
        if (!from || !to) {
            setError('Вкажіть міста відправлення та призначення.');
            return;
        }
        if (from.toLowerCase() === to.toLowerCase()) {
            setError('Міста відправлення та призначення мають відрізнятися.');
            return;
        }
        if (!travelDate) {
            setError('Оберіть дату поїздки.');
            return;
        }

        setIsLoading(true);
        try {
            await createTrainPayment({
                accountId: selectedAccountId,
                amount: totalAmount,
                fromCity: from,
                toCity: to,
                ticketType,
            });
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            navigate(-1);
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : 'Не вдалося оформити квиток.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="train-ticket-page">
            <header className="train-ticket-header">
                <button type="button" className="train-ticket-header-btn" onClick={() => navigate(-1)} aria-label="Назад">
                    ←
                </button>
                <h1>Купити квиток на потяг</h1>
                <span className="train-ticket-header-placeholder" />
            </header>

            <form className="train-ticket-container" onSubmit={handleSubmit}>
                <div className="train-ticket-route-grid">
                    <label className="train-ticket-input-card">
                        <span className="train-ticket-input-label">Звідки</span>
                        <input value={fromCity} onChange={(event) => setFromCity(event.target.value)} placeholder="Київ" />
                    </label>
                    <button type="button" className="train-ticket-swap-btn" onClick={swapCities} aria-label="Поміняти міста">
                        🔄
                    </button>
                    <label className="train-ticket-input-card">
                        <span className="train-ticket-input-label">Куди</span>
                        <input value={toCity} onChange={(event) => setToCity(event.target.value)} placeholder="Львів" />
                    </label>
                </div>

                <label className="train-ticket-input-card">
                    <span className="train-ticket-input-label">Дата поїздки</span>
                    <input type="date" value={travelDate} onChange={(event) => setTravelDate(event.target.value)} />
                </label>

                <section>
                    <h2 className="train-ticket-section-title">Оплата з рахунку</h2>
                    <div className="train-ticket-scroll">
                        {uahAccounts.map((account) => {
                            const isActive = selectedAccountId === account.id;
                            return (
                                <button
                                    key={account.id}
                                    type="button"
                                    className={`train-ticket-account-card ${isActive ? 'active' : ''}`}
                                    onClick={() => setSelectedAccountId(account.id)}
                                >
                                    <span className="train-ticket-account-flag">🇺🇦</span>
                                    <span className="train-ticket-account-content">
                                        <strong>{account.balance.toFixed(2)} UAH</strong>
                                        <small>**** {account.card.cardNumber.slice(-4)}</small>
                                    </span>
                                </button>
                            );
                        })}
                        {uahAccounts.length === 0 && <div className="train-ticket-empty">Немає UAH-рахунків.</div>}
                    </div>
                </section>

                <section>
                    <h2 className="train-ticket-section-title">Тип квитка</h2>
                    <div className="train-ticket-scroll">
                        {TICKET_META.map((ticket) => {
                            const isActive = ticketType === ticket.key;
                            return (
                                <button
                                    key={ticket.key}
                                    type="button"
                                    className={`train-ticket-type-card ${isActive ? 'active' : ''}`}
                                    onClick={() => setTicketType(ticket.key)}
                                >
                                    <span className="train-ticket-type-icon">{ticket.icon}</span>
                                    <strong>{ticket.label}</strong>
                                    <small>{ticket.offsetLabel}</small>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {error && <div className="train-ticket-error">{error}</div>}

                <div className="train-ticket-bottom-bar">
                    <div className="train-ticket-total">
                        <span>До сплати</span>
                        <strong>{totalAmount} ₴</strong>
                    </div>
                    <button type="submit" className="train-ticket-submit" disabled={isLoading || uahAccounts.length === 0}>
                        {isLoading ? 'Оплата...' : 'Купити квиток'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TrainTicketForm;
