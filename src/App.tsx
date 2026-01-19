import { useState, useEffect } from 'react';
import './App.css';
import { LoginForm } from './log-in/LoginForm';
import { RegisterForm } from './RegisterForm';
import { VerifyEmailForm } from './VerifyEmailForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import UserDashboard from './UserDashboard';

/**
 * Top level application component. Controls navigation between login,
 * registration, email verification and password reset screens.
 * After a successful login redirects user by role.
 */
function App() {
    type Page = 'login' | 'register' | 'verify' | 'forgot' | 'user' | 'admin';
    const [page, setPage] = useState<Page>('login');
    const [emailToVerify, setEmailToVerify] = useState('');

    /** Redirect based on role from backend */
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

    // Включаем блокировку скролла только на странице пользователя
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
        <>
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
                    <div className="orientation-lock" role="dialog" aria-modal="true" aria-label="Поверніть телефон">
                        <div className="orientation-box">
                            <div className="orientation-icon" aria-hidden>📱↔️</div>
                            <h2>Поверніть телефон</h2>
                            <p>Будь ласка, переверніть пристрій у горизонтальне положення для комфортної роботи.</p>
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
        </>
    );
}

export default App;
