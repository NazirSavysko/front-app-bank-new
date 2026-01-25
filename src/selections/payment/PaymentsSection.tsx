import React from 'react';
import type { Account } from '../../types.ts';
import './PaymentsSection.css';

export interface PaymentsSectionProps {
    /** List of user accounts */
    accounts: Account[];
    /** Index of the currently selected account */
    selectedAccountIndex: number;
}

/**
 * PaymentsSection renders a simple list of saved payments for the selected
 * account. If no payments are configured a placeholder message is shown.
 */
// ...existing code...
const PaymentsSection: React.FC<PaymentsSectionProps> = ({ accounts, selectedAccountIndex }) => {
    const acc = accounts[selectedAccountIndex];
    return (
        <div className="payments-list">
            <div className="account-payments">
                <h3>Платежі для рахунку {acc.accountNumber.slice(-4)}</h3>
                {/* Payments array is temporarily unavailable from backend */}
                <p>Сервіс платежів тимчасово недоступний</p>
            </div>
        </div>
    );
};
// ...existing code...


export default PaymentsSection;
