import React, {useCallback, useEffect, useRef, useState} from 'react';
import AccountsSection from './selections/account/AccountsSection.tsx';
import TransactionsSection from './selections/transation/TransactionsSection.tsx';
import PaymentsSection from './selections/payment/PaymentsSection.tsx';
import TransfersSection from './selections/transfer/TransfersSection.tsx';
import AnalyticsSection from './selections/analytic/AnalyticsSection.tsx';
import type {CustomerData, Account} from './types';
import './UserDashboard.css';

const UserDashboard: React.FC = () => {
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
    const [selectedTab, setSelectedTab] =
        useState<'accounts' | 'transactions' | 'payments' | 'transfers' | 'analytics'>(() => {
            return (localStorage.getItem('lastActiveTab') as 'accounts' | 'transactions' | 'payments' | 'transfers' | 'analytics') || 'accounts';
        });
    const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [newAccountType, setNewAccountType] = useState('UAH');
    const [accountCreating, setAccountCreating] = useState(false);
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

    // Refresh interval state
    const refreshIntervalRef = useRef<number | null>(null);
    const lastActivityRef = useRef<Date>(new Date());

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
    }, []);

    useEffect(() => {
        const hasCache = !!localStorage.getItem('customerData');
        fetchCustomerData(hasCache);
    }, [fetchCustomerData]);

    // Auto Refresh
    useEffect(() => {
        if (!customer) return;
        const startAutoRefresh = () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = setInterval(() => {
                const now = new Date();
                const timeSinceLast = now.getTime() - lastActivityRef.current.getTime();
                const fiveMinutes = 5 * 60 * 1000;
                if (timeSinceLast < fiveMinutes) {
                    fetchCustomerData(true);
                }
            }, 30000);
        };
        startAutoRefresh();
        return () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        };
    }, [customer, fetchCustomerData]);

    // Visibility change refresh
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && customer) {
                lastActivityRef.current = new Date();
                fetchCustomerData(true);
            }
        };
        const handleFocus = () => {
            if (customer) {
                lastActivityRef.current = new Date();
                fetchCustomerData(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [customer, fetchCustomerData]);

    // Activity tracker
    useEffect(() => {
        const updateActivity = () => (lastActivityRef.current = new Date());
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(evt => document.addEventListener(evt, updateActivity, {passive: true}));
        return () => {
            events.forEach(evt => document.removeEventListener(evt, updateActivity));
        };
    }, []);

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

    const handleAddAccount = async () => {
        setAccountCreating(true);
        setAccountError('');
        try {
            const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
            const res = await fetch('/api/accounts/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({accountType: newAccountType})
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({} as { message?: string }));
                const msg = body.message || 'Не вдалося створити рахунок';
                setAccountError(`❌ ${msg}`);
                setAccountCreating(false);
                return;
            }
            const createdAccount: Account = await res.json();
            setCustomer(prev => {
                if (!prev) return prev;
                const updated = {...prev, accounts: [...prev.accounts, createdAccount]};
                setSelectedAccountIndex(updated.accounts.length - 1);
                return updated;
            });
            setShowAddModal(false);
            setCopyMessage('Рахунок створено');
            setNewAccountType('UAH');
            setAccountError('');
        } catch {
            setAccountError('❌ Помилка з\'єднання з сервером');
        } finally {
            setAccountCreating(false);
        }
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
        setNewAccountType('UAH');
        setAccountError('');
        setAccountCreating(false);
    };

    const handleTabSelect = useCallback(
        (tab: 'accounts' | 'transactions' | 'payments' | 'transfers' | 'analytics') => {
            setSelectedTab(tab);
            lastActivityRef.current = new Date();
            if (tab === 'transactions' && customer) {
                fetchCustomerData(true);
            }
        },
        [customer, fetchCustomerData]
    );

    const renderCurrentTab = () => {
        if (!customer) return null;
        switch (selectedTab) {
            case 'accounts':
                return (
                    <AccountsSection
                        accounts={customer.accounts}
                        selectedIndex={selectedAccountIndex}
                        onSelect={setSelectedAccountIndex}
                        onAddAccount={() => setShowAddModal(true)}
                        onCopy={(msg) => setCopyMessage(msg)}
                    />
                );
            case 'transactions':
                return (
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
                );
            case 'payments':
                return (
                    <PaymentsSection
                        accounts={customer.accounts}
                        selectedAccountIndex={selectedAccountIndex}
                    />
                );
            case 'transfers':
                return (
                    <TransfersSection
                        customer={customer}
                        onTransferComplete={async () => {
                            await fetchCustomerData(true);
                        }}
                        onCopy={(msg) => setCopyMessage(msg)}
                    />
                );
            case 'analytics':
                return (
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
                );
            default:
                return null;
        }
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
                {error && (
                    <div className="dashboard-section">
                        <div className="error-message">{error}</div>
                        <button className="btn btn-primary" onClick={() => fetchCustomerData(false)}>Спробувати знову
                        </button>
                    </div>
                )}
                {!loading && !error && (
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

