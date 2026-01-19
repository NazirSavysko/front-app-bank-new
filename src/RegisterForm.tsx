import React, { useState } from "react";
import "./log-in/LoginForm.css";

/**
 * Registration form. After successful registration the component triggers email
 * verification by sending a code to the provided address. When both steps
 * succeed, it notifies the parent via `onRegisterComplete` so that
 * verification can continue.
 */
export interface RegisterFormProps {
    /** Called with the email once registration and sending a verification code succeed */
    onRegisterComplete: (email: string) => void;
    /** Navigate back to the previous screen (usually the login form) */
    onBack: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onRegisterComplete, onBack }) => {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Проверка длины пароля перед отправкой
        if (password.length < 8 || password.length > 15) {
            setError("❌ Пароль повинен бути від 8 до 15 символів");
            return;
        }

        setLoading(true);
        try {
            const registerRes = await fetch(`/api/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName, lastName, email, password, phoneNumber }),
            });

            if (!registerRes.ok) {
                const body = await registerRes.json().catch(() => ({} as { message?: string }));
                const msg = body.message || "Помилка реєстрації";
                setError(`❌ ${msg}`);
                setLoading(false);
                return;
            }

            // Send email verification code
            const sendRes = await fetch(`/api/email/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!sendRes.ok) {
                setError("❌ Не вдалося відправити код підтвердження на пошту");
                setLoading(false);
                return;
            }

            onRegisterComplete(email);
        } catch {
            setError("❌ Помилка з'єднання з сервером");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleRegister}>
                <div className="avatar-icon" />
                <h2>Реєстрація</h2>

                {error && <div className="error-text">{error}</div>}

                <input
                    type="text"
                    placeholder="Ім'я"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Прізвище"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                />
                <input
                    type="email"
                    placeholder="Електронна пошта"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <div className="input-group has-toggle no-icon">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val.length <= 15) setPassword(val);
                        }}
                        required
                        minLength={8}
                        maxLength={15}
                        autoComplete="new-password"
                        aria-label="Пароль"
                    />
                    <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Сховати пароль" : "Показати пароль"}
                        title={showPassword ? "Сховати пароль" : "Показати пароль"}
                    >
                        {showPassword ? "Сховати" : "Показати"}
                    </button>
                </div>

                <input
                    type="tel"
                    placeholder="Номер телефону (+380XXXXXXXXX)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                />

                <button type="submit" disabled={loading}>
                    {loading ? "Реєстрація..." : "ЗАРЕЄСТРУВАТИСЯ"}
                </button>

                <div className="register-link">
                    <span>Вже маєте акаунт?</span>
                    <a
                        onClick={(e) => {
                            e.preventDefault();
                            onBack();
                        }}
                    >
                        Увійти
                    </a>
                </div>
            </form>
        </div>
    );
};
