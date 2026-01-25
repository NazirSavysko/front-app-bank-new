import React, { useEffect, useRef } from 'react';
import type { Account } from '../../types.ts';
import AccountCard from '../../components/AccountCard.tsx';
import './AccountSelection.css';

export interface AccountsSectionProps {
    accounts: Account[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    onAddAccount: () => void;
    onCopy?: (message: string) => void;
}

/**
 * Перелік рахунків: горизонтальний на ПК, злипання по центру;
 * на мобільних — компактніший.
 */
const AccountsSection: React.FC<AccountsSectionProps> = ({
                                                             accounts,
                                                             selectedIndex,
                                                             onSelect,
                                                             onAddAccount,
                                                             onCopy
                                                         }) => {
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        const handleWheel = (e: WheelEvent) => {
            if (e.deltaY === 0) return;
            // Scroll horizontally instead of vertically
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    return (
        <div
            className="accounts-list"
            ref={listRef}
            role="listbox"
            aria-label="Список рахунків"
            aria-activedescendant={`account-${selectedIndex}`}
        >
            {accounts.map((acc, idx) => (
                <div
                    key={idx}
                    id={`account-${idx}`}
                    role="option"
                    aria-selected={idx === selectedIndex}
                    className={`account-wrapper ${idx === selectedIndex ? 'selected' : ''}`}
                    onClick={() => onSelect(idx)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') onSelect(idx);
                    }}
                >
                    <AccountCard account={acc} onCopy={onCopy} />
                </div>
            ))}

            <div
                className="account-wrapper add-card"
                role="button"
                aria-label="Додати рахунок"
                tabIndex={0}
                onClick={onAddAccount}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onAddAccount();
                }}
            >
                <div className="account-card add-account">
                    <div className="plus-icon">+</div>
                    <div>Додати рахунок</div>
                </div>
            </div>
        </div>
    );
};

export default AccountsSection;
