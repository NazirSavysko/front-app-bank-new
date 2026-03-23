import React, { useEffect, useRef } from 'react';

interface PaymentVerificationModalProps {
    isOpen: boolean;
    code: string;
    onCodeChange: (nextCode: string) => void;
    onSubmit: () => void;
    onClose: () => void;
    isSubmitting: boolean;
    error?: string | null;
}

const CODE_LENGTH = 5;

const setCodeAt = (code: string, index: number, value: string) => {
    const chars = Array.from({ length: CODE_LENGTH }, (_, i) => code[i] ?? '');
    chars[index] = value;
    return chars.join('').replace(/\s/g, '').slice(0, CODE_LENGTH);
};

export const PaymentVerificationModal: React.FC<PaymentVerificationModalProps> = ({
    isOpen,
    code,
    onCodeChange,
    onSubmit,
    onClose,
    isSubmitting,
    error,
}) => {
    const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            otpRefs.current[0]?.focus();
            otpRefs.current[0]?.select?.();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleOtpChange = (index: number, value: string) => {
        const digit = value.replace(/\D/g, '').slice(0, 1);
        const next = setCodeAt(code, index, digit);
        onCodeChange(next);
        if (digit && index < CODE_LENGTH - 1) {
            otpRefs.current[index + 1]?.focus();
            otpRefs.current[index + 1]?.select?.();
        }
    };

    const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace') {
            if ((code[index] ?? '') === '') {
                if (index > 0) {
                    const prevIndex = index - 1;
                    const next = setCodeAt(code, prevIndex, '');
                    onCodeChange(next);
                    otpRefs.current[prevIndex]?.focus();
                    otpRefs.current[prevIndex]?.select?.();
                }
            } else {
                const next = setCodeAt(code, index, '');
                onCodeChange(next);
            }
            event.preventDefault();
        } else if (event.key === 'ArrowLeft' && index > 0) {
            otpRefs.current[index - 1]?.focus();
            event.preventDefault();
        } else if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
            otpRefs.current[index + 1]?.focus();
            event.preventDefault();
        }
    };

    const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
        const text = event.clipboardData.getData('text').replace(/\D/g, '');
        if (!text) {
            return;
        }

        event.preventDefault();
        const next = text.slice(0, CODE_LENGTH);
        onCodeChange(next);
        const focusIndex = Math.min(next.length, CODE_LENGTH - 1);
        otpRefs.current[focusIndex]?.focus();
        otpRefs.current[focusIndex]?.select?.();
    };

    const digits = Array.from({ length: CODE_LENGTH }, (_, i) => code[i] ?? '');

    return (
        <div className="payment-verification-overlay">
            <div
                className="payment-verification-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="payment-verification-title"
                onClick={(event) => event.stopPropagation()}
            >
                <h3 id="payment-verification-title">Підтвердження платежу</h3>
                <p>Введіть 5-значний код, який ми надіслали на вашу email-адресу.</p>

                <div className="payment-otp-row" aria-label="Код підтвердження">
                    {digits.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => {
                                otpRefs.current[index] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete={index === 0 ? 'one-time-code' : 'off'}
                            maxLength={1}
                            className="payment-otp-input"
                            value={digit}
                            onChange={(event) => handleOtpChange(index, event.target.value)}
                            onKeyDown={(event) => handleOtpKeyDown(index, event)}
                            onPaste={handleOtpPaste}
                            disabled={isSubmitting}
                            aria-label={`Цифра ${index + 1}`}
                        />
                    ))}
                </div>

                {error && <div className="payment-error-message">{error}</div>}

                <div className="payment-verification-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                        Скасувати
                    </button>
                    <button
                        type="button"
                        className="submit-payment-btn"
                        onClick={onSubmit}
                        disabled={isSubmitting || code.length !== CODE_LENGTH}
                    >
                        {isSubmitting ? 'Підтвердження...' : 'Підтвердити код'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PaymentVerificationModalDefault = PaymentVerificationModal;

export default PaymentVerificationModalDefault;



