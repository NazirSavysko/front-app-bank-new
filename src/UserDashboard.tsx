import React, {useEffect, useState, lazy, Suspense} from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {CustomerData} from './types';
import './UserDashboard.css';

const AccountsSection = lazy(() => import('./selections/account/AccountsSection.tsx'));
const TransactionsSection = lazy(() => import('./selections/transation/TransactionsSection.tsx'));
const PaymentsSection = lazy(() => import('./selections/payment/PaymentsSection.tsx'));
const TransfersSection = lazy(() => import('./selections/transfer/TransfersSection.tsx'));
const AnalyticsSection = lazy(() => import('./selections/analytic/AnalyticsSection.tsx'));

const UserDashboard: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // React Query for Customer Data
    const { data: customer, isLoading: loading, isError, error, refetch: refetchCustomer } = useQuery<CustomerData>({
        queryKey: ['customer'],
        queryFn: async () => {
            const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
            const res = await fetch('/api/customers/customer', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : ''
                }
            });
            if (!res.ok) {
                 if (res.status === 401 || res.status === 403) {
                    sessionStorage.removeItem('accessToken');
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('customerData');
                    navigate('/login');
                    throw new Error('Unauthorized');
                }
                const body = await res.json().catch(() => ({} as { message?: string }));
                throw new Error(body.message || 'Не вдалося отримати дані користувача');
            }
            return res.json();
        },
        staleTime: 60000, // 1 minute stale time
        refetchInterval: 30000, // Auto refresh every 30 seconds
    });

    const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [newAccountType, setNewAccountType] = useState('UAH');
    const [accountError, setAccountError] = useState('');
    const [copyMessage, setCopyMessage] = useState('');

    // Transaction filters
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all');

    // Analytics filters
    const [selectedAnalyticsAccount, setSelectedAnalyticsAccount] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());


    // Mutation for adding account
    const createAccountMutation = useMutation({
        mutationFn: async (currency: string) => {
             const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
            const res = await fetch('/api/accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    currency: currency,
                    accountType: 'CURRENT'
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Помилка створення рахунку');
            }
            return res.json();
        },
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['customer'] });
             setShowAddModal(false);
             navigate('/dashboard/accounts');
        },
        onError: (err: Error) => {
             setAccountError(`❌ ${err.message}`);
        }
    });

    const handleAddAccount = async () => {
        if (createAccountMutation.isPending) return;
        setAccountError('');
        createAccountMutation.mutate(newAccountType);
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
        setAccountError('');
    };

    // Initialize analytics account remains same
    useEffect(() => {
        if (customer?.accounts.length && !selectedAnalyticsAccount) {
            setSelectedAnalyticsAccount(customer.accounts[0].accountNumber);
        }
    }, [customer, selectedAnalyticsAccount]);

    return (
        <div className="user-dashboard">
            {copyMessage && <div className={`toast show`}>{copyMessage}</div>}
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <div className="dashboard-header-content">
                        <div className="dashboard-info">
                            <h1 className="dashboard-title">
                                Вітаємо, {customer ? `${customer.firstName} ${customer.lastName}` : 'Користувач'}!
                            </h1>
                            <p className="dashboard-subtitle">Керуйте своїми фінансами легко та безпечно</p>
                        </div>
                        <div className="dashboard-actions">
                            <button className="profile-button" onClick={() => setShowProfile(!showProfile)}
                                    aria-label="Відкрити профіль">
                                <div className="profile-avatar">
                                    {customer ? `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase() : 'U'}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="dashboard-tabs">
                     <NavLink to="/dashboard/accounts" className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
                        Рахунки
                    </NavLink>
                    <NavLink to="/dashboard/transactions" className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
                        Транзакції
                    </NavLink>
                    <NavLink to="/dashboard/payments" className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
                        Платежі
                    </NavLink>
                    <NavLink to="/dashboard/transfers" className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
                        Перекази
                    </NavLink>
                </div>
                {loading && (
                    <div className="loading">
                        <div className="spinner"></div>
                        <span>Завантаження даних...</span>
                    </div>
                )}
                {isError && (
                    <div className="dashboard-section">
                        <div className="error-message">❌ {(error as Error).message}</div>
                        <button className="btn btn-primary" onClick={() => refetchCustomer()}>Спробувати знову
                        </button>
                    </div>
                )}
                {!loading && !isError && customer && (
                    <div className="dashboard-grid">
                        <div className="dashboard-section">
                            {/* Section Title Logic - replicating previous behavior */}
                            <Suspense fallback={<div className="loading-section">Loading section...</div>}>
                            <Routes>
                                <Route path="accounts" element={<h2 className="section-title">Мої рахунки</h2>} />
                                <Route path="payments" element={<h2 className="section-title">Платежі</h2>} />
                                <Route path="transfers" element={<h2 className="section-title">Перекази</h2>} />
                                <Route path="analytics" element={<h2 className="section-title">Аналітика</h2>} />
                                <Route path="*" element={null} />
                            </Routes>

                            <Routes>
                                <Route path="accounts" element={
                                    <AccountsSection
                                        accounts={customer.accounts}
                                        selectedIndex={selectedAccountIndex}
                                        onSelect={setSelectedAccountIndex}
                                        onAddAccount={() => setShowAddModal(true)}
                                        onCopy={(msg: string) => setCopyMessage(msg)}
                                    />
                                } />
                                <Route path="transactions" element={
                                    <TransactionsSection
                                        accounts={customer.accounts}
                                        selectedAccountIndex={selectedAccountIndex}
                                        setSelectedAccountIndex={setSelectedAccountIndex}
                                        filterStartDate={filterStartDate}
                                        setFilterStartDate={setFilterStartDate}
                                        filterEndDate={filterEndDate}
                                        setFilterEndDate={setFilterEndDate}
                                        filterType={filterType}
                                        setFilterType={setFilterType}
                                        onAnalytics={() => navigate('/dashboard/analytics')}
                                    />
                                } />
                                <Route path="payments" element={
                                    <PaymentsSection
                                        accounts={customer.accounts}
                                        selectedAccountIndex={selectedAccountIndex}
                                    />
                                } />
                                <Route path="transfers" element={
                                    <TransfersSection
                                        customer={customer}
                                        onTransferComplete={async () => {
                                             await refetchCustomer();
                                        }}
                                        onCopy={(msg: string) => setCopyMessage(msg)}
                                    />
                                } />
                                <Route path="analytics" element={
                                    <AnalyticsSection
                                        customer={customer}
                                        selectedAnalyticsAccount={selectedAnalyticsAccount}
                                        setSelectedAnalyticsAccount={setSelectedAnalyticsAccount}
                                        selectedMonth={selectedMonth}
                                        setSelectedMonth={setSelectedMonth}
                                        selectedYear={selectedYear}
                                        setSelectedYear={setSelectedYear}
                                        onBack={() => navigate('/dashboard/accounts')}
                                     />
                                } />
                                <Route path="*" element={<Navigate to="accounts" replace />} />
                            </Routes>
                            </Suspense>
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Sidebar */}
            <div className={`profile-overlay ${showProfile ? 'open' : ''}`} onClick={() => setShowProfile(false)}></div>
            <div className={`profile-panel ${showProfile ? 'open' : ''}`}>
                <div className="profile-header">
                    <div className="profile-avatar large">
                        {customer ? `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase() : 'U'}
                    </div>
                    <h3>Профіль користувача</h3>
                </div>
                <div className="profile-content">
                    {customer && (
                        <div className="profile-info">
                            <div className="info-item">
                                <label>Ім'я:</label>
                                <span>{customer.firstName}</span>
                            </div>
                            <div className="info-item">
                                <label>Прізвище:</label>
                                <span>{customer.lastName}</span>
                            </div>
                            <div className="info-item">
                                <label>пошта:</label>
                                <span>{customer.email}</span>
                            </div>
                            <div className="info-item">
                                <label>Телефон:</label>
                                <span>{customer.phoneNumber}</span>
                            </div>
                        </div>
                    )}
                    <div className="profile-actions">
                        <button className="btn btn-secondary" onClick={() => setShowProfile(false)}>Закрити</button>
                        <button
                            className="btn btn-danger"
                            onClick={() => {
                                sessionStorage.removeItem('accessToken');
                                localStorage.removeItem('accessToken');
                                localStorage.removeItem('lastActiveTab');
                                localStorage.removeItem('customerData');
                                navigate('/login');
                            }}
                        >
                            Вийти
                        </button>
                    </div>
                </div>
            </div>

            {/* Add account modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content add-account-modal">
                        <div className="modal-header">
                            <h3 className="modal-title">Створити новий рахунок</h3>
                            <button className="modal-close" onClick={handleCloseAddModal}
                                    aria-label="Закрити модальне вікно">
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Тип валюти:</label>
                                <div className="currency-options" role="group" aria-label="Вибір валюти">
                                    <button
                                        type="button"
                                        className={`currency-option ${newAccountType === 'UAH' ? 'selected' : ''}`}
                                        onClick={() => setNewAccountType('UAH')}
                                        aria-pressed={newAccountType === 'UAH'}
                                    >
                                        <span className="currency-badge-large">₴</span>
                                        <div className="currency-texts">
                                            <span className="currency-name">Гривня</span>
                                            <span className="currency-code">UAH</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`currency-option ${newAccountType === 'USD' ? 'selected' : ''}`}
                                        onClick={() => setNewAccountType('USD')}
                                        aria-pressed={newAccountType === 'USD'}
                                    >
                                        <span className="currency-badge-large">$</span>
                                        <div className="currency-texts">
                                            <span className="currency-name">Долар США</span>
                                            <span className="currency-code">USD</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`currency-option ${newAccountType === 'EUR' ? 'selected' : ''}`}
                                        onClick={() => setNewAccountType('EUR')}
                                        aria-pressed={newAccountType === 'EUR'}
                                    >
                                        <span className="currency-badge-large">€</span>
                                        <div className="currency-texts">
                                            <span className="currency-name">Євро</span>
                                            <span className="currency-code">EUR</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                            {accountError && (
                                <div className="error-banner" role="alert">
                                    <span className="error-icon">⚠️</span>
                                    <span className="error-text">{accountError.replace('❌ ', '')}</span>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={handleCloseAddModal}>Скасувати</button>
                            <button className="btn btn-primary" onClick={handleAddAccount} disabled={createAccountMutation.isPending}>
                                {createAccountMutation.isPending && <div className="loading-spinner"></div>}
                                {createAccountMutation.isPending ? 'Створення...' : 'Створити рахунок'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;

