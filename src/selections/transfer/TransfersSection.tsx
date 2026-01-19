import React, {useEffect, useRef, useState} from 'react';
import type {CustomerData, TransferSuccess} from '../../types.ts';
import './TransfersSection.css';

export interface TransfersSectionProps {
    customer: CustomerData | null;
    onTransferComplete: () => Promise<void>;
    onCopy?: (msg: string) => void;
}

const TransfersSection: React.FC<TransfersSectionProps> = ({
                                                               customer,
                                                               onTransferComplete,
                                                               onCopy
                                                           }) => {
    const [transferData, setTransferData] = useState({
        senderCardNumber: '',
        recipientCardNumber: '',
        amount: '',
        description: 'Переказ власних коштів'
    });

    const [transferError, setTransferError] = useState('');
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [emailSending, setEmailSending] = useState(false);
    const [codeVerifying, setCodeVerifying] = useState(false);
    const [transferSuccess, setTransferSuccess] = useState<TransferSuccess | null>(null);

    const CODE_LENGTH = 5;
    const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

    // 🔒 Блокируем прокрутку фона, когда открыта модалка
    // useEffect(() => {
    //     if (!showEmailVerification) return;
    //     const original = document.body.style.overflow;
    //     document.body.style.overflow = 'hidden';
    //     return () => {
    //         document.body.style.overflow = original;
    //     };
    // }, [showEmailVerification]);

    const setCodeAt = (code: string, index: number, value: string) => {
        const chars = Array.from({length: CODE_LENGTH}, (_, i) => code[i] ?? '');
        chars[index] = value;
        return chars.join('').replace(/\s/g, '').slice(0, CODE_LENGTH);
    };

    const handleOtpChange = (index: number, val: string) => {
        const digit = val.replace(/\D/g, '').slice(0, 1);
        const next = setCodeAt(verificationCode, index, digit);
        setVerificationCode(next);
        if (digit && index < CODE_LENGTH - 1) {
            otpRefs.current[index + 1]?.focus();
            otpRefs.current[index + 1]?.select?.();
        }
        if (transferError) setTransferError('');
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if ((verificationCode[index] ?? '') === '') {
                if (index > 0) {
                    const prevIndex = index - 1;
                    const next = setCodeAt(verificationCode, prevIndex, '');
                    setVerificationCode(next);
                    otpRefs.current[prevIndex]?.focus();
                    otpRefs.current[prevIndex]?.select?.();
                }
            } else {
                const next = setCodeAt(verificationCode, index, '');
                setVerificationCode(next);
            }
            e.preventDefault();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            otpRefs.current[index - 1]?.focus();
            e.preventDefault();
        } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
            otpRefs.current[index + 1]?.focus();
            e.preventDefault();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent<any>) => {
        const text = e.clipboardData.getData('text').replace(/\D/g, '');
        if (text) {
            e.preventDefault();
            const next = text.slice(0, CODE_LENGTH);
            setVerificationCode(next);
            const focusIndex = Math.min(next.length, CODE_LENGTH - 1);
            otpRefs.current[focusIndex]?.focus();
            otpRefs.current[focusIndex]?.select?.();
            if (transferError) setTransferError('');
        }
    };

    useEffect(() => {
        if (showEmailVerification) {
            setVerificationCode('');
            setTimeout(() => {
                otpRefs.current[0]?.focus();
                otpRefs.current[0]?.select?.();
            }, 0);
        }
    }, [showEmailVerification]);

    const validateTransferForm = (): string[] => {
        const errors: string[] = [];
        if (!transferData.senderCardNumber) errors.push('Виберіть картку для списання коштів');
        if (!transferData.recipientCardNumber) {
            errors.push('Введіть номер картки отримувача');
        } else if (transferData.recipientCardNumber.length !== 16) {
            errors.push('Номер картки має містити 16 цифр');
        } else if (!/^\d{16}$/.test(transferData.recipientCardNumber)) {
            errors.push('Номер картки має містити тільки цифри');
        } else if (transferData.recipientCardNumber === transferData.senderCardNumber) {
            errors.push('Неможливо перевести кошти на ту ж саму картку');
        }

        if (!transferData.amount || transferData.amount.trim() === '') {
            errors.push('Введіть суму переказу');
        } else {
            const amountNum = parseFloat(transferData.amount);
            if (isNaN(amountNum)) errors.push('Сума має бути числом');
            else if (amountNum <= 0) errors.push('Сума переказу має бути більше нуля');
            else if (amountNum < 0.01) errors.push('Мінімальна сума переказу - 0.01');
            else if (amountNum > 1000000) errors.push('Максимальна сума переказу - 1,000,000');
        }

        if (transferData.senderCardNumber && transferData.amount && customer) {
            const senderAccount = customer.accounts.find(a => a.card.cardNumber === transferData.senderCardNumber);
            const amountNum = parseFloat(transferData.amount);
            if (senderAccount && !isNaN(amountNum) && amountNum > senderAccount.balance) {
                errors.push(
                    `Недостатньо коштів. Доступно: ${senderAccount.balance.toLocaleString()} ${senderAccount.currency}`
                );
            }
        }
        if (transferData.description.length > 255) errors.push('Опис не може перевищувати 255 символів');
        return errors;
    };

    const sendEmailVerification = async () => {
        if (!customer) return;
        const errs = validateTransferForm();
        if (errs.length > 0) {
            setTransferError(`❌ ${errs.join(', ')}`);
            return;
        }
        setEmailSending(true);
        setTransferError('');
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch('api/email/send', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : ''},
                body: JSON.stringify({email: customer.email})
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({} as { message?: string }));
                setTransferError(`❌ ${body.message || 'Не вдалося відправити код'}`);
                return;
            }
            setShowEmailVerification(true);
            onCopy?.('Код підтвердження відправлено на пошту');
        } catch {
            setTransferError('❌ Помилка з\'єднання з сервером');
        } finally {
            setEmailSending(false);
        }
    };

    const verifyCodeAndTransfer = async () => {
        if (!customer) return;
        setCodeVerifying(true);
        setTransferError('');
        try {
            const token = localStorage.getItem('accessToken');
            const verifyRes = await fetch('http://localhost:8080/api/v1/email/check', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : ''},
                body: JSON.stringify({email: customer.email, code: verificationCode})
            });
            if (!verifyRes.ok) {
                const body = await verifyRes.json().catch(() => ({} as { message?: string }));
                setTransferError(`❌ ${body.message || 'Невірний код підтвердження'}`);
                setCodeVerifying(false);
                return;
            }
            const transferRes = await fetch('http://localhost:8080/api/v1/transactions/withdraw', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : ''},
                body: JSON.stringify(transferData)
            });
            if (!transferRes.ok) {
                const body = await transferRes.json().catch(() => ({} as { message?: string }));
                setTransferError(`❌ ${body.message || 'Не вдалося виконати переказ'}`);
                setCodeVerifying(false);
                return;
            }
            const transferResult = await transferRes.json();
            setTransferSuccess(transferResult);
            setShowEmailVerification(false);
            setVerificationCode('');
            setTransferData({
                senderCardNumber: '',
                recipientCardNumber: '',
                amount: '',
                description: 'Переказ власних коштів'
            });
            await onTransferComplete();
        } catch {
            setTransferError('❌ Помилка з\'єднання з сервером');
        } finally {
            setCodeVerifying(false);
        }
    };

    const resetTransferForm = () => {
        setTransferData({
            senderCardNumber: '',
            recipientCardNumber: '',
            amount: '',
            description: 'Переказ власних коштів'
        });
        setTransferError('');
        setShowEmailVerification(false);
        setVerificationCode('');
        setTransferSuccess(null);
    };

    const selectSenderCard = (cardNumber: string) => {
        // Не разрешаем выбирать карту с нулевым балансом
        const acct = customer?.accounts.find(a => a.card.cardNumber === cardNumber);
        if (acct && acct.balance < 0.01) return;
        setTransferData(p => ({...p, senderCardNumber: cardNumber}));
    };

    const formatCardNumberInput = (v: string) => v.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
    const handleCardNumberChange = (v: string) =>
        setTransferData(p => ({...p, recipientCardNumber: v.replace(/\D/g, '')}));
    const handleAmountChange = (v: string) => {
        const clean = v.replace(/[^0-9.,]/g, '').replace(',', '.');
        if (!clean.startsWith('-')) setTransferData(p => ({...p, amount: clean}));
    };

    const selectedAccount = customer?.accounts.find(a => a.card.cardNumber === transferData.senderCardNumber);
    const validationErrors = validateTransferForm();

    if (transferSuccess) {
        return (
            <>
                <div className="transfer-success-card">
                    <div className="success-icon">✅</div>
                    <h3>Переказ виконано успішно!</h3>
                    <div className="transfer-details">
                        <div className="detail-row">
                            <span>Відправник:</span>
                            <span>
                {transferSuccess.sender.firstName} {transferSuccess.sender.lastName}
              </span>
                        </div>
                        <div className="detail-row">
                            <span>Отримувач:</span>
                            <span>
                {transferSuccess.receiver.firstName} {transferSuccess.receiver.lastName}
              </span>
                        </div>
                        <div className="detail-row">
                            <span>Сума:</span>
                            <span className="amount-highlight">
                {transferSuccess.amount.toLocaleString()} {transferSuccess.currencyCode}
              </span>
                        </div>
                        <div className="detail-row">
                            <span>Опис:</span>
                            <span>{transferSuccess.description}</span>
                        </div>
                        <div className="detail-row">
                            <span>Дата:</span>
                            <span>{new Date(transferSuccess.transactionDate).toLocaleString('uk-UA')}</span>
                        </div>
                        <div className="detail-row">
                            <span>Статус:</span>
                            <span className="status-completed">
                {transferSuccess.status === 'COMPLETED' ? 'Завершено' : transferSuccess.status}
              </span>
                        </div>
                    </div>
                    <button className="btn-send" onClick={resetTransferForm}>
                        Зробити новий переказ
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="transfer-header">
                <h3>Переказ коштів між картками</h3>
                <p>Швидкий і безпечний переказ коштів з картки на картку</p>
            </div>

            <div className="transfer-main-form">
                {/* Вибір картки відправника */}
                <div className="sender-section">
                    <h4>Виберіть картку для списання коштів:</h4>
                    <div className="sender-cards">
                        {customer?.accounts.map(account => (
                            <div
                                key={account.card.cardNumber}
                                className={`sender-card ${
                                    transferData.senderCardNumber === account.card.cardNumber ? 'selected' : ''
                                } ${account.balance < 0.01 ? 'insufficient-funds' : ''}`}
                                onClick={() => selectSenderCard(account.card.cardNumber)}
                                role="button"
                                aria-label={`Картка ${account.currency} **** ${account.card.cardNumber.slice(-4)}`}
                            >
                                <div className="mini-card">
                                    <div className="card-header">
                                        <div className="card-type">{account.currency} картка</div>
                                        {transferData.senderCardNumber === account.card.cardNumber && (
                                            <div className="selected-check">✓</div>
                                        )}
                                    </div>
                                    <div className="card-number">**** ****
                                        **** {account.card.cardNumber.slice(-4)}</div>
                                    <div className="card-info">
                                        <div className="card-balance">
                                            <span className="balance-label">Доступно:</span>
                                            <span
                                                className={`balance-amount ${account.balance < 100 ? 'low-balance' : ''}`}>
                        {account.balance.toLocaleString()} {account.currency}
                      </span>
                                        </div>
                                        <div className="card-expire">
                                            до{' '}
                                            {new Date(account.card.expirationDate).toLocaleDateString('uk-UA', {
                                                month: '2-digit',
                                                year: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                </div>
                                {account.balance < 0.01 && (
                                    <div className="card-warning">
                                        <span>Недостатньо коштів</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {transferData.senderCardNumber && selectedAccount && (
                        <div className="selected-card-info">
                            <span className="info-icon">💳</span>
                            <span>
                Обрано картку: **** {transferData.senderCardNumber.slice(-4)} (
                                {selectedAccount.balance.toLocaleString()} {selectedAccount.currency})
              </span>
                        </div>
                    )}
                </div>

                {/* Реквізити */}
                <div className="recipient-section">
                    <h4>Реквізити переказу:</h4>
                    <div className="form-row">
                        <div className="form-field">
                            <label>
                                Номер картки отримувача: <span className="required">*</span>
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    className={`card-number-input ${
                                        transferData.recipientCardNumber && transferData.recipientCardNumber.length !== 16
                                            ? 'error'
                                            : ''
                                    } ${transferData.recipientCardNumber.length === 16 ? 'valid' : ''}`}
                                    placeholder="0000 0000 0000 0000"
                                    value={formatCardNumberInput(transferData.recipientCardNumber)}
                                    onChange={e => handleCardNumberChange(e.target.value)}
                                    maxLength={19}
                                />
                                {transferData.recipientCardNumber.length === 16 && (
                                    <div className="input-icon valid">✓</div>
                                )}
                            </div>
                            <div className="field-hint">
                                {transferData.recipientCardNumber.length > 0 &&
                                    transferData.recipientCardNumber.length < 16 && (
                                        <span className="hint-text">
                      Введіть {16 - transferData.recipientCardNumber.length} цифр
                    </span>
                                    )}
                                {transferData.recipientCardNumber === transferData.senderCardNumber && (
                                    <span className="hint-error">Неможливо перевести на ту ж картку</span>
                                )}
                            </div>
                        </div>

                        <div className="form-field">
                            <label>
                                Сума переказу: <span className="required">*</span>
                            </label>
                            <div className="input-wrapper amount-wrapper">
                                <input
                                    type="number"
                                    className={`amount-input ${
                                        transferData.amount &&
                                        (parseFloat(transferData.amount) <= 0 ||
                                            parseFloat(transferData.amount) > (selectedAccount?.balance || 0))
                                            ? 'error'
                                            : ''
                                    } ${
                                        transferData.amount &&
                                        parseFloat(transferData.amount) > 0 &&
                                        parseFloat(transferData.amount) <= (selectedAccount?.balance || 0)
                                            ? 'valid'
                                            : ''
                                    }`}
                                    placeholder="0.00"
                                    value={transferData.amount}
                                    onChange={e => handleAmountChange(e.target.value)}
                                    min="0.01"
                                    max={selectedAccount?.balance || 1000000}
                                    step="0.01"
                                    inputMode="decimal"
                                />
                                <div className="currency-suffix">{selectedAccount?.currency}</div>
                                {transferData.amount &&
                                    parseFloat(transferData.amount) > 0 &&
                                    parseFloat(transferData.amount) <= (selectedAccount?.balance || 0) && (
                                        <div className="input-icon valid">✓</div>
                                    )}
                            </div>
                            <div className="field-hint">
                                <div className="amount-suggestions">
                                    {[100, 500, 1000, 2000].map(
                                        amount =>
                                            selectedAccount &&
                                            amount <= selectedAccount.balance && (
                                                <button
                                                    key={amount}
                                                    className="amount-suggestion"
                                                    onClick={() => setTransferData(p => ({
                                                        ...p,
                                                        amount: amount.toString()
                                                    }))}
                                                    type="button"
                                                >
                                                    {amount}
                                                </button>
                                            )
                                    )}
                                </div>
                                {transferData.amount &&
                                    selectedAccount &&
                                    parseFloat(transferData.amount) > selectedAccount.balance && (
                                        <span className="hint-error">
                      Перевищує баланс на{' '}
                                            {(parseFloat(transferData.amount) - selectedAccount.balance).toLocaleString()}{' '}
                                            {selectedAccount.currency}
                    </span>
                                    )}
                                {transferData.amount &&
                                    parseFloat(transferData.amount) > 0 &&
                                    parseFloat(transferData.amount) <= (selectedAccount?.balance || 0) && (
                                        <span className="hint-success">
                      Залишиться:{' '}
                                            {((selectedAccount?.balance || 0) - parseFloat(transferData.amount)).toLocaleString()}{' '}
                                            {selectedAccount?.currency}
                    </span>
                                    )}
                            </div>
                        </div>
                    </div>

                    <div className="form-field">
                        <label>Опис переказу:</label>
                        <div className="input-wrapper">
                            <input
                                type="text"
                                className={`description-input ${transferData.description.length > 255 ? 'error' : ''}`}
                                value={transferData.description}
                                onChange={e => setTransferData(p => ({...p, description: e.target.value}))}
                                placeholder="Переказ власних коштів"
                                maxLength={255}
                            />
                        </div>
                        <div className="field-hint">
              <span className={`char-count ${transferData.description.length > 200 ? 'warning' : ''}`}>
                {transferData.description.length}/255 символів
              </span>
                        </div>
                    </div>

                    {validationErrors.length > 0 && (
                        <div className="validation-errors">
                            <div className="error-header">
                                <span>Заповніть всі обов'‎язкові поля:</span>
                            </div>
                            <ul className="error-list">
                                {validationErrors.map((err, idx) => (
                                    <li key={idx}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="transfer-buttons">
                <button className="btn-clear" onClick={resetTransferForm} disabled={emailSending} type="button">
                    <span className="btn-icon">♻</span>Очистити форму
                </button>
                <button
                    className="btn-send"
                    onClick={sendEmailVerification}
                    disabled={
                        emailSending ||
                        validationErrors.length > 0 ||
                        !transferData.senderCardNumber ||
                        !transferData.recipientCardNumber ||
                        !transferData.amount ||
                        parseFloat(transferData.amount) <= 0
                    }
                    type="button"
                >
                    <span className="btn-icon">{emailSending ? '⏳' : '🚀'}</span>
                    <span>{emailSending ? 'Відправлення коду...' : 'Відправити переказ'}</span>
                </button>
            </div>

            {showEmailVerification && (
                <div className="modal-overlay verification-overlay" role="dialog" aria-modal="true">
                    <div className="verification-modal">
                        <div className="verification-header">
                            <div className="verification-icon">📧</div>
                            <h3>Підтвердження переказу</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowEmailVerification(false)}
                                aria-label="Закрити модальне вікно"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="verification-body">
                            <div className="email-info">
                                <p className="verification-text">Код підтвердження надіслано на пошту</p>
                                <div className="email-display">
                                    <span className="email-icon">📮</span>
                                    <strong>{customer?.email}</strong>
                                </div>
                            </div>

                            <div className="transfer-summary">
                                <h4>Деталі переказу:</h4>
                                <div className="summary-row">
                                    <span>Сума:</span>
                                    <span className="amount">{transferData.amount} {selectedAccount?.currency}</span>
                                </div>
                                <div className="summary-row">
                                    <span>На картку:</span>
                                    <span>**** **** **** {transferData.recipientCardNumber.slice(-4)}</span>
                                </div>
                            </div>

                            <div className="code-input-section">
                                <label className="code-label">Введіть 5-значний код:</label>
                                <div className="otp-container" onPaste={handleOtpPaste}>
                                    {Array.from({length: CODE_LENGTH}, (_, idx) => (
                                        <input
                                            key={idx}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={1}
                                            className={`otp-input ${transferError ? 'error' : ''}`}
                                            value={verificationCode[idx] ?? ''}
                                            onChange={e => handleOtpChange(idx, e.target.value)}
                                            onKeyDown={e => handleOtpKeyDown(idx, e)}
                                            onPaste={handleOtpPaste}
                                            ref={el => (otpRefs.current[idx] = el)}
                                            disabled={codeVerifying}
                                            aria-label={`Цифра ${idx + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {transferError && (
                                <div className="verification-error">
                                    <span className="error-icon">⚠️</span>
                                    <span>{transferError.replace('❌ ', '')}</span>
                                </div>
                            )}

                            <div className="resend-section">
                                <p className="resend-text">Не отримали код?</p>
                                <button className="resend-button" onClick={sendEmailVerification}
                                        disabled={emailSending} type="button">
                                    {emailSending ? 'Відправляємо...' : 'Надіслати повторно'}
                                </button>
                            </div>
                        </div>

                        <div className="verification-footer">
                            <button className="btn-cancel" onClick={() => setShowEmailVerification(false)}
                                    disabled={codeVerifying} type="button">
                                Скасувати
                            </button>
                            <button
                                className="btn-verify"
                                onClick={verifyCodeAndTransfer}
                                disabled={codeVerifying || verificationCode.length !== CODE_LENGTH}
                                type="button"
                            >
                                <span className="btn-icon">{codeVerifying ? '⏳' : '✅'}</span>
                                <span>{codeVerifying ? 'Перевіряємо...' : 'Підтвердити переказ'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TransfersSection;
