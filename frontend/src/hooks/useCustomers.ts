import { useQuery } from '@tanstack/react-query';
import { customersApi } from '@/services/customers';

export const useCustomer = (id: string | undefined) => {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getCustomer(id!),
    enabled: !!id,
  });
};

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getCustomers(),
  });
};
