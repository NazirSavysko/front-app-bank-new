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
    isRecipient: boolean;    // true: вхідна транзакція (дохід), false: вихідна (витрата)
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

export type AccountType = 'CURRENT' | 'FOP';

/** Счёт/карта */
export interface Account {
    id: number;
    accountNumber: string;
    accountType?: AccountType;
    balance: number;
    currency: string; // "UAH" | "USD" | "EUR"
    edrpou?: string;
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
