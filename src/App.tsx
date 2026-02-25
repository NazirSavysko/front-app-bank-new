import { useState, useEffect, Suspense, lazy } from 'react';
import './App.css';

const LoginForm = lazy(() => import('./log-in/LoginForm').then(module => ({ default: module.LoginForm })));
const RegisterForm = lazy(() => import('./RegisterForm').then(module => ({ default: module.RegisterForm })));
const VerifyEmailForm = lazy(() => import('./VerifyEmailForm').then(module => ({ default: module.VerifyEmailForm })));
const ForgotPasswordForm = lazy(() => import('./ForgotPasswordForm').then(module => ({ default: module.ForgotPasswordForm })));
const UserDashboard = lazy(() => import('./UserDashboard'));

function App() {
    type Page = 'login' | 'register' | 'verify' | 'forgot' | 'user' | 'admin';
    const [page, setPage] = useState<Page>(() => {
        const sessionToken = sessionStorage.getItem('accessToken');
        const localToken = localStorage.getItem('accessToken');
        return sessionToken || localToken ? 'user' : 'login';
    });
    const [emailToVerify, setEmailToVerify] = useState('');

    useEffect(() => {
        const sessionToken = sessionStorage.getItem('accessToken');
        const localToken = localStorage.getItem('accessToken');
        if (!sessionToken && localToken) {
            sessionStorage.setItem('accessToken', localToken);
            localStorage.removeItem('accessToken');
        }
        if (!sessionStorage.getItem('accessToken')) {
            localStorage.removeItem('customerData');
            localStorage.removeItem('lastActiveTab');
            const prefix = 'transactionsCache:';
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(prefix)) localStorage.removeItem(key);
            });
        }
    }, []);

    const handleLoginSuccess = (role: string) => {
        if (role && role.toUpperCase().includes('ADMIN')) {
            setPage('admin');
        } else {
            setPage('user');
        }
    };

    const handleRegisterComplete = (email: string) => {
        setEmailToVerify(email);
        setPage('verify');
    };

    const handleVerificationSuccess = () => {
        setPage('login');
    };

    const handleResetSuccess = () => {
        setPage('login');
    };

    useEffect(() => {
        const cls = 'orientation-lock-open';
        if (page === 'user') {
            document.body.classList.add(cls);
        } else {
            document.body.classList.remove(cls);
        }
        return () => document.body.classList.remove(cls);
    }, [page]);

    return (
        <Suspense fallback={<div className="loading-screen">Завантаження...</div>}>
            {page === 'login' && (
                <LoginForm
                    onLogin={handleLoginSuccess}
                    onRegisterLink={() => setPage('register')}
                    onForgotLink={() => setPage('forgot')}
                />
            )}
            {page === 'register' && (
                <RegisterForm
                    onRegisterComplete={handleRegisterComplete}
                    onBack={() => setPage('login')}
                />
            )}
            {page === 'verify' && (
                <VerifyEmailForm
                    email={emailToVerify}
                    onVerified={handleVerificationSuccess}
                    onBack={() => setPage('login')}
                />
            )}
            {page === 'forgot' && (
                <ForgotPasswordForm
                    onBack={() => setPage('login')}
                    onReset={handleResetSuccess}
                />
            )}
            {page === 'user' && (
                <>
                    <div className="orientation-lock">
                        <div className="orientation-box">
                            <div className="orientation-icon">📱</div>
                            <h2>Поверніть телефон</h2>
                            <p>Будь ласка, переверніть пристрій у вертикальне положення.</p>
                        </div>
                    </div>
                    <UserDashboard />
                </>
            )}
            {page === 'admin' && (
                <div className="welcome-message">
                    <h1>🔐 Вітаємо! Ви увійшли як адміністратор</h1>
                    <p>Тут може бути адміністративна панель.</p>
                </div>
            )}
        </Suspense>
    );
}

export default App;