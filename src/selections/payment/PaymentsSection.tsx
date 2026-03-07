import React, { useState } from 'react';
import type { Account, CustomerData } from '../../types.ts';
import './PaymentsSection.css';
import InternetPaymentForm from './InternetPaymentForm';
import IBANPaymentForm from './IBANPaymentForm';
import TransfersSection from '../transfer/TransfersSection';

export interface PaymentsSectionProps {
    /** List of user accounts */
    accounts: Account[];
    /** Index of the currently selected account */
    selectedAccountIndex: number;
    /** Callback to update selected account index */
    setSelectedAccountIndex: (index: number) => void;
    /** Customer data for card transfer form */
    customer: CustomerData | null;
    /** Callback after successful transfer */
    onTransferComplete: () => Promise<void>;
    /** Optional copy message callback */
    onCopy?: (msg: string) => void;
}

type PaymentTab = 'transfer' | 'iban' | 'internet';

const PaymentsSection: React.FC<PaymentsSectionProps> = (props) => {
    const [activeTab, setActiveTab] = useState<PaymentTab>('transfer');

    return (
        <div className="payments-container">
            <div className="payments-tabs" role="tablist" aria-label="Операції">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'transfer'}
                    className={`payments-tab ${activeTab === 'transfer' ? 'active' : ''}`}
                    onClick={() => setActiveTab('transfer')}
                >
                    Переказ на картку
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'iban'}
                    className={`payments-tab ${activeTab === 'iban' ? 'active' : ''}`}
                    onClick={() => setActiveTab('iban')}
                >
                    За реквізитами (IBAN)
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'internet'}
                    className={`payments-tab ${activeTab === 'internet' ? 'active' : ''}`}
                    onClick={() => setActiveTab('internet')}
                >
                    Оплата інтернету
                </button>
            </div>

            {activeTab === 'transfer' && (
                <TransfersSection
                    customer={props.customer}
                    onTransferComplete={props.onTransferComplete}
                    onCopy={props.onCopy}
                    selectedAccountIndex={props.selectedAccountIndex}
                    setSelectedAccountIndex={props.setSelectedAccountIndex}
                />
            )}
            {activeTab === 'iban' && (
                <IBANPaymentForm
                    accounts={props.accounts}
                    selectedAccountIndex={props.selectedAccountIndex}
                    setSelectedAccountIndex={props.setSelectedAccountIndex}
                    onBack={() => setActiveTab('transfer')}
                />
            )}
            {activeTab === 'internet' && (
                <InternetPaymentForm
                    accounts={props.accounts}
                    selectedAccountIndex={props.selectedAccountIndex}
                    setSelectedAccountIndex={props.setSelectedAccountIndex}
                    onBack={() => setActiveTab('transfer')}
                />
            )}
        </div>
    );
};

export default PaymentsSection;
