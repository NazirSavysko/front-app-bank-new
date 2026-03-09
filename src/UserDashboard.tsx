import React, {useEffect, useState, lazy, Suspense} from 'react';
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {AccountCurrency, AccountType} from './types';
import './UserDashboard.css';
import {createAccount} from "./api.ts";
import SectionErrorBoundary from './components/SectionErrorBoundary';
import { useAccounts } from './hooks/useAccounts';

const AccountsSection = lazy(() => import('./selections/account/AccountsSection.tsx'));
const TransactionsSection = lazy(() => import('./selections/transation/TransactionsSection.tsx'));
const PaymentsSection = lazy(() => import('./selections/payment/PaymentsSection.tsx'));
const TransfersSection = lazy(() => import('./selections/transfer/TransfersSection.tsx'));
const AnalyticsSection = lazy(() => import('./selections/analytic/AnalyticsSection.tsx'));

type DashboardNavIconName = 'accounts' | 'transfers' | 'payments' | 'history' | 'analytics';

const DashboardNavIcon: React.FC<{ name: DashboardNavIconName }> = ({ name }) => {
    switch (name) {
        case 'accounts':
            return (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="3"></rect>
                    <path d="M3 10h18"></path>
                    <path d="M7 15h4"></path>
                </svg>
            );
        case 'transfers':
            return (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 7h11"></path>
                    <path d="M14 4l4 3-4 3"></path>
                    <path d="M17 17H6"></path>
                    <path d="M10 14l-4 3 4 3"></path>
                </svg>
            );
        case 'payments':
            return (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3v18"></path>
                    <path d="M17 7.5c0-1.9-2.2-3.5-5-3.5S7 5.6 7 7.5 9.2 11 12 11s5 1.6 5 3.5S14.8 18 12 18s-5-1.6-5-3.5"></path>
                </svg>
            );
        case 'history':
            return (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 3-6.7"></path>
                    <path d="M3 4v5h5"></path>
                    <path d="M12 7v5l3 2"></path>
                </svg>
            );
        case 'analytics':
            return (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 19V9"></path>
                    <path d="M12 19V5"></path>
                    <path d="M19 19v-7"></path>
                </svg>
            );
        default:
            return null;
    }
};

const dashboardNavItems: Array<{ to: string; label: string; icon: DashboardNavIconName }> = [
    { to: '/dashboard/accounts', label: 'Рахунки', icon: 'accounts' },
    { to: '/dashboard/transfers', label: 'Перекази', icon: 'transfers' },
    { to: '/dashboard/payments', label: 'Платежі', icon: 'payments' },
    { to: '/dashboard/transactions', label: 'Історія', icon: 'history' },
    { to: '/dashboard/analytics', label: 'Аналітика', icon: 'analytics' },
];

const UserDashboard: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const {
        customer,
        accounts,
        isLoading: loading,
        error,
        refetch: refetchCustomer,
    } = useAccounts();
    const isError = Boolean(error);

    const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [newAccountType, setNewAccountType] = useState<AccountType>('CURRENT');
    const [newAccountCurrency, setNewAccountCurrency] = useState<AccountCurrency>('UAH');
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
        mutationFn: (payload: { accountType: AccountType; currency: AccountCurrency }) => createAccount(payload),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['customer'] });
             setShowAddModal(false);
             setNewAccountType('CURRENT');
             setNewAccountCurrency('UAH');
             navigate('/dashboard/accounts');
        },
        onError: (err: Error) => {
             setAccountError(`❌ ${err.message}`);
        }
    });

    const handleAddAccount = async () => {
        if (createAccountMutation.isPending) return;
        setAccountError('');
        createAccountMutation.mutate({
            accountType: newAccountType,
            currency: newAccountType === 'FOP' ? 'UAH' : newAccountCurrency,
        });
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
        setAccountError('');
        setNewAccountType('CURRENT');
        setNewAccountCurrency('UAH');
    };

    useEffect(() => {
        if (newAccountType === 'FOP') {
            setNewAccountCurrency('UAH');
        }
    }, [newAccountType]);

    // Initialize analytics account remains same
    useEffect(() => {
        if (accounts.length && !selectedAnalyticsAccount) {
            setSelectedAnalyticsAccount(accounts[0].accountNumber);
        }
    }, [accounts, selectedAnalyticsAccount]);

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
                    {dashboardNavItems.map((item) => (
                        <NavLink key={item.to} to={item.to} className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}>
                            {item.label}
                        </NavLink>
                    ))}
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
                            <SectionErrorBoundary
                                resetKey={location.pathname}
                                onRetry={() => {
                                    void refetchCustomer();
                                }}
                            >
                                <Suspense fallback={<div className="loading-section">Loading section...</div>}>
                                    <Routes>
                                        <Route path="accounts" element={<h2 className="section-title">Мої рахунки</h2>} />
                                        <Route path="payments/*" element={<h2 className="section-title">Платежі</h2>} />
                                        <Route path="transfers" element={<h2 className="section-title">Перекази</h2>} />
                                        <Route path="analytics" element={<h2 className="section-title">Аналітика</h2>} />
                                        <Route path="*" element={null} />
                                    </Routes>

                                    <Routes>
                                        <Route path="accounts" element={
                                            <AccountsSection
                                                accounts={accounts}
                                                selectedIndex={selectedAccountIndex}
                                                onSelect={setSelectedAccountIndex}
                                                onAddAccount={() => setShowAddModal(true)}
                                                onCopy={(msg: string) => setCopyMessage(msg)}
                                            />
                                        } />
                                        <Route path="transactions" element={
                                            <TransactionsSection
                                                accounts={accounts}
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
                                        <Route path="payments/*" element={
                                            <PaymentsSection
                                                accounts={accounts}
                                                selectedAccountIndex={selectedAccountIndex}
                                                setSelectedAccountIndex={setSelectedAccountIndex}
                                            />
                                        } />
                                        <Route path="transfers" element={
                                            customer ? (
                                                <TransfersSection
                                                    customer={customer}
                                                    onTransferComplete={async () => {
                                                        await refetchCustomer();
                                                    }}
                                                    onCopy={(msg: string) => setCopyMessage(msg)}
                                                    selectedAccountIndex={selectedAccountIndex}
                                                    setSelectedAccountIndex={setSelectedAccountIndex}
                                                />
                                            ) : null
                                        } />
                                        <Route path="analytics" element={
                                            customer ? (
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
                                            ) : null
                                        } />
                                        <Route path="*" element={<Navigate to="accounts" replace />} />
                                    </Routes>
                                </Suspense>
                            </SectionErrorBoundary>
                        </div>
                    </div>
            )}

            <nav className="dashboard-bottom-nav" aria-label="Основна навігація">
                {dashboardNavItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `dashboard-bottom-nav__link ${isActive ? 'active' : ''}`}
                    >
                        <span className="dashboard-bottom-nav__icon">
                            <DashboardNavIcon name={item.icon} />
                        </span>
                        <span className="dashboard-bottom-nav__label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
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
                                <label className="form-label">Тип рахунку:</label>
                                <div className="currency-options" role="group" aria-label="Вибір типу рахунку">
                                    <button
                                        type="button"
                                        className={`currency-option ${newAccountType === 'CURRENT' ? 'selected' : ''}`}
                                        onClick={() => setNewAccountType('CURRENT')}
                                        aria-pressed={newAccountType === 'CURRENT'}
                                    >
                                        <span className="currency-badge-large">₴</span>
                                        <div className="currency-texts">
                                            <span className="currency-name">Особистий рахунок</span>
                                            <span className="currency-code">CURRENT</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`currency-option ${newAccountType === 'FOP' ? 'selected' : ''} business`}
                                        onClick={() => setNewAccountType('FOP')}
                                        aria-pressed={newAccountType === 'FOP'}
                                    >
                                        <span className="currency-badge-large">ФОП</span>
                                        <div className="currency-texts">
                                            <span className="currency-name">ФОП (Бізнес-рахунок)</span>
                                            <span className="currency-code">FOP</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="account-currency-select">Валюта рахунку:</label>
                                <select
                                    id="account-currency-select"
                                    className="account-currency-select"
                                    value={newAccountCurrency}
                                    onChange={(e) => setNewAccountCurrency(e.target.value as AccountCurrency)}
                                    disabled={newAccountType === 'FOP'}
                                    aria-disabled={newAccountType === 'FOP'}
                                >
                                    <option value="UAH">UAH</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                                {newAccountType === 'FOP' && (
                                    <div className="account-currency-hint">
                                        Для ФОП-рахунку доступна лише валюта UAH.
                                    </div>
                                )}
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
