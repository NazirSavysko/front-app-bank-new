import React, { useState } from "react";
import "./LoginForm.css";

/**
 * Login form component. It accepts callbacks for a successful login
 * as well as handlers for navigating to registration and password reset screens.
 */
export interface LoginFormProps {
    /**
     * Called when the user has successfully logged in.
     * Provides the role returned from the API (e.g. 'ADMIN' or 'USER') so
     * that the parent component can redirect accordingly.
     */
    onLogin: (role: string) => void;
    /** Navigate to the registration form */
    onRegisterLink: () => void;
    /** Navigate to the forgot password form */
    onForgotLink: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onRegisterLink, onForgotLink }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            // Запрос к серверу идёт через proxy /api (см. vite.config.ts)
            const res = await fetch(`/api/log-in`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Показать конкретное сообщение от бэка, если оно есть
                if (data.message?.includes("Пароль") || data.message?.includes("електронної пошти")) {
                    setError(data.message);
                } else if (data.message?.includes("Некоректний пароль")) {
                    setError("❌ Невірний пароль або пошта");
                } else {
                    setError("❌ Помилка входу");
                }
                return;
            }

            // Сохранить токен и роль и передать роль наверх
            localStorage.setItem("accessToken", data.token);
            localStorage.setItem("role", data.role);
            onLogin(data.role);
        } catch {
            setError("❌ Помилка з’єднання з сервером");
        }
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleLogin}>
                <div className="avatar-icon" />
                <h2>Увійти в акаунт</h2>

                {error && <div className="error-text">{error}</div>}

                <input
                    type="email"
                    placeholder="Електронна пошта"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                {/* Поле пароль с иконкой и переключателем видимости */}
                <div className="input-group has-toggle no-icon">
                    {/* иконка убрана по запросу пользователя */}
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => {
                            // Ограничение длины пароля от 8 до 15 символов
                            const val = e.target.value;
                            if (val.length <= 15) setPassword(val);
                        }}
                        required
                        minLength={8}
                        maxLength={15}
                        autoComplete="current-password"
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

                <div className="actions">
                    <a
                        onClick={(e) => {
                            e.preventDefault();
                            onForgotLink();
                        }}
                    >
                        Забули пароль?
                    </a>
                </div>

                <button type="submit">УВІЙТИ</button>

                <div className="register-link">
                    <span>Немає акаунту?</span>
                    <a
                        onClick={(e) => {
                            e.preventDefault();
                            onRegisterLink();
                        }}
                    >
                        Зареєструватися
                    </a>
                </div>
            </form>
        </div>
    );
};
