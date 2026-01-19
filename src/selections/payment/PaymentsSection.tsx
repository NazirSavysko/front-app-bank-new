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
const PaymentsSection: React.FC<PaymentsSectionProps> = ({ accounts, selectedAccountIndex }) => {
    const acc = accounts[selectedAccountIndex];
    return (
        <div className="payments-list">
            <div className="account-payments">
                <h3>Платежі для рахунку {acc.accountNumber.slice(-4)}</h3>
                {acc.payments.length > 0 ? (
                    <ul>
                        {acc.payments.map((p, idx) => (
                            <li key={idx} className="payment-item">
                <span>
                  {p.amount} {p.concurrency}
                </span>
                                <span>{p.beneficiaryName}</span>
                                <span>{p.purpose}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Немає платежів</p>
                )}
            </div>
        </div>
    );
};

export default PaymentsSection;
