// src/types.ts
// Общие интерфейсы для банковской панели

/** Одна транзакция (между картами/счетами) */
export interface Transaction {
    senderCardNumber: string;
    receiverCardNumber: string;
    // Add sender/receiver info for display
    sender?: { firstName: string; lastName: string };
    receiver?: { firstName: string; lastName: string };
    amount: number;
    description: string;
    transactionDate: string; // ISO
    transactionType: string; // e.g. "TRANSFER"
    currencyCode: string;    // "UAH" | "USD" | "EUR"
    status: string;          // "COMPLETED" | "CANCELED" | ...
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

/** Счёт/карта */
export interface Account {
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
