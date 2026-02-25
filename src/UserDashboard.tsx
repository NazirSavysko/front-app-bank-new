import React, {useCallback, useEffect, useRef, useState} from 'react';
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import AccountsSection from './selections/account/AccountsSection.tsx';
import TransactionsSection from './selections/transation/TransactionsSection.tsx';
import PaymentsSection from './selections/payment/PaymentsSection.tsx';
import TransfersSection from './selections/transfer/TransfersSection.tsx';
import AnalyticsSection from './selections/analytic/AnalyticsSection.tsx';
import type {CustomerData} from './types';
import './UserDashboard.css';

const AccountsSection = lazy(() => import('./selections/account/AccountsSection.tsx'));
const TransactionsSection = lazy(() => import('./selections/transation/TransactionsSection.tsx'));
const PaymentsSection = lazy(() => import('./selections/payment/PaymentsSection.tsx'));
const TransfersSection = lazy(() => import('./selections/transfer/TransfersSection.tsx'));
const AnalyticsSection = lazy(() => import('./selections/analytic/AnalyticsSection.tsx'));

const UserDashboard: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState<CustomerData | null>(() => {
        try {
            const saved = localStorage.getItem('customerData');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(() => !localStorage.getItem('customerData'));
    const [error, setError] = useState('');
    // Removed selectedTab state

    const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [newAccountType, setNewAccountType] = useState('UAH');
    const [accountError, setAccountError] = useState('');
    const [copyMessage, setCopyMessage] = useState('');

    const clearTransactionsCache = () => {
        const prefix = 'transactionsCache:';
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(prefix)) localStorage.removeItem(key);
        });
    };

    // Transaction filters
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all');

    // Analytics filters
    const [selectedAnalyticsAccount, setSelectedAnalyticsAccount] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Refresh interval state -> Handled by React Query refetchInterval

    // Fetch customer data
    const fetchCustomerData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
            const res = await fetch('/api/customers/customer', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : ''
                }
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({} as { message?: string }));
                if (res.status === 401 || res.status === 403) {
                    sessionStorage.removeItem('accessToken');
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('customerData');
                    navigate('/login'); // Redirect to login on auth error
                }
                const msg = body.message || 'Не вдалося отримати дані користувача';
                setError(`❌ ${msg}`);
                return;
            }
            const data: CustomerData = await res.json();
            setCustomer(data);
            localStorage.setItem('customerData', JSON.stringify(data));
            setSelectedAccountIndex(prev => (prev >= data.accounts.length ? 0 : prev));
        } catch {
            if (!silent) setError('❌ Помилка з\'єднання з сервером');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [navigate]);

    // Auto Refresh -> Handled by React Query refetchInterval

    // Refresh data when navigating to transactions
    useEffect(() => {
        if (location.pathname.includes('transactions') && customer) {
            fetchCustomerData(true);
            lastActivityRef.current = new Date();
        }
    }, [location.pathname, customer, fetchCustomerData]);

    // Auto Refresh remains same...
    useEffect(() => {
        if (!customer) return;
        const startAutoRefresh = () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = setInterval(() => {
                const now = new Date();
                const timeSinceLastActivity = now.getTime() - lastActivityRef.current.getTime();
                // If inactive for 5 minutes, stop auto-refresh
                if (timeSinceLastActivity > 5 * 60 * 1000) {
                    if (refreshIntervalRef.current) {
                        clearInterval(refreshIntervalRef.current);
                        refreshIntervalRef.current = null;
                    }
                    return;
                }
                fetchCustomerData(true);
            }, 30000); // 30 seconds
        };

        const handleActivity = () => {
             lastActivityRef.current = new Date();
             if (!refreshIntervalRef.current) startAutoRefresh();
        };

        window.addEventListener('click', handleActivity);
        window.addEventListener('keypress', handleActivity);
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('scroll', handleActivity);

        startAutoRefresh();

        return () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('keypress', handleActivity);
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('scroll', handleActivity);
        };
    }, [customer, fetchCustomerData]);


    const handleAddAccount = async () => {
        // ...existing code...
        if (accountCreating) return;
        setAccountCreating(true);
        setAccountError('');
        try {
            const token = sessionStorage.getItem('accessToken');
            const res = await fetch('/api/accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    currency: newAccountType,
                    accountType: 'CURRENT'
                })
            });
            if (res.ok) {
                await fetchCustomerData(true);
                setShowAddModal(false);
                // Switch to accounts tab if not already there
                navigate('/dashboard/accounts');
            } else {
                const data = await res.json();
                setAccountError(`❌ ${data.message || 'Помилка створення рахунку'}`);
            }
        } catch {
            setAccountError('❌ Помилка з\'єднання');
        } finally {
            setAccountCreating(false);
        }
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
        setAccountError('');
    };

    // Removed handleTabSelect

    // Removed renderCurrentTab and useEffect for lastActiveTab

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
                        <button className="btn btn-primary" onClick={() => queryClient.resetQueries({ queryKey: ['customer'] })}>Спробувати знову
                        </button>
                    </div>
                )}
                {!loading && !error && customer && (
                    <div className="dashboard-grid">
                        <div className="dashboard-section">
                            {/* Section Title Logic - replicating previous behavior */}
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
                                        onCopy={(msg) => setCopyMessage(msg)}
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
                                            await fetchCustomerData(true);
                                        }}
                                        onCopy={(msg) => setCopyMessage(msg)}
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
                                        onBack={() => navigate('/dashboard/transactions')}
                                    />
                                } />
                                <Route path="*" element={<Navigate to="/dashboard/accounts" replace />} />
                            </Routes>
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
                                clearTransactionsCache();
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
                            <button className="btn btn-primary" onClick={handleAddAccount} disabled={accountCreating}>
                                {accountCreating && <div className="loading-spinner"></div>}
                                {accountCreating ? 'Створення...' : 'Створити рахунок'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;

