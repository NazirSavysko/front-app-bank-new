import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestSettingsCode, submitSettingsChange } from '../api';
import type { CustomerData } from '../types';

type SettingsStep = 'idle' | 'password-code' | 'password-new' | 'email-code' | 'email-new';

const VERIFICATION_CODE_LENGTH = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ProfileSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: CustomerData | null;
}

const getCodeError = (value: string) => {
    const normalized = value.trim();
    if (normalized.length !== VERIFICATION_CODE_LENGTH || !/^\d+$/.test(normalized)) {
        return `Код має містити ${VERIFICATION_CODE_LENGTH} цифр`;
    }
    return '';
};

const getEmailError = (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
        return 'Введіть нову пошту';
    }
    if (normalized.length > 254) {
        return 'Пошта занадто довга';
    }
    if (!EMAIL_PATTERN.test(normalized) || normalized.includes('..')) {
        return 'Введіть коректну пошту';
    }
    return '';
};

const mapToInvalidCodeMessage = (message: string) => {
    const normalized = message.toLowerCase();
    if (
        normalized.includes('код') &&
        (normalized.includes('невір') || normalized.includes('неправ') || normalized.includes('invalid'))
    ) {
        return 'Неправильний код верифікації';
    }
    return '';
};

const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose, customer }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState<SettingsStep>('idle');
    const [codeInput, setCodeInput] = useState('');
    const [storedCode, setStoredCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const title = useMemo(() => {
        if (step === 'idle') return 'Налаштування профілю';
        if (step === 'password-code' || step === 'email-code') return 'Верифікація';
        return 'Оновлення даних';
    }, [step]);

    if (!isOpen) {
        return null;
    }

    const resetAndClose = () => {
        setStep('idle');
        setCodeInput('');
        setStoredCode('');
        setNewPassword('');
        setNewEmail('');
        setShowPassword(false);
        setLoading(false);
        setError('');
        setMessage('');
        onClose();
    };

    const handleLogout = () => {
        sessionStorage.removeItem('accessToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('lastActiveTab');
        localStorage.removeItem('customerData');
        navigate('/login');
    };

    const handleRequestCode = async (type: 'password' | 'email') => {
        setError('');
        setMessage('');
        setLoading(true);
        try {
            await requestSettingsCode(type);
            setCodeInput('');
            setStoredCode('');
            setStep(type === 'password' ? 'password-code' : 'email-code');
            setMessage('Код верифікації надіслано на вашу пошту');
        } catch (err) {
            setError((err as Error).message || 'Не вдалося надіслати код');
        } finally {
            setLoading(false);
        }
    };

    const handleCodeSubmit = () => {
        const normalizedCode = codeInput.trim();
        const currentError = getCodeError(codeInput);
        if (currentError) {
            setError(currentError);
            return;
        }
        setError('');
        setStoredCode(normalizedCode);
        if (step === 'password-code') {
            setStep('password-new');
        } else {
            setStep('email-new');
        }
    };

    const handleSubmitPassword = async () => {
        const currentCodeError = getCodeError(storedCode);
        if (currentCodeError) {
            setError(currentCodeError);
            return;
        }
        if (!newPassword.trim()) {
            setError('Введіть новий пароль');
            return;
        }
        if (newPassword.trim().length < 8) {
            setError('Пароль має містити щонайменше 8 символів');
            return;
        }
        setError('');
        setMessage('');
        setLoading(true);
        try {
            await submitSettingsChange('password', { verificationCode: storedCode, newPassword: newPassword.trim() });
            setMessage('Пароль успішно змінено');
            setStep('idle');
            setCodeInput('');
            setStoredCode('');
            setNewPassword('');
        } catch (err) {
            const backendMessage = (err as Error).message || 'Не вдалося змінити пароль';
            setError(mapToInvalidCodeMessage(backendMessage) || backendMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitEmail = async () => {
        const normalizedEmail = newEmail.trim();
        const currentCodeError = getCodeError(storedCode);
        if (currentCodeError) {
            setError(currentCodeError);
            return;
        }
        const currentEmailError = getEmailError(normalizedEmail);
        if (currentEmailError) {
            setError(currentEmailError);
            return;
        }
        setError('');
        setMessage('');
        setLoading(true);
        try {
            await submitSettingsChange('email', { verificationCode: storedCode, newEmail: normalizedEmail });
            alert('Пошту успішно змінено. Будь ласка, увійдіть знову.');
            handleLogout();
        } catch (err) {
            const backendMessage = (err as Error).message || 'Не вдалося змінити пошту';
            setError(mapToInvalidCodeMessage(backendMessage) || backendMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay profile-settings-overlay" onClick={resetAndClose}>
            <div className="modal-content profile-settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="profile-settings-header">
                    <button className="profile-settings-back" onClick={resetAndClose} aria-label="Закрити налаштування">
                        ←
                    </button>
                    <h3>{title}</h3>
                </div>

                <div className="profile-settings-body">
                    {step === 'idle' && (
                        <>
                            {customer && (
                                <div className="profile-settings-user-data">
                                    <div className="profile-settings-info-item">
                                        <label>Ім'я:</label>
                                        <span>{customer.firstName}</span>
                                    </div>
                                    <div className="profile-settings-info-item">
                                        <label>Прізвище:</label>
                                        <span>{customer.lastName}</span>
                                    </div>
                                    <div className="profile-settings-info-item">
                                        <label>Пошта:</label>
                                        <span>{customer.email}</span>
                                    </div>
                                    <div className="profile-settings-info-item">
                                        <label>Телефон:</label>
                                        <span>{customer.phoneNumber}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                className="profile-settings-action-card"
                                onClick={() => void handleRequestCode('password')}
                                disabled={loading}
                            >
                                <span>Змінити пароль</span>
                                <span className="profile-settings-chevron">›</span>
                            </button>

                            <button
                                type="button"
                                className="profile-settings-action-card"
                                onClick={() => void handleRequestCode('email')}
                                disabled={loading}
                            >
                                <span>Змінити пошту</span>
                                <span className="profile-settings-chevron">›</span>
                            </button>
                        </>
                    )}

                    {(step === 'password-code' || step === 'email-code') && (
                        <div className="profile-settings-form">
                            <label className="profile-settings-label" htmlFor="settings-otp-code">
                                Введіть код з пошти
                            </label>
                            <input
                                id="settings-otp-code"
                                type="text"
                                inputMode="numeric"
                                maxLength={VERIFICATION_CODE_LENGTH}
                                className="profile-settings-input"
                                value={codeInput}
                                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, VERIFICATION_CODE_LENGTH))}
                                placeholder="Введіть код"
                            />
                            <button
                                type="button"
                                className="btn btn-primary profile-settings-submit"
                                onClick={handleCodeSubmit}
                                disabled={loading}
                            >
                                Далі
                            </button>
                        </div>
                    )}

                    {step === 'password-new' && (
                        <div className="profile-settings-form">
                            <label className="profile-settings-label" htmlFor="settings-new-password">
                                Введіть новий пароль
                            </label>
                            <div className="profile-settings-password-wrap">
                                <input
                                    id="settings-new-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="profile-settings-input"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Новий пароль"
                                />
                                <button
                                    type="button"
                                    className="profile-settings-toggle-password"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? 'Приховати пароль' : 'Показати пароль'}
                                >
                                    {showPassword ? 'Сховати' : 'Показати'}
                                </button>
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary profile-settings-submit"
                                onClick={() => void handleSubmitPassword()}
                                disabled={loading}
                            >
                                Зберегти
                            </button>
                        </div>
                    )}

                    {step === 'email-new' && (
                        <div className="profile-settings-form">
                            <label className="profile-settings-label" htmlFor="settings-new-email">
                                Введіть нову пошту
                            </label>
                            <input
                                id="settings-new-email"
                                type="email"
                                className="profile-settings-input"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="example@email.com"
                            />
                            <button
                                type="button"
                                className="btn btn-primary profile-settings-submit"
                                onClick={() => void handleSubmitEmail()}
                                disabled={loading}
                            >
                                Зберегти
                            </button>
                        </div>
                    )}

                    {error && <div className="profile-settings-error">{error}</div>}
                    {message && <div className="profile-settings-message">{message}</div>}
                </div>

                <div className="profile-settings-footer">
                    <button className="btn btn-secondary profile-settings-close-btn" onClick={resetAndClose}>
                        Закрити
                    </button>
                    <button className="btn btn-danger profile-settings-logout-btn" onClick={handleLogout}>
                        Вийти
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettingsModal;
