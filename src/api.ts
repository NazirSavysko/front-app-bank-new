// src/api.ts
import type {
    CustomerData,
    Account,
    AccountType,
    AccountCurrency,
    Transaction,
    Page,
    AnalyticsSummary,
    IbanPaymentRequest,
    InternetPaymentRequest,
    MobilePaymentRequest,
    TaxPaymentRequest,
    CommunalPaymentRequest,
    ElectronicsPaymentRequest,
    TrainPaymentRequest,
    ChangePasswordRequest,
    ChangeEmailRequest,
} from './types';

const getAuthHeaders = () => {
    const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
    };
};

const createTransactionsPage = ({
    content,
    pageNumber,
    pageSize,
    first,
    last,
    totalPages,
    totalElements,
}: {
    content: Transaction[];
    pageNumber: number;
    pageSize: number;
    first?: boolean;
    last?: boolean;
    totalPages?: number;
    totalElements?: number;
}): Page<Transaction> => {
    const inferredLastPage = typeof last === 'boolean' ? last : content.length < pageSize;
    const estimatedTotalPages = inferredLastPage ? pageNumber + 1 : pageNumber + 2;
    const estimatedTotalElements = pageNumber * pageSize + content.length;

    return {
        content,
        pageable: {
            pageNumber,
            pageSize,
        },
        totalPages: typeof totalPages === 'number' ? totalPages : estimatedTotalPages,
        totalElements: typeof totalElements === 'number' ? totalElements : estimatedTotalElements,
        first: typeof first === 'boolean' ? first : pageNumber === 0,
        last: inferredLastPage,
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

export const createAccount = async ({
    accountType,
    currency,
}: {
    accountType: AccountType;
    currency: AccountCurrency;
}): Promise<Account> => {
    const res = await fetch('/api/v1/accounts/create', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ accountType, currency }),
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

    const data = await res.json();

    if (Array.isArray(data)) {
        return createTransactionsPage({
            content: data,
            pageNumber: page,
            pageSize,
        });
    }

    const content = Array.isArray(data?.content) ? data.content : [];
    const resolvedPageNumber = typeof data?.pageable?.pageNumber === 'number' ? data.pageable.pageNumber : page;
    const resolvedPageSize = typeof data?.pageable?.pageSize === 'number' ? data.pageable.pageSize : pageSize;
    return createTransactionsPage({
        content,
        pageNumber: resolvedPageNumber,
        pageSize: resolvedPageSize,
        totalPages: typeof data?.totalPages === 'number' ? data.totalPages : undefined,
        totalElements: typeof data?.totalElements === 'number' ? data.totalElements : undefined,
        first: typeof data?.first === 'boolean' ? data.first : undefined,
        last: typeof data?.last === 'boolean' ? data.last : undefined,
    });
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
        totalMobileExpenses: Number(data.totalMobileExpenses ?? 0),
        totalInternetExpenses: Number(data.totalInternetExpenses ?? 0),
        totalIbanExpenses: Number(data.totalIbanExpenses ?? 0),
        totalTaxExpenses: Number(data.totalTaxExpenses ?? 0),
        totalElectronicsExpenses: Number(data.totalElectronicsExpenses ?? 0),
        totalCardToCardExpenses: Number(data.totalCardToCardExpenses ?? 0),
        totalUtilityExpenses: Number(data.totalUtilityExpenses ?? 0),
    };
};

export const sendEmailVerificationCode = async (email: string): Promise<void> => {
    const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email }),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Не вдалося відправити код');
    }
};

export const verifyEmailVerificationCode = async (email: string, code: string): Promise<void> => {
    const res = await fetch('/api/email/check', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email, code }),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Невірний код підтвердження');
    }
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
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
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
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

export const createMobilePayment = async (payload: MobilePaymentRequest) => {
    const res = await fetch('/api/v1/payments/mobile', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Помилка при поповненні мобільного');
    }
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

export const createTaxPayment = async (data: TaxPaymentRequest): Promise<unknown> => {
    const res = await fetch('/api/v1/payments/taxes', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Помилка при оплаті податків');
    }

    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

export const createElectronicsPayment = async (data: ElectronicsPaymentRequest): Promise<unknown> => {
    const res = await fetch('/api/v1/payments/electronics', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Помилка при оплаті електроніки');
    }

    if (typeof res.text === 'function') {
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }
    return res;
};

export const createTrainPayment = async (data: TrainPaymentRequest): Promise<unknown> => {
    const res = await fetch('/api/v1/payments/train', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Помилка при оплаті квитків на потяг');
    }

    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

export const createCommunalPayment = async (data: CommunalPaymentRequest): Promise<unknown> => {
    const res = await fetch('/api/v1/payments/communal', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Помилка при оплаті комунальних послуг');
    }

    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

// Profile settings: Password
export const requestPasswordChangeCode = async (): Promise<unknown> => {
    return requestSettingsCode('password');
};

export const changePassword = async (verificationCode: string, newPassword: string): Promise<unknown> => {
    return submitSettingsChange('password', { verificationCode, newPassword });
};

// Profile settings: Email
export const requestEmailChangeCode = async (): Promise<unknown> => {
    return requestSettingsCode('email');
};

export const changeEmail = async (verificationCode: string, newEmail: string): Promise<unknown> => {
    return submitSettingsChange('email', { verificationCode, newEmail });
};

export const requestSettingsCode = async (type: 'password' | 'email'): Promise<unknown> => {
    const res = await fetch(`/api/v1/customers/me/settings/${type}/init`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to request verification code');
    }

    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

export const submitSettingsChange = async (
    type: 'password' | 'email',
    data: ChangePasswordRequest | ChangeEmailRequest
): Promise<unknown> => {
    const res = await fetch(`/api/v1/customers/me/settings/${type}/change`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to submit settings change');
    }

    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};
