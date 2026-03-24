import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createElectronicsPayment, sendEmailVerificationCode, verifyEmailVerificationCode } from '../../api';
import type { Account, CartItemDTO, CustomerData } from '../../types';
import PaymentVerificationModal from './PaymentVerificationModal';
import './ElectronicsShopForm.css';

const products = [
    { id: 1, name: 'Apple iPhone 15 Pro', description: '256GB, Space Black', price: 45999 },
    { id: 2, name: 'MacBook Pro 14"', description: 'M3 Pro, 18GB RAM, 512GB', price: 89999 },
    { id: 3, name: 'AirPods Pro 2', description: 'З активним шумозаглушенням', price: 10499 },
    { id: 4, name: 'Power Bank Baseus', description: '30000mAh, 65W', price: 2850 },
    { id: 5, name: 'Sony PlayStation 5', description: 'Digital Edition, 825GB', price: 19999 },
    { id: 6, name: 'Samsung TV 55"', description: '4K Smart TV, Crystal UHD', price: 22500 },
    { id: 7, name: 'iPad Air 5', description: '64GB, Wi-Fi, Blue', price: 26499 },
    { id: 8, name: 'Dyson Supersonic', description: 'Фен для волосся HD07', price: 17900 },
    { id: 9, name: 'Apple Watch Series 9', description: '45mm, Midnight Aluminum', price: 18999 },
    { id: 10, name: 'Logitech MX Master 3S', description: 'Бездротова миша, Graphite', price: 4999 },
    { id: 11, name: 'JBL Charge 5', description: 'Портативна акустика', price: 6499 },
    { id: 12, name: 'GoPro HERO12', description: 'Black Edition', price: 16999 },
];

interface ElectronicsShopFormProps {
    accounts: Account[];
    customer: CustomerData | null;
    onBack: () => void;
    onPaymentFlowStateChange?: (state: 'idle' | 'sending-code' | 'awaiting-code' | 'verifying-code') => void;
    onPaymentComplete?: () => Promise<void>;
    onCopy?: (msg: string) => void;
}

const ElectronicsShopForm: React.FC<ElectronicsShopFormProps> = ({
    accounts,
    customer,
    onBack,
    onPaymentFlowStateChange,
    onPaymentComplete,
}) => {
    const queryClient = useQueryClient();

    const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
    const [cart, setCart] = useState<Record<number, number>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [emailSending, setEmailSending] = useState(false);
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [codeVerifying, setCodeVerifying] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [error, setError] = useState('');

    const uahAccounts = useMemo(() => accounts.filter((acc) => acc.currency === 'UAH'), [accounts]);

    useEffect(() => {
        if (uahAccounts.length > 0 && !uahAccounts.some((acc) => acc.id === selectedAccountId)) {
            setSelectedAccountId(uahAccounts[0].id);
        }
    }, [selectedAccountId, uahAccounts]);

    const paymentFlowState = codeVerifying
        ? 'verifying-code'
        : emailSending
            ? 'sending-code'
            : showEmailVerification
                ? 'awaiting-code'
                : 'idle';

    useEffect(() => {
        onPaymentFlowStateChange?.(paymentFlowState);
    }, [onPaymentFlowStateChange, paymentFlowState]);

    useEffect(() => {
        return () => {
            onPaymentFlowStateChange?.('idle');
        };
    }, [onPaymentFlowStateChange]);

    const totalItemsCount = useMemo(
        () => Object.values(cart).reduce((sum, quantity) => sum + quantity, 0),
        [cart]
    );

    const totalAmount = useMemo(
        () =>
            products.reduce((sum, product) => {
                const quantity = cart[product.id] ?? 0;
                return sum + quantity * product.price;
            }, 0),
        [cart]
    );

    const checkInsufficientFunds = () => {
        const account = accounts.find((acc) => acc.id === selectedAccountId);
        return Boolean(account && account.balance < totalAmount);
    };

    const isInsufficientFunds = checkInsufficientFunds();

    const updateCartQuantity = (productId: number, nextQuantity: number) => {
        setCart((prev) => {
            if (nextQuantity <= 0) {
                const nextCart = { ...prev };
                delete nextCart[productId];
                return nextCart;
            }
            return { ...prev, [productId]: nextQuantity };
        });
    };

    const buildPayload = () => {
        if (!selectedAccountId) {
            throw new Error('Оберіть UAH рахунок для оплати');
        }
        if (totalAmount <= 0) {
            throw new Error('Додайте товари до кошика');
        }
        if (isInsufficientFunds) {
            throw new Error('Недостатньо коштів на обраному рахунку');
        }

        const items: CartItemDTO[] = products
            .filter((product) => (cart[product.id] ?? 0) > 0)
            .map((product) => ({
                productName: product.name,
                quantity: cart[product.id],
                price: product.price,
            }));

        return {
            accountId: selectedAccountId,
            totalAmount,
            items,
        };
    };

    const handleSubmit = async () => {
        setError('');

        if (!customer) {
            setError('Не знайдено дані користувача для підтвердження платежу');
            return;
        }

        try {
            buildPayload();
            setEmailSending(true);
            await sendEmailVerificationCode(customer.email);
            setVerificationCode('');
            setShowEmailVerification(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при оплаті електроніки');
        } finally {
            setEmailSending(false);
        }
    };

    const handleConfirmPayment = async () => {
        if (!customer) {
            setError('Не знайдено дані користувача для підтвердження платежу');
            return;
        }

        try {
            const payload = buildPayload();
            setError('');
            setCodeVerifying(true);
            setIsLoading(true);

            await verifyEmailVerificationCode(customer.email, verificationCode);
            await createElectronicsPayment(payload);
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await onPaymentComplete?.();

            setShowEmailVerification(false);
            setVerificationCode('');
            setCart({});
            onBack();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при оплаті електроніки');
        } finally {
            setCodeVerifying(false);
            setIsLoading(false);
        }
    };

    const cartItemsList = useMemo(() => {
        return products.filter((p) => (cart[p.id] ?? 0) > 0).map((product) => ({
            ...product,
            quantity: cart[product.id]
        }));
    }, [cart]);

    const isBlockingAction = isLoading || emailSending || codeVerifying || showEmailVerification;

    return (
        <div className="electronics-shop-page">
            <div className="electronics-shop-container">
                <div className="electronics-header-group">
                    <header className="electronics-shop-header">
                        <button type="button" className="back-button" onClick={onBack} disabled={isBlockingAction}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        </button>
                        <h2>Електроніка</h2>
                        <div
                            className="electronics-cart-badge"
                            aria-label={`Товарів у кошику: ${totalItemsCount}`}
                            onClick={() => {
                                if (!isBlockingAction) {
                                    setIsCartOpen(true);
                                }
                            }}
                        >
                            🛒 {totalItemsCount}
                        </div>
                    </header>

                    <section className="electronics-account-section">
                        <h3>Оплата з картки (UAH)</h3>
                        <div className="electronics-accounts-scroll">
                            {uahAccounts.length > 0 ? (
                                uahAccounts.map((account) => (
                                    <button
                                        key={account.id}
                                        type="button"
                                        className={`electronics-account-card ${selectedAccountId === account.id ? 'is-active' : ''} ${account.balance < totalAmount && totalAmount > 0 ? 'is-insufficient' : ''}`}
                                        onClick={() => setSelectedAccountId(account.id)}
                                        disabled={isBlockingAction}
                                    >
                                        <strong>**** {account.card.cardNumber.slice(-4)}</strong>
                                        <span>{account.balance.toLocaleString('uk-UA')} UAH</span>
                                    </button>
                                ))
                            ) : (
                                <p className="electronics-empty-accounts">Немає доступних UAH рахунків</p>
                            )}
                        </div>
                    </section>

                    {error && !showEmailVerification && <p className="electronics-error top-error">{error}</p>}
                    {isInsufficientFunds && !error && (
                        <p className="electronics-error top-error">Недостатньо коштів для оплати</p>
                    )}
                </div>

                <div className="electronics-products-scroll-area">
                    <section className="electronics-products-list">
                        {products.map((product) => {
                            const quantity = cart[product.id] ?? 0;
                            return (
                                <article key={product.id} className="electronics-product-card">
                                    <div className="product-info">
                                        <h4>{product.name}</h4>
                                        <p>{product.description}</p>
                                        <div className="electronics-price">{product.price.toLocaleString('uk-UA')} UAH</div>
                                    </div>
                                    <div className="electronics-product-actions">
                                        {quantity > 0 ? (
                                            <div className="electronics-quantity-control">
                                                <button
                                                    type="button"
                                                    onClick={() => updateCartQuantity(product.id, quantity - 1)}
                                                    disabled={isBlockingAction}
                                                >
                                                    -
                                                </button>
                                                <span>{quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateCartQuantity(product.id, quantity + 1)}
                                                    disabled={isBlockingAction}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className="electronics-buy-btn"
                                                onClick={() => updateCartQuantity(product.id, 1)}
                                                disabled={isBlockingAction}
                                            >
                                                Купити
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                </div>

                {!isCartOpen && totalItemsCount > 0 && (
                    <div className="electronics-sticky-bar-wrap">
                        <div className="electronics-sticky-bar" onClick={() => {
                            if (!isBlockingAction) {
                                setIsCartOpen(true);
                            }
                        }}>
                            <div className="electronics-total">
                                <span>{totalItemsCount} товарів на суму: </span>
                                <strong>{totalAmount.toLocaleString('uk-UA')} UAH</strong>
                            </div>
                            <button
                                type="button"
                                className="electronics-view-cart-btn"
                                aria-label={`Відкрити кошик (${totalItemsCount})`}
                            >
                                <span className="electronics-view-cart-btn-icon" aria-hidden="true">🛒</span>
                                <span className="electronics-view-cart-btn-text">Переглянути кошик</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isCartOpen && (
                <div className="cart-overlay" onClick={() => setIsCartOpen(false)}>
                    <div className="cart-drawer" onClick={(event) => event.stopPropagation()}>
                        <div className="cart-drawer-header">
                            <h3>Ваш кошик</h3>
                            <button className="cart-close-btn" onClick={() => setIsCartOpen(false)} disabled={isBlockingAction}>✕</button>
                        </div>

                        <div className="cart-drawer-items">
                            {cartItemsList.length === 0 ? (
                                <p className="cart-empty-msg">Кошик порожній</p>
                            ) : (
                                cartItemsList.map(item => (
                                    <div key={item.id} className="cart-drawer-item">
                                        <div className="cart-item-details">
                                            <div className="cart-item-name">{item.name}</div>
                                            <div className="cart-item-price">{item.price.toLocaleString('uk-UA')} UAH</div>
                                        </div>
                                        <div className="electronics-quantity-control compact">
                                            <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} disabled={isBlockingAction}>-</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} disabled={isBlockingAction}>+</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="cart-drawer-footer">
                            <div className="cart-total-row">
                                <span>Разом:</span>
                                <strong>{totalAmount.toLocaleString('uk-UA')} UAH</strong>
                            </div>
                            {isInsufficientFunds && <div className="cart-error-msg">Недостатньо коштів</div>}
                            <button
                                type="button"
                                className="electronics-checkout-btn full-width"
                                onClick={handleSubmit}
                                disabled={isLoading || emailSending || totalItemsCount === 0 || uahAccounts.length === 0 || isInsufficientFunds}
                            >
                                {emailSending ? 'Відправка коду...' : isLoading ? 'Обробка...' : 'Оплатити'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PaymentVerificationModal
                isOpen={showEmailVerification}
                code={verificationCode}
                onCodeChange={setVerificationCode}
                onSubmit={handleConfirmPayment}
                onClose={() => {
                    if (codeVerifying) {
                        return;
                    }
                    setShowEmailVerification(false);
                    setVerificationCode('');
                    setError('');
                }}
                isSubmitting={codeVerifying}
                error={error || null}
            />
        </div>
    );
};

export default ElectronicsShopForm;
