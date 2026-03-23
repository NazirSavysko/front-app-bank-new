import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import type { Account } from '../../types.ts';
import './PaymentsSection.css';
import InternetPaymentForm from './InternetPaymentForm';
import IBANPaymentForm from './IBANPaymentForm';
import MobilePaymentForm from './MobilePaymentForm';
import TaxesPaymentForm from './TaxesPaymentForm';

// Import CSS
import './PaymentForms.css';

export interface PaymentsSectionProps {
    accounts: Account[];
    selectedAccountIndex: number;
    setSelectedAccountIndex: (index: number) => void;
}

const PaymentsHome: React.FC = () => {
    const navigate = useNavigate();

    const categories = [
        { id: 'travel', title: 'Подорожі', desc: 'Купуйте авіаквитки та бронюйте номер в готелі', color: 'bg-purple', size: 'tall' },
        { id: 'internet', title: 'Інтернет', desc: 'Переглянути послуги', color: 'bg-blue', size: 'short' },
        { id: 'electronics', title: 'Електроніка', desc: 'Купуйте смартфони, ноутбуки, електроніку для дому та саду', color: 'bg-indigo', size: 'tall' },
        { id: 'mobile', title: 'Мобільний', desc: 'Поповніть баланс', color: 'bg-indigo', size: 'short' },
        { id: 'utilities', title: 'Комунальні послуги', desc: 'Перевірте рахунки', color: 'bg-indigo', size: 'short' },
        { id: 'taxes', title: 'Податки', desc: 'Сплатіть податки', color: 'bg-indigo', size: 'short' },
    ];

    const getIcon = (id: string) => {
        switch(id) {
            case 'travel': return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>;
            case 'internet': return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>;
            case 'electronics': return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
            case 'mobile': return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
            case 'utilities': return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
            case 'taxes': return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="21" y2="21"/><line x1="6" x2="6" y1="10" y2="18"/><line x1="10" x2="10" y1="10" y2="18"/><line x1="14" x2="14" y1="10" y2="18"/><line x1="18" x2="18" y1="10" y2="18"/><polygon points="12 2 20 7 4 7"/></svg>;
            default: return <span>Icon</span>;
        }
    }

    const handleCategoryClick = (id: string) => {
        if (id === 'internet') {
            navigate('internet');
        } else if (id === 'mobile') {
            navigate('mobile');
        } else if (id === 'taxes') {
            navigate('taxes');
        } else if (id === 'travel') {
            // Do nothing as requested
        } else {
             // Redirect to IBAN form as a generic recipient for now
             navigate('iban');
        }
    };

    return (
        <div className="payments-container">
            <h1 className="page-title">Платежі</h1>

            <section className="search-section">
                <h2>Новий платіж</h2>
                <p className="subtitle">Для створення платежу скористайтеся пошуком</p>
                <div className="search-bar-wrapper">
                    <span className="search-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Введіть IBAN або назву підприємства"
                        className="search-input"
                        onClick={() => navigate('iban')}
                        onFocus={() => navigate('iban')}
                    />
                </div>
            </section>

            <section className="categories-section">
                <h2>Категорії платежів</h2>
                <div className="categories-grid">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            className={`category-card ${cat.color} ${cat.size}`}
                            onClick={() => handleCategoryClick(cat.id)}
                        >
                            <div className="category-icon">{getIcon(cat.id)}</div>
                            <div className="category-content">
                                <h3>{cat.title}</h3>
                                <p>{cat.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
};

const PaymentsSection: React.FC<PaymentsSectionProps> = (props) => {
    const navigate = useNavigate();

    return (
        <div className="payments-wrapper">
             <Routes>
            <Route index element={<PaymentsHome />} />
            <Route path="internet" element={
                <InternetPaymentForm
                    accounts={props.accounts}
                    selectedAccountIndex={props.selectedAccountIndex}
                    setSelectedAccountIndex={props.setSelectedAccountIndex}
                    onBack={() => navigate('/dashboard/payments')}
                />
            } />
            <Route path="iban" element={
                <IBANPaymentForm
                    accounts={props.accounts}
                    selectedAccountIndex={props.selectedAccountIndex}
                    setSelectedAccountIndex={props.setSelectedAccountIndex}
                    onBack={() => navigate('/dashboard/payments')}
                />
            } />
            <Route path="taxes" element={<TaxesPaymentForm />} />
            <Route path="mobile" element={<MobilePaymentForm />} />
            <Route path="*" element={<PaymentsHome />} />
        </Routes>
        </div>
    );
};

export default PaymentsSection;
