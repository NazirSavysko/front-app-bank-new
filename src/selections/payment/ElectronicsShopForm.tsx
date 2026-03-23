import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createElectronicsPayment } from '../../api';
import { useAccounts } from '../../hooks/useAccounts';
import type { CartItemDTO } from '../../types';
import './ElectronicsShopForm.css';

const products = [
    { id: 1, name: 'Apple iPhone 15 Pro', description: '256GB, Space Black', price: 45999 },
    { id: 2, name: 'MacBook Pro 14"', description: 'M3 Pro, 18GB RAM, 512GB', price: 89999 },
    { id: 3, name: 'AirPods Pro 2', description: 'З активним шумозаглушенням', price: 10499 },
    { id: 4, name: 'Power Bank Baseus', description: '30000mAh, 65W', price: 2850 },
];

const ElectronicsShopForm: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { accounts } = useAccounts();

    const [selectedAccountId, setSelectedAccountId] = useState<number>(0);
    const [cart, setCart] = useState<Record<number, number>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const uahAccounts = useMemo(() => accounts.filter((acc) => acc.currencyCode === 'UAH'), [accounts]);

    useEffect(() => {
        if (uahAccounts.length > 0 && !uahAccounts.some((acc) => acc.id === selectedAccountId)) {
            setSelectedAccountId(uahAccounts[0].id);
        }
    }, [selectedAccountId, uahAccounts]);

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

    const handleSubmit = async () => {
        setError('');

        if (!selectedAccountId) {
            setError('Оберіть UAH рахунок для оплати');
            return;
        }
        if (totalAmount <= 0) {
            setError('Додайте товари до кошика');
            return;
        }

        const items: CartItemDTO[] = products
            .filter((product) => (cart[product.id] ?? 0) > 0)
            .map((product) => ({
                productName: product.name,
                quantity: cart[product.id],
                price: product.price,
            }));

        setIsLoading(true);
        try {
            await createElectronicsPayment({
                accountId: selectedAccountId,
                totalAmount,
                items,
            });
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            alert('Покупку електроніки успішно оформлено!');
            setCart({});
            navigate('/dashboard/payments');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Помилка при оплаті електроніки');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="electronics-shop-page">
            <div className="electronics-shop-container">
                <header className="electronics-shop-header">
                    <button type="button" className="back-button" onClick={() => navigate('/dashboard/payments')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                    <h2>Електроніка</h2>
                    <div className="electronics-cart-badge" aria-label={`Товарів у кошику: ${totalItemsCount}`}>
                        🛒 {totalItemsCount}
                    </div>
                </header>

                <section className="electronics-account-section">
                    <h3>Звідки</h3>
                    <div className="electronics-accounts-scroll">
                        {uahAccounts.length > 0 ? (
                            uahAccounts.map((account) => (
                                <button
                                    key={account.id}
                                    type="button"
                                    className={`electronics-account-card ${selectedAccountId === account.id ? 'is-active' : ''}`}
                                    onClick={() => setSelectedAccountId(account.id)}
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

                <section className="electronics-products-list">
                    {products.map((product) => {
                        const quantity = cart[product.id] ?? 0;
                        return (
                            <article key={product.id} className="electronics-product-card">
                                <div>
                                    <h4>{product.name}</h4>
                                    <p>{product.description}</p>
                                </div>
                                <div className="electronics-product-actions">
                                    <div className="electronics-price">{product.price.toLocaleString('uk-UA')} UAH</div>
                                    {quantity > 0 ? (
                                        <div className="electronics-quantity-control">
                                            <button
                                                type="button"
                                                onClick={() => updateCartQuantity(product.id, quantity - 1)}
                                                disabled={isLoading}
                                            >
                                                -
                                            </button>
                                            <span>{quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => updateCartQuantity(product.id, quantity + 1)}
                                                disabled={isLoading}
                                            >
                                                +
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="electronics-buy-btn"
                                            onClick={() => updateCartQuantity(product.id, 1)}
                                            disabled={isLoading}
                                        >
                                            Купити
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </section>

                {error && <p className="electronics-error">{error}</p>}
            </div>

            <div className="electronics-sticky-bar-wrap">
                <div className="electronics-sticky-bar">
                    <div className="electronics-total">Разом: {totalAmount.toLocaleString('uk-UA')} UAH</div>
                    <button
                        type="button"
                        className="electronics-checkout-btn"
                        onClick={handleSubmit}
                        disabled={isLoading || totalItemsCount === 0 || uahAccounts.length === 0}
                    >
                        {isLoading ? 'Обробка...' : 'Оформити'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ElectronicsShopForm;
