// src/api.ts
import type { CustomerData, Account, Transaction, Page } from './types';

const getAuthHeaders = () => {
    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
    };
};

export const fetchCustomerData = async (): Promise<CustomerData> => {
    const res = await fetch('/api/customers/customer', {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
            sessionStorage.removeItem('accessToken');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('customerData');
            window.location.reload();
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to fetch customer data');
    }

    return res.json();
};

export const createAccount = async (accountType: string): Promise<Account> => {
    const res = await fetch('/api/accounts/create', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ accountType }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to create account');
    }

    return res.json();
};

export const fetchTransactions = async (
    accountNumber: string,
    page: number,
    pageSize: number
): Promise<Page<Transaction>> => {
    const res = await fetch(`/api/transactions/transactions?accountNumber=${accountNumber}&page=${page}&size=${pageSize}`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to fetch transactions');
    }

    return res.json();
};

export const fetchAllTransactions = async (
    accountNumber: string,
    pageSize = 100
): Promise<Transaction[]> => {
    const transactions: Transaction[] = [];
    let page = 0;
    const maxPages = 50;

    try {
        while (page < maxPages) {
            const result = await fetchTransactions(accountNumber, page, pageSize);
            transactions.push(...result.content);

            const nextPage = result.pageable.pageNumber + 1;
            if (result.last || nextPage >= result.totalPages) {
                return transactions;
            }

            page = nextPage;
        }

        throw new Error('Transaction analytics page limit exceeded');
    } catch (error) {
        throw new Error(
            error instanceof Error
                ? `Failed to fetch analytics transactions: ${error.message}`
                : 'Failed to fetch analytics transactions'
        );
    }
};
