import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchTransactions } from '../api';
import type { Page, Transaction } from '../types';

const PAGE_SIZE = 10;

export const useTransactions = (accountNumber?: string) => {
    const query = useInfiniteQuery<Page<Transaction>, Error>({
        queryKey: ['transactions', accountNumber],
        queryFn: ({ pageParam = 0 }) => {
            if (!accountNumber) {
                throw new Error('Account number is required');
            }

            return fetchTransactions(accountNumber, pageParam as number, PAGE_SIZE);
        },
        enabled: Boolean(accountNumber),
        initialPageParam: 0,
        getNextPageParam: lastPage => (
            lastPage.last ? undefined : lastPage.pageable.pageNumber + 1
        ),
        staleTime: 1000 * 60 * 5,
    });

    const transactions = useMemo(
        () => query.data?.pages.flatMap(page => page.content) ?? [],
        [query.data]
    );

    return {
        transactions,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error ?? null,
        fetchNextPage: query.fetchNextPage,
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
    };
};
