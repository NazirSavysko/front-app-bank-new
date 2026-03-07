// src/api.ts
import type { CustomerData, Account, Transaction, Page, AnalyticsSummary, IbanPaymentRequest, InternetPaymentRequest } from './types';

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
    const res = await fetch(`/api/v1/transactions/history?accountNumber=${accountNumber}&page=${page}&size=${pageSize}`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to fetch transactions');
    }

    return res.json();
};

export const fetchAnalyticsSummary = async (
    accountNumber: string,
    year: number,
    month: number
): Promise<AnalyticsSummary> => {
    const backendMonth = month + 1;
    const res = await fetch(`/api/v1/analytics/summary?accountNumber=${accountNumber}&year=${year}&month=${backendMonth}`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!res.ok) {
        throw new Error('Failed to fetch analytics summary');
    }

    const data = await res.json();

    // Backend returns totalIncoming/totalOutgoing/totalTransactions, map it to UI fields.
    return {
        accountNumber,
        year,
        month: backendMonth,
        totalIncome: Number(data.totalIncome ?? data.totalIncoming ?? 0),
        totalExpense: Number(data.totalExpense ?? data.totalOutgoing ?? 0),
        operationsCount: Number(data.operationsCount ?? data.totalTransactions ?? 0),
        currency: data.currency ?? '',
    };
};

export const createIbanPayment = async (payload: IbanPaymentRequest) => {
    const res = await fetch('/api/v1/payments/iban', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Помилка при створенні платежу IBAN');
    }
    return res.json();
};

export const createInternetPayment = async (payload: InternetPaymentRequest) => {
    const res = await fetch('/api/v1/payments/internet', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Помилка при оплаті Інтернету');
    }
    return res.json();
};
