import React, { useState } from "react";
import "./log-in/LoginForm.css";

/**
 * Email verification form. Users enter the code they received by email to
 * confirm their account. A resend option is available if the user has not
 * received the code. On successful verification the parent is notified.
 */
export interface VerifyEmailFormProps {
    /** The email address being verified */
    email: string;
    /** Called when the verification is successful */
    onVerified: () => void;
    /** Navigate back to the login screen */
    onBack: () => void;
}

export const VerifyEmailForm: React.FC<VerifyEmailFormProps> = ({ email, onVerified, onBack }) => {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);
        try {
            const res = await fetch(`/api/email/check`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({} as { message?: string }));
                const msg = body.message || "Код підтвердження електронної пошти недійсний";
                setError(`❌ ${msg}`);
                setLoading(false);
                return;
            }
            setMessage("✅ Електронну пошту підтверджено, тепер ви можете увійти");
            // Inform parent after short delay so user sees the success message
            setTimeout(() => {
                onVerified();
            }, 1500);
        } catch {
            setError("❌ Помилка з’єднання з сервером");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError("");
        setMessage("");
        setLoading(true);
        try {
            const res = await fetch(`/api/email/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                setError("❌ Не вдалося надіслати код ще раз");
            } else {
                setMessage("Код було повторно надіслано на пошту");
            }
        } catch {
            setError("❌ Помилка з’єднання з сервером");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleVerify}>
                <div className="avatar-icon" />
                <h2>Підтвердження пошти</h2>
                <p style={{ color: '#cccccc', textAlign: 'center', marginBottom: '15px' }}>
                    Ми надіслали код на {email}. Введіть його нижче
                </p>
                {error && <div className="error-text">{error}</div>}
                {message && <div className="error-text" style={{ color: '#4caf50', borderColor: '#4caf50' }}>{message}</div>}

                <input
                    type="text"
                    placeholder="Код підтвердження (5 цифр)"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                />

                <button type="submit" disabled={loading}>
                    {loading ? "Перевірка..." : "ПІДТВЕРДИТИ"}
                </button>
                <div className="actions" style={{ justifyContent: 'space-between' }}>
                    <a
                        onClick={(e) => {
                            e.preventDefault();
                            handleResend();
                        }}
                    >
                        Надіслати код ще раз
                    </a>
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
        </div>
    );
};
