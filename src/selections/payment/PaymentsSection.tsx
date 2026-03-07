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
                    id="payments-tab-transfer"
                    aria-selected={activeTab === 'transfer'}
                    aria-controls="payments-panel-transfer"
                    className={`payments-tab ${activeTab === 'transfer' ? 'active' : ''}`}
                    onClick={() => setActiveTab('transfer')}
                >
                    Переказ на картку
                </button>
                <button
                    type="button"
                    role="tab"
                    id="payments-tab-iban"
                    aria-selected={activeTab === 'iban'}
                    aria-controls="payments-panel-iban"
                    className={`payments-tab ${activeTab === 'iban' ? 'active' : ''}`}
                    onClick={() => setActiveTab('iban')}
                >
                    За реквізитами (IBAN)
                </button>
                <button
                    type="button"
                    role="tab"
                    id="payments-tab-internet"
                    aria-selected={activeTab === 'internet'}
                    aria-controls="payments-panel-internet"
                    className={`payments-tab ${activeTab === 'internet' ? 'active' : ''}`}
                    onClick={() => setActiveTab('internet')}
                >
                    Оплата інтернету
                </button>
            </div>

            {activeTab === 'transfer' && (
                <div role="tabpanel" id="payments-panel-transfer" aria-labelledby="payments-tab-transfer">
                    <TransfersSection
                        customer={props.customer}
                        onTransferComplete={props.onTransferComplete}
                        onCopy={props.onCopy}
                        selectedAccountIndex={props.selectedAccountIndex}
                        setSelectedAccountIndex={props.setSelectedAccountIndex}
                    />
                </div>
            )}
            {activeTab === 'iban' && (
                <div role="tabpanel" id="payments-panel-iban" aria-labelledby="payments-tab-iban">
                    <IBANPaymentForm
                        accounts={props.accounts}
                        selectedAccountIndex={props.selectedAccountIndex}
                        setSelectedAccountIndex={props.setSelectedAccountIndex}
                        onBack={() => setActiveTab('transfer')}
                    />
                </div>
            )}
            {activeTab === 'internet' && (
                <div role="tabpanel" id="payments-panel-internet" aria-labelledby="payments-tab-internet">
                    <InternetPaymentForm
                        accounts={props.accounts}
                        selectedAccountIndex={props.selectedAccountIndex}
                        setSelectedAccountIndex={props.setSelectedAccountIndex}
                        onBack={() => setActiveTab('transfer')}
                    />
                </div>
            )}
        </div>
    );
};

export default PaymentsSection;
