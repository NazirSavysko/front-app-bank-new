import { useQuery } from '@tanstack/react-query';
import { fetchCustomerData } from '../api';
import type { CustomerData } from '../types';

export const useAccounts = () => {
    const query = useQuery<CustomerData, Error>({
        queryKey: ['customer'],
        queryFn: fetchCustomerData,
        staleTime: 1000 * 60 * 5,
    });

    return {
        customer: query.data,
        accounts: query.data?.accounts ?? [],
        isLoading: query.isLoading,
        error: query.error ?? null,
        refetch: query.refetch,
    };
};
