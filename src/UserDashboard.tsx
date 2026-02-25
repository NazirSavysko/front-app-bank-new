import React, {useCallback, useEffect, useState, Suspense, lazy} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCustomerData, createAccount } from './api';
import type {CustomerData} from './types';
import './UserDashboard.css';

const AccountsSection = lazy(() => import('./selections/account/AccountsSection.tsx'));
const TransactionsSection = lazy(() => import('./selections/transation/TransactionsSection.tsx'));
const PaymentsSection = lazy(() => import('./selections/payment/PaymentsSection.tsx'));
const TransfersSection = lazy(() => import('./selections/transfer/TransfersSection.tsx'));
const AnalyticsSection = lazy(() => import('./selections/analytic/AnalyticsSection.tsx'));

const UserDashboard: React.FC = () => {
    const queryClient = useQueryClient();
    const { data: customer, isLoading: loading, error, isError } = useQuery({
        queryKey: ['customer'],
        queryFn: fetchCustomerData,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchInterval: 30000,   // Auto refresh every 30s
        refetchOnWindowFocus: true,
    });

    const [selectedTab, setSelectedTab] =
        useState<'accounts' | 'transactions' | 'payments' | 'transfers' | 'analytics'>(() => {
            return (localStorage.getItem('lastActiveTab') as 'accounts' | 'transactions' | 'payments' | 'transfers' | 'analytics') || 'accounts';
        });
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

    // Fetch customer data -> Handled by React Query useQuery

    // Auto Refresh -> Handled by React Query refetchInterval

    // Visibility change refresh -> Handled by React Query refetchOnWindowFocus

    // Activity tracker -> Removed manual tracker as React Query handles focus refresh nicely.
    // However, if we want to refresh on user interaction (mousemove/cilck), React Query doesn't do that by default.
    // But usually window focus is enough. The original code refreshed on mousemove effectively keeping data fresh if user is active.
    // refetchInterval is better for this.

   const { mutate: createAccountMutation, isPending: accountCreating } = useMutation({
        mutationFn: createAccount,
        onSuccess: (newAccount) => {
            queryClient.setQueryData(['customer'], (old: CustomerData | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    accounts: [...old.accounts, newAccount]
                };
            });
            setSelectedAccountIndex(() => (customer?.accounts.length || 0)); // Select new account
            setShowAddModal(false);
            setCopyMessage('Рахунок створено');
            setNewAccountType('UAH');
            setAccountError('');
        },
        onError: (err: Error) => {
             setAccountError(`❌ ${err.message}`);
        }
    });

    useEffect(() => {
        if (!copyMessage) return;
        const timer = setTimeout(() => setCopyMessage(''), 3000);
        return () => clearTimeout(timer);
    }, [copyMessage]);

    useEffect(() => {
        if (showAddModal) {
            setAccountError('');
            setNewAccountType('UAH');
        }
    }, [showAddModal]);

    const handleAddAccount = () => {
        createAccountMutation(newAccountType);
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
        setNewAccountType('UAH');
        setAccountError('');
    };

    const handleTabSelect = useCallback(
        (tab: 'accounts' | 'transactions' | 'payments' | 'transfers' | 'analytics') => {
            setSelectedTab(tab);
            if (tab === 'transactions') {
                queryClient.invalidateQueries({ queryKey: ['customer'] });
            }
        },
        [queryClient]
    );

    const renderCurrentTab = () => {
        if (!customer) return null;
        return (
            <Suspense fallback={<div className="tab-loading">Завантаження вкладки...</div>}>
                {selectedTab === 'accounts' && (
                    <AccountsSection
                        accounts={customer.accounts}
                        selectedIndex={selectedAccountIndex}
                        onSelect={setSelectedAccountIndex}
                        onAddAccount={() => setShowAddModal(true)}
                        onCopy={(msg) => setCopyMessage(msg)}
                    />
                )}
                {selectedTab === 'transactions' && (
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
                        onAnalytics={() => setSelectedTab('analytics')}
                    />
                )}
                {selectedTab === 'payments' && (
                     <PaymentsSection
                        accounts={customer.accounts}
                        selectedAccountIndex={selectedAccountIndex}
                    />
                )}
                {selectedTab === 'transfers' && (
                    <TransfersSection
                        customer={customer}
                        onTransferComplete={async () => {
                            await queryClient.invalidateQueries({ queryKey: ['customer'] });
                        }}
                        onCopy={(msg) => setCopyMessage(msg)}
                    />
                )}
                {selectedTab === 'analytics' && (
                    <AnalyticsSection
                        customer={customer}
                        selectedAnalyticsAccount={selectedAnalyticsAccount}
                        setSelectedAnalyticsAccount={setSelectedAnalyticsAccount}
                        selectedMonth={selectedMonth}
                        setSelectedMonth={setSelectedMonth}
                        selectedYear={selectedYear}
                        setSelectedYear={setSelectedYear}
                        onBack={() => setSelectedTab('transactions')}
                    />
                )}
            </Suspense>
        );
    };

    useEffect(() => {
        localStorage.setItem('lastActiveTab', selectedTab);
    }, [selectedTab]);

    // Initialize analytics account
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
                    <button className={`tab-button ${selectedTab === 'accounts' ? 'active' : ''}`}
                            onClick={() => handleTabSelect('accounts')}>Рахунки
                    </button>
                    <button className={`tab-button ${selectedTab === 'transactions' ? 'active' : ''}`}
                            onClick={() => handleTabSelect('transactions')}>Транзакції
                    </button>
                    <button className={`tab-button ${selectedTab === 'payments' ? 'active' : ''}`}
                            onClick={() => handleTabSelect('payments')}>Платежі
                    </button>
                    <button className={`tab-button ${selectedTab === 'transfers' ? 'active' : ''}`}
                            onClick={() => handleTabSelect('transfers')}>Перекази
                    </button>
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
                {!loading && !isError && (
                    <div className="dashboard-grid">
                        <div className="dashboard-section">
                            {selectedTab !== 'transactions' && (
                                <h2 className="section-title">
                                    {selectedTab === 'accounts' && 'Мої рахунки'}
                                    {selectedTab === 'payments' && 'Платежі'}
                                    {selectedTab === 'transfers' && 'Перекази'}
                                    {selectedTab === 'analytics' && 'Аналітика'}
                                </h2>
                            )}
                            {renderCurrentTab()}
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
                                queryClient.clear();
                                window.location.reload();
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

