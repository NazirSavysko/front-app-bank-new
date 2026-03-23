// src/utils/datetime.ts

/**
 * Обрізає дробову частину секунд до 3 знаків (мілісекунди),
 * щоб new Date(...) коректно парсив ISO з наносекундами (9 знаків).
 * Приклади:
 *  2025-09-05T02:41:24.408172200 -> 2025-09-05T02:41:24.408
 */
export function normalizeIso(iso: string): string {
    return iso.replace(
        /(T\d{2}:\d{2}:\d{2}\.)(\d{3})\d+/, // лишаємо перші 3 цифри мілісекунд
        (_m, head, ms) => `${head}${ms}`
    );
}

/** Безпечний парсер ISO -> Date (через normalizeIso) */
export function parseSafeDate(iso: string): Date {
    let s = normalizeIso(iso);
    // Додаємо Z, якщо немає інформації про часовий пояс (Z або ±HH:mm),
    // щоб дата сприймалася як UTC, а не локальна
    if (!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
        s += 'Z';
    }
    return new Date(s);
}

/** Форматування дати для UI */
export function formatUkDateTime(iso: string): string {
    return parseSafeDate(iso).toLocaleString('uk-UA');
}
