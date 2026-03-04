// src/api.ts
import type { CustomerData, Account, Transaction, Page, AnalyticsSummary, CreateTransaction } from './types';

const getAuthHeaders = () => {
    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
    };
};

const generateIdempotencyKey = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export class TransactionApiError extends Error {
    status: number;
    fieldErrors: string[];

    constructor(message: string, status: number, fieldErrors: string[] = []) {
        super(message);
        this.name = 'TransactionApiError';
        this.status = status;
        this.fieldErrors = fieldErrors;
    }
}

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
        cache: 'no-store',
        headers: {
            ...getAuthHeaders(),
            'Cache-Control': 'no-store',
        },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to fetch transactions');
    }

    return res.json();
};

export const withdraw = async (payload: CreateTransaction) => {
    const res = await fetch('/api/transactions/withdraw', {
        method: 'POST',
        headers: {
            ...getAuthHeaders(),
            'X-Idempotency-Key': generateIdempotencyKey(),
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({} as { message?: string; errors?: Record<string, string[]> }));
        const fieldErrors = body.errors
            ? Object.entries(body.errors).flatMap(([field, messages]) =>
                (Array.isArray(messages) ? messages : [String(messages)]).map((msg: string) => `${field}: ${msg}`)
            )
            : [];

        if (res.status === 400 || res.status === 402 || res.status === 403) {
            throw new TransactionApiError(body.message || 'Transaction failed', res.status, fieldErrors);
        }

        throw new Error(body.message || 'Transaction failed');
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
