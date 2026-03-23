import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createIbanPayment } from '../../api';
import { useAccounts } from '../../hooks/useAccounts';
import type { Account } from '../../types';
import { useNavigate } from 'react-router-dom';
import './TransportHub.css';

type TransportTab = 'train' | 'airplane' | 'bus' | 'city';

type PaymentSubmit = {
    accountId: number;
    amount: number;
    purpose: string;
    recipientName: string;
};

const TRANSPORT_RECIPIENT_IBAN = import.meta.env.VITE_TRANSPORT_RECIPIENT_IBAN || 'UA12345678901234567890123456789012';
const TRANSPORT_RECIPIENT_TAX_NUMBER = import.meta.env.VITE_TRANSPORT_RECIPIENT_TAX_NUMBER || '00000000';
const TRAIN_TICKET_PRICES = {
    intercity: 950,
    coupe: 760,
    platzkart: 620,
} as const;
const AIRPLANE_PRICES = {
    economy: 3200,
    business: 5600,
    bagExtra: 700,
} as const;
const BUS_TICKET_PRICE = 520;
const CITY_QR_TICKET_PRICE = 20;
const CITY_PASS_PRICES = {
    tram: 690,
    metro: 799,
} as const;
const BUS_CARRIERS = ['FlixBus', 'Ecolines', 'Autolux'] as const;
const CITY_OPTIONS = ['Київ', 'Львів', 'Харків', 'Дніпро'] as const;

const UahAccountSelector: React.FC<{
    accounts: Account[];
    selectedAccountId: number;
    onSelect: (accountId: number) => void;
}> = ({ accounts, selectedAccountId, onSelect }) => (
    <div className="travel-account-scroll" role="listbox" aria-label="Рахунки UAH">
        {accounts.map((acc) => {
            const active = selectedAccountId === acc.id;
            return (
                <button
                    key={acc.id}
                    type="button"
                    className={`travel-account-card ${active ? 'active' : ''}`}
                    onClick={() => onSelect(acc.id)}
                    role="option"
                    aria-selected={active}
                >
                    <div className="travel-account-flag">🇺🇦</div>
                    <div className="travel-account-info">
                        <strong>{acc.balance.toFixed(2)} UAH</strong>
                        <span>Картка • **** {acc.card.cardNumber.slice(-4)}</span>
                    </div>
                </button>
            );
        })}
    </div>
);

const FormFieldCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: 'text' | 'date';
}> = ({ icon, label, value, onChange, type = 'text' }) => (
    <label className="travel-field-card">
        <span className="travel-field-icon">{icon}</span>
        <span className="travel-field-body">
            <span className="travel-field-label">{label}</span>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="travel-field-input"
            />
        </span>
    </label>
);

const submitTransportPayment = async ({
    queryClient,
    payload,
}: {
    queryClient: ReturnType<typeof useQueryClient>;
    payload: PaymentSubmit;
}) => {
    await createIbanPayment({
        accountId: payload.accountId,
        amount: payload.amount,
        recipientName: payload.recipientName,
        recipientIban: TRANSPORT_RECIPIENT_IBAN,
        taxNumber: TRANSPORT_RECIPIENT_TAX_NUMBER,
        purpose: payload.purpose,
    });
    await queryClient.invalidateQueries({ queryKey: ['transactions'] });
};

const TrainForm: React.FC<{ accounts: Account[] }> = ({ accounts }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? 0);
    const [from, setFrom] = useState('Київ');
    const [to, setTo] = useState('Львів');
    const [date, setDate] = useState('');
    const [ticketType, setTicketType] = useState<'intercity' | 'coupe' | 'platzkart'>('intercity');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const amount = TRAIN_TICKET_PRICES[ticketType];

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedAccountId) return;
        setError(null);
        setIsSubmitting(true);
        try {
            await submitTransportPayment({
                queryClient,
                payload: {
                    accountId: selectedAccountId,
                    amount,
                    purpose: 'Квиток на потяг',
                    recipientName: 'Укрзалізниця',
                },
            });
            navigate('/dashboard/transactions');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не вдалося оформити квиток');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className="travel-form" onSubmit={handleSubmit}>
            <FormFieldCard icon="📍" label="Звідки" value={from} onChange={setFrom} />
            <div className="travel-reverse-row">
                <FormFieldCard icon="📍" label="Куди" value={to} onChange={setTo} />
                <button
                    type="button"
                    className="travel-reverse-btn"
                    onClick={() => {
                        const prevFrom = from;
                        setFrom(to);
                        setTo(prevFrom);
                    }}
                    aria-label="Поміняти місцями"
                >
                    ⇄
                </button>
            </div>
            <FormFieldCard icon="📅" label="Дата" value={date} onChange={setDate} type="date" />

            <UahAccountSelector accounts={accounts} selectedAccountId={selectedAccountId} onSelect={setSelectedAccountId} />

            <div className="travel-ticket-type-scroll" role="listbox" aria-label="Тип квитка">
                {[
                    { key: 'intercity', icon: '🚆', title: 'Інтерсіті', desc: 'Швидкий рейс', price: '+950 ₴' },
                    { key: 'coupe', icon: '🛏️', title: 'Купе', desc: 'Комфорт', price: '+760 ₴' },
                    { key: 'platzkart', icon: '🚞', title: 'Плацкарт', desc: 'Економ', price: '+620 ₴' },
                ].map((item) => {
                    const active = ticketType === item.key;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            className={`travel-ticket-type-card ${active ? 'active' : ''}`}
                            onClick={() => setTicketType(item.key as 'intercity' | 'coupe' | 'platzkart')}
                            role="option"
                            aria-selected={active}
                        >
                            <span>{item.icon}</span>
                    <strong>{item.title}</strong>
                    <small>{item.desc}</small>
                    <em>{item.price}</em>
                </button>
            );
        })}
            </div>

            {error && <div className="travel-error">{error}</div>}
            <div className="travel-sticky-bar">
                <button type="submit" className="travel-submit-btn" disabled={isSubmitting || !date || !from || !to}>
                    {isSubmitting ? 'Обробка...' : 'Купити квиток'}
                </button>
            </div>
        </form>
    );
};

const AirplaneForm: React.FC<{ accounts: Account[] }> = ({ accounts }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? 0);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [departDate, setDepartDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [flightClass, setFlightClass] = useState<'economy' | 'business'>('economy');
    const [hasBag, setHasBag] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const amount = (flightClass === 'business' ? AIRPLANE_PRICES.business : AIRPLANE_PRICES.economy) + (hasBag ? AIRPLANE_PRICES.bagExtra : 0);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedAccountId) return;
        setError(null);
        setIsSubmitting(true);
        try {
            await submitTransportPayment({
                queryClient,
                payload: {
                    accountId: selectedAccountId,
                    amount,
                    purpose: 'Авіаквиток',
                    recipientName: 'Авіалінії України',
                },
            });
            navigate('/dashboard/transactions');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не вдалося оформити авіаквиток');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className="travel-form" onSubmit={handleSubmit}>
            <FormFieldCard icon="🛫" label="Аеропорт вильоту" value={from} onChange={setFrom} />
            <FormFieldCard icon="🛬" label="Аеропорт прильоту" value={to} onChange={setTo} />
            <FormFieldCard icon="📅" label="Туди" value={departDate} onChange={setDepartDate} type="date" />
            <FormFieldCard icon="📅" label="Назад" value={returnDate} onChange={setReturnDate} type="date" />
            <UahAccountSelector accounts={accounts} selectedAccountId={selectedAccountId} onSelect={setSelectedAccountId} />

            <div className="travel-option-scroll">
                {[
                    { key: 'economy', label: 'Economy' },
                    { key: 'business', label: 'Business' },
                ].map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        className={`travel-option-card ${flightClass === item.key ? 'active' : ''}`}
                        onClick={() => setFlightClass(item.key as 'economy' | 'business')}
                    >
                        {item.label}
                    </button>
                ))}
                <button type="button" className={`travel-option-card ${hasBag ? 'active' : ''}`} onClick={() => setHasBag((prev) => !prev)}>
                    Багаж
                </button>
            </div>

            {error && <div className="travel-error">{error}</div>}
            <div className="travel-sticky-bar">
                <button type="submit" className="travel-submit-btn" disabled={isSubmitting || !from || !to || !departDate}>
                    {isSubmitting ? 'Обробка...' : 'Купити авіаквиток'}
                </button>
            </div>
        </form>
    );
};

const BusForm: React.FC<{ accounts: Account[] }> = ({ accounts }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? 0);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [date, setDate] = useState('');
    const [carrierOpen, setCarrierOpen] = useState(false);
    const [carrier, setCarrier] = useState<(typeof BUS_CARRIERS)[number]>(BUS_CARRIERS[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedAccountId) return;
        setError(null);
        setIsSubmitting(true);
        try {
            await submitTransportPayment({
                queryClient,
                payload: {
                    accountId: selectedAccountId,
                    amount: BUS_TICKET_PRICE,
                    purpose: 'Квиток на автобус',
                    recipientName: carrier,
                },
            });
            navigate('/dashboard/transactions');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не вдалося оформити квиток');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className="travel-form" onSubmit={handleSubmit}>
            <FormFieldCard icon="📍" label="Звідки" value={from} onChange={setFrom} />
            <FormFieldCard icon="📍" label="Куди" value={to} onChange={setTo} />
            <FormFieldCard icon="📅" label="Дата" value={date} onChange={setDate} type="date" />
            <UahAccountSelector accounts={accounts} selectedAccountId={selectedAccountId} onSelect={setSelectedAccountId} />

            <div className="travel-dropdown">
                <button type="button" className="travel-dropdown-trigger" onClick={() => setCarrierOpen((prev) => !prev)}>
                    <span>🚌</span>
                    <span>{carrier}</span>
                    <span>▾</span>
                </button>
                {carrierOpen && (
                    <ul className="travel-dropdown-list">
                        {BUS_CARRIERS.map((item) => (
                            <li key={item}>
                                <button
                                    type="button"
                                    className={`travel-dropdown-item ${item === carrier ? 'active' : ''}`}
                                    onClick={() => {
                                        setCarrier(item);
                                        setCarrierOpen(false);
                                    }}
                                >
                                    {item}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {error && <div className="travel-error">{error}</div>}
            <div className="travel-sticky-bar">
                <button type="submit" className="travel-submit-btn" disabled={isSubmitting || !from || !to || !date}>
                    {isSubmitting ? 'Обробка...' : 'Купити квиток на автобус'}
                </button>
            </div>
        </form>
    );
};

const CityTransportForm: React.FC<{ accounts: Account[] }> = ({ accounts }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? 0);
    const [cityOpen, setCityOpen] = useState(false);
    const [city, setCity] = useState('Київ');
    const [ticketsCount, setTicketsCount] = useState(1);
    const [passType, setPassType] = useState<'tram' | 'metro'>('tram');
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
    const [isSubmittingPass, setIsSubmittingPass] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTicketSubmit = async () => {
        if (!selectedAccountId) return;
        setError(null);
        setIsSubmittingTicket(true);
        try {
            await submitTransportPayment({
                queryClient,
                payload: {
                    accountId: selectedAccountId,
                    amount: CITY_QR_TICKET_PRICE * ticketsCount,
                    purpose: 'Квиток на міський транспорт',
                    recipientName: `${city} транспорт`,
                },
            });
            navigate('/dashboard/transactions');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не вдалося оформити QR-квиток');
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    const handlePassSubmit = async () => {
        if (!selectedAccountId) return;
        setError(null);
        setIsSubmittingPass(true);
        try {
            await submitTransportPayment({
                queryClient,
                payload: {
                    accountId: selectedAccountId,
                    amount: CITY_PASS_PRICES[passType],
                    purpose: 'Проїзний на міський транспорт',
                    recipientName: `${city} транспорт`,
                },
            });
            navigate('/dashboard/transactions');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не вдалося оформити проїзний');
        } finally {
            setIsSubmittingPass(false);
        }
    };

    return (
        <div className="travel-form">
            <UahAccountSelector accounts={accounts} selectedAccountId={selectedAccountId} onSelect={setSelectedAccountId} />

            <div className="travel-dropdown">
                <button type="button" className="travel-dropdown-trigger" onClick={() => setCityOpen((prev) => !prev)}>
                    <span>🏙️</span>
                    <span>{city}</span>
                    <span>▾</span>
                </button>
                {cityOpen && (
                    <ul className="travel-dropdown-list">
                        {CITY_OPTIONS.map((item) => (
                            <li key={item}>
                                <button
                                    type="button"
                                    className={`travel-dropdown-item ${item === city ? 'active' : ''}`}
                                    onClick={() => {
                                        setCity(item);
                                        setCityOpen(false);
                                    }}
                                >
                                    {item}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="travel-field-card travel-counter-card">
                <span className="travel-field-icon">🚋</span>
                <span className="travel-field-body">
                    <span className="travel-field-label">Квитки</span>
                    <div className="travel-counter">
                        <button type="button" onClick={() => setTicketsCount((prev) => Math.max(1, prev - 1))}>−</button>
                        <span>{ticketsCount}</span>
                        <button type="button" onClick={() => setTicketsCount((prev) => prev + 1)}>+</button>
                    </div>
                </span>
            </div>

            <div className="travel-sticky-bar travel-sticky-bar--inline">
                <button type="button" className="travel-submit-btn" disabled={isSubmittingTicket} onClick={handleTicketSubmit}>
                    {isSubmittingTicket ? 'Обробка...' : 'Купити QR-квиток'}
                </button>
            </div>

            <section className="travel-pass-section">
                <h3>Проїзний</h3>
                <div className="travel-option-scroll">
                    <button type="button" className={`travel-option-card ${passType === 'tram' ? 'active' : ''}`} onClick={() => setPassType('tram')}>
                        🚊 Трамвай
                    </button>
                    <button type="button" className={`travel-option-card ${passType === 'metro' ? 'active' : ''}`} onClick={() => setPassType('metro')}>
                        🚇 Метро
                    </button>
                </div>
                <div className="travel-sticky-bar travel-sticky-bar--inline">
                    <button type="button" className="travel-submit-btn" disabled={isSubmittingPass} onClick={handlePassSubmit}>
                        {isSubmittingPass ? 'Обробка...' : 'Оформити проїзний'}
                    </button>
                </div>
            </section>
            {error && <div className="travel-error">{error}</div>}
        </div>
    );
};

const TransportHub: React.FC = () => {
    const { accounts } = useAccounts();
    const [activeTab, setActiveTab] = useState<TransportTab>('train');

    const uahAccounts = useMemo(() => accounts.filter((acc) => acc.currency === 'UAH'), [accounts]);

    const tabItems: Array<{ key: TransportTab; icon: string; label: string }> = [
        { key: 'train', icon: '🚆', label: 'Потяг' },
        { key: 'airplane', icon: '✈️', label: 'Літак' },
        { key: 'bus', icon: '🚌', label: 'Автобус' },
        { key: 'city', icon: '🚋', label: 'Міський' },
    ];

    return (
        <div className="travel-page">
            <header className="travel-header">
                <button type="button" onClick={() => window.history.back()} className="travel-icon-btn" aria-label="Назад">
                    ‹
                </button>
                <h1>Транспорт і подорожі</h1>
                <button type="button" className="travel-icon-btn" aria-label="Історія">
                    🕒
                </button>
            </header>

            <div className="travel-container">
                <div className="travel-tabs" role="tablist" aria-label="Види транспорту">
                    {tabItems.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className={`travel-tab-chip ${activeTab === item.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.key)}
                            role="tab"
                            aria-selected={activeTab === item.key}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>

                <div className="travel-content">
                    {uahAccounts.length === 0 ? (
                        <div className="travel-error">Немає доступних UAH-рахунків для оплати транспорту.</div>
                    ) : (
                        <>
                            {activeTab === 'train' && <TrainForm accounts={uahAccounts} />}
                            {activeTab === 'airplane' && <AirplaneForm accounts={uahAccounts} />}
                            {activeTab === 'bus' && <BusForm accounts={uahAccounts} />}
                            {activeTab === 'city' && <CityTransportForm accounts={uahAccounts} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransportHub;
