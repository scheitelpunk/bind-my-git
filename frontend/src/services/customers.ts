import { api } from './api';
import type { Customer } from '@/types';

export const customersApi = {
  // Get customer by ID
  getCustomer: (id: string): Promise<Customer> => {
    return api.get<Customer>(`/customers/${id}`);
  },

  // Get all customers
  getCustomers: (): Promise<Customer[]> => {
    return api.get<Customer[]>('/customers/');
  },
};
