// src/types.ts
// Общие интерфейсы для банковской панели

/** Filter values for history endpoint */
export type HistoryFilter = 'ALL' | 'TRANSFERS' | 'PAYMENTS';

/** Unified transaction history DTO from backend */
export interface Transaction {
    id?: string | number;
    direction: 'INCOME' | 'EXPENSE';
    type: 'TRANSFER' | 'IBAN_PAYMENT' | 'INTERNET_PAYMENT';
    amount: number;
    currency: string;        // "UAH" | "USD" | "EUR"
    date: string;            // ISO
    status: string;          // "COMPLETED" | "CANCELED" | ...
    description?: string;
    // TRANSFER type fields
    counterpartyName?: string;
    counterpartyCard?: string;
    // IBAN_PAYMENT type fields
    beneficiaryName?: string;
    iban?: string;
    // INTERNET_PAYMENT type fields
    provider?: string;
}

export interface Page<T> {
    content: T[];
    pageable: {
        pageNumber: number;
        pageSize: number;
    };
    totalPages: number;
    totalElements: number;
    first: boolean;
    last: boolean;
}

/** Сохранённый платёж (шаблон) */
export interface Payment {
    concurrency: string;
    amount: string;
    beneficiaryName: string;
    purpose: string;
}

export interface AnalyticsSummary {
    accountNumber: string;
    year: number;
    month: number;
    totalIncome: number;
    totalExpense: number;
    operationsCount: number;
    currency: string;
}

/** Счёт/карта */
export interface Account {
    id: number;
    accountNumber: string;
    balance: number;
    currency: string; // "UAH" | "USD" | "EUR"
    status: string;
    card: {
        cardNumber: string;
        expirationDate: string;
        cvv: string;
    };
    // transactions: Transaction[]; // REMOVED
    // payments: Payment[]; // REMOVED
}

/** Клиент */
export interface CustomerData {
    accounts: Account[];
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
}

/** Успешный результат перевода (для модалки) */
export interface TransferSuccess {
    sender: { firstName: string; lastName: string };
    receiver: { firstName: string; lastName: string };
    amount: number;
    currencyCode: string;
    description: string;
    transactionDate: string;
    numberOfCard: string;
    status: string;
}

export interface IbanPaymentRequest {
    accountId: number;      // ID счета отправителя (внимание: именно ID, а не accountNumber)
    amount: number;         // Сумма платежа
    recipientName: string;  // ПИБ или название компании
    recipientIban: string;  // IBAN получателя (должен начинаться с UA)
    taxNumber: string;      // ЄДРПОУ / ІПН
    purpose: string;        // Назначение платежа
}

export interface InternetPaymentRequest {
    accountId: number;      // ID счета отправителя
    amount: number;         // Сумма платежа
    providerName: string;   // Название провайдера (например, "Lanet")
    contractNumber: string; // Номер договора / лицевой счет
}
