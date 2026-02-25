import { useState, useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';

const LoginForm = lazy(() => import('./log-in/LoginForm').then(module => ({ default: module.LoginForm })));
const RegisterForm = lazy(() => import('./RegisterForm').then(module => ({ default: module.RegisterForm })));
const VerifyEmailForm = lazy(() => import('./VerifyEmailForm').then(module => ({ default: module.VerifyEmailForm })));
const ForgotPasswordForm = lazy(() => import('./ForgotPasswordForm').then(module => ({ default: module.ForgotPasswordForm })));
const UserDashboard = lazy(() => import('./UserDashboard'));

function App() {
    const navigate = useNavigate();
    const location = useLocation();
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
            navigate('/admin');
        } else {
            navigate('/dashboard/accounts'); // Default to accounts tab
        }
    };

    const handleRegisterComplete = (email: string) => {
        setEmailToVerify(email);
        navigate('/verify');
    };

    const handleVerificationSuccess = () => {
        navigate('/login');
    };

    const handleResetSuccess = () => {
        navigate('/login');
    };

    useEffect(() => {
        const cls = 'orientation-lock-open';
        if (location.pathname.startsWith('/dashboard')) {
            document.body.classList.add(cls);
        } else {
            document.body.classList.remove(cls);
        }
        return () => document.body.classList.remove(cls);
    }, [location.pathname]);

    // Protected Route wrapper
    const ProtectedRoute = ({ children }: { children: ReactNode }) => {
        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
        if (!token) {
            return <Navigate to="/login" replace />;
        }
        return children;
    };

    return (
        <Routes>
            <Route path="/login" element={
                <LoginForm
                    onLogin={handleLoginSuccess}
                    onRegisterLink={() => navigate('/register')}
                    onForgotLink={() => navigate('/forgot-password')}
                />
            } />
            <Route path="/register" element={
                <RegisterForm
                    onRegisterComplete={handleRegisterComplete}
                    onBack={() => navigate('/login')}
                />
            } />
            <Route path="/verify" element={
                <VerifyEmailForm
                    email={emailToVerify || (location.state as { email?: string })?.email || ''}
                    onVerified={handleVerificationSuccess}
                    onBack={() => navigate('/login')}
                />
            } />
            <Route path="/forgot-password" element={
                <ForgotPasswordForm
                    onBack={() => navigate('/login')}
                    onReset={handleResetSuccess}
                />
            } />

            <Route path="/dashboard/*" element={
                <ProtectedRoute>
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
                </ProtectedRoute>
            } />

            <Route path="/admin" element={
                <ProtectedRoute>
                    <div className="welcome-message">
                        <h1>🔐 Вітаємо! Ви увійшли як адміністратор</h1>
                        <p>Тут може бути адміністративна панель.</p>
                    </div>
                </ProtectedRoute>
            } />

            <Route path="/" element={<Navigate to="/dashboard/accounts" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

export default App;