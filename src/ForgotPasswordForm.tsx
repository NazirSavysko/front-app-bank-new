import React, { useState, useRef, useEffect } from "react";
import "./log-in/LoginForm.css";

// Компонент для ввода кода с отдельными ячейками
const CodeInput: React.FC<{
    value: string;
    onChange: (value: string) => void;
    length?: number;
    disabled?: boolean;
}> = ({ value, onChange, length = 5, disabled = false }) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, length);
        // Автофокус на первый элемент
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [length]);

    const handleChange = (index: number, inputValue: string) => {
        // Разрешаем только цифры
        const digit = inputValue.replace(/\D/g, '').slice(-1);

        // Создаем новое значение
        const newValue = value.split('');
        newValue[index] = digit;

        // Заполняем пустые позиции пустыми строками
        while (newValue.length < length) {
            newValue.push('');
        }

        const result = newValue.join('').slice(0, length);
        onChange(result);

        // Автоматический переход к следующему полю при вводе цифры
        if (digit && index < length - 1) {
            const nextInput = inputRefs.current[index + 1];
            if (nextInput) {
                nextInput.focus();
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Обработка Backspace
        if (e.key === 'Backspace') {
            e.preventDefault();

            const currentValue = value[index] || '';

            if (currentValue) {
                // Если в текущем поле есть значение, удаляем его
                const newValue = value.split('');
                newValue[index] = '';
                onChange(newValue.join(''));
            } else if (index > 0) {
                // Если текущее поле пустое, переходим к предыдущему и удаляем его значение
                const newValue = value.split('');
                newValue[index - 1] = '';
                onChange(newValue.join(''));

                const prevInput = inputRefs.current[index - 1];
                if (prevInput) {
                    prevInput.focus();
                }
            }
        }

        // Обработка стрелок
        if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault();
            inputRefs.current[index - 1]?.focus();
        }

        if (e.key === 'ArrowRight' && index < length - 1) {
            e.preventDefault();
            inputRefs.current[index + 1]?.focus();
        }

        // Блокируем ввод нецифровых символов
        if (!/\d/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text/plain');
        const digits = pastedData.replace(/\D/g, '').slice(0, length);

        if (digits) {
            onChange(digits.padEnd(length, ''));

            // Фокусируемся на следующем пустом поле или на последнем
            const nextEmptyIndex = Math.min(digits.length, length - 1);
            const targetInput = inputRefs.current[nextEmptyIndex];
            if (targetInput) {
                targetInput.focus();
            }
        }
    };

    const handleFocus = (index: number) => {
        // Выделяем содержимое при фокусе
        const input = inputRefs.current[index];
        if (input) {
            input.select();
        }
    };

    return (
        <div className="code-input-container">
            {Array.from({ length }, (_, index) => (
                <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    className={`code-input-digit ${value[index] ? 'filled' : ''}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[index] || ''}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    onFocus={() => handleFocus(index)}
                    disabled={disabled}
                    aria-label={`Цифра ${index + 1} з ${length}`}
                />
            ))}
        </div>
    );
};

/**
 * Password reset form. Users provide the email associated with their account and
 * a new password. On success the parent may navigate back to login.
 */
export interface ForgotPasswordFormProps {
    /** Navigate back to the login screen */
    onBack: () => void;
    /** Called when password has been successfully reset */
    onReset: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack, onReset }) => {
    const [step, setStep] = useState<'email' | 'code' | 'reset'>('email');
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    // Переключатели показа паролей на шаге reset
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    /**
     * Step 1: send reset code to the provided email
     */
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);
        try {
            const res = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({} as { message?: string }));
                const msg = body.message || 'Не вдалося надіслати код';
                setError(`❌ ${msg}`);
                setLoading(false);
                return;
            }
            setMessage('Код відправлено на вашу пошту');
            setStep('code');
        } catch {
            setError('❌ Помилка з’єднання з сервером');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Resend the verification code without resetting the step; used in the code step
     */
    const resendCode = async () => {
        setError("");
        setMessage("");
        setLoading(true);
        try {
            const res = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                setError('❌ Не вдалося надіслати код ще раз');
            } else {
                setMessage('Код було повторно надіслано на пошту');
            }
        } catch {
            setError('❌ Помилка з’єднання з сервером');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Step 2: verify the code entered by the user
     */
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);
        try {
            const res = await fetch('/api/email/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({} as { message?: string }));
                const msg = body.message || 'Код підтвердження електронної пошти недійсний';
                setError(`❌ ${msg}`);
                setLoading(false);
                return;
            }
            setStep('reset');
        } catch {
            setError('❌ Помилка з’єднання з сервером');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Step 3: set a new password
     */
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");
        if (newPassword.length < 8 || newPassword.length > 15) {
            setError('❌ Пароль повинен бути від 8 до 15 символів');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('❌ Паролі не співпадають');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/customers/forgot-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: newPassword }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({} as { message?: string }));
                const msg = body.message || 'Не вдалося скинути пароль';
                setError(`❌ ${msg}`);
                setLoading(false);
                return;
            }
            setMessage('✅ Пароль успішно змінено, тепер ви можете увійти');
            setTimeout(() => {
                onReset();
            }, 1500);
        } catch {
            setError('❌ Помилка з’єднання з сервером');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {step === 'email' && (
                <form className="login-form" onSubmit={handleSendCode}>
                    <div className="avatar-icon" />
                    <h2>Відновлення пароля</h2>
                    {error && <div className="error-text">{error}</div>}
                    {message && <div className="error-text" style={{ color: '#4caf50', borderColor: '#4caf50' }}>{message}</div>}
                    <input
                        type="email"
                        placeholder="Електронна пошта"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Надсилання...' : 'Надіслати код'}
                    </button>
                    <div className="register-link">
                        <a
                            onClick={(e) => {
                                e.preventDefault();
                                onBack();
                            }}
                        >
                            Назад
                        </a>
                    </div>
                </form>
            )}
            {step === 'code' && (
                <form className="login-form" onSubmit={handleVerifyCode}>
                    <div className="avatar-icon" />
                    <h2>Підтвердження коду</h2>
                    {error && <div className="error-text">{error}</div>}
                    {message && <div className="error-text" style={{ color: '#4caf50', borderColor: '#4caf50' }}>{message}</div>}
                    <p className="code-description">
                        Введіть код, що надійшов на <span className="email-highlight">{email}</span>
                    </p>
                    <CodeInput
                        value={code}
                        onChange={setCode}
                        length={5}
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Перевірка...' : 'Підтвердити'}
                    </button>
                    <div className="actions" style={{ justifyContent: 'space-between' }}>
                        <a
                            onClick={(e) => {
                                e.preventDefault();
                                resendCode();
                            }}
                        >
                            Надіслати ще раз
                        </a>
                        <a
                            onClick={(e) => {
                                e.preventDefault();
                                setStep('email');
                                setMessage('');
                            }}
                        >
                            Назад
                        </a>
                    </div>
                </form>
            )}
            {step === 'reset' && (
                <form className="login-form" onSubmit={handleResetPassword}>
                    <div className="avatar-icon" />
                    <h2>Новий пароль</h2>
                    {error && <div className="error-text">{error}</div>}
                    {message && <div className="error-text" style={{ color: '#4caf50', borderColor: '#4caf50' }}>{message}</div>}

                    <div className="input-group has-toggle no-icon">
                        <input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Новий пароль"
                            value={newPassword}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val.length <= 15) setNewPassword(val);
                            }}
                            required
                            minLength={8}
                            maxLength={15}
                            autoComplete="new-password"
                            aria-label="Новий пароль"
                        />
                        <button
                            type="button"
                            className="toggle-password"
                            onClick={() => setShowNewPassword(v => !v)}
                            aria-label={showNewPassword ? "Сховати пароль" : "Показати пароль"}
                            title={showNewPassword ? "Сховати пароль" : "Показати пароль"}
                        >
                            {showNewPassword ? "Сховати" : "Показати"}
                        </button>
                    </div>

                    <div className="input-group has-toggle no-icon">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Підтвердьте новий пароль"
                            value={confirmPassword}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val.length <= 15) setConfirmPassword(val);
                            }}
                            required
                            minLength={8}
                            maxLength={15}
                            autoComplete="new-password"
                            aria-label="Підтвердьте новий пароль"
                        />
                        <button
                            type="button"
                            className="toggle-password"
                            onClick={() => setShowConfirmPassword(v => !v)}
                            aria-label={showConfirmPassword ? "Сховати пароль" : "Показати пароль"}
                            title={showConfirmPassword ? "Сховати пароль" : "Показати пароль"}
                        >
                            {showConfirmPassword ? "Сховати" : "Показати"}
                        </button>
                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? 'Зміна...' : 'Змінити пароль'}
                    </button>
                    <div className="register-link">
                        <a
                            onClick={(e) => {
                                e.preventDefault();
                                onBack();
                            }}
                        >
                            Назад
                        </a>
                    </div>
                </form>
            )}
        </div>
    );
};