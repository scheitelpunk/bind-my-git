import { api } from './api';
import type { Order } from '@/types';

export const ordersApi = {
  // Get all orders
  getOrders: (): Promise<Order[]> => {
    return api.get<Order[]>('/orders');
  },

  // Get order by ID
  getOrder: (id: string): Promise<Order> => {
    return api.get<Order>(`/orders/${id}`);
  },

  // Create new order
  createOrder: (data: {
    order_id?: string;
    description?: string;
    comment?: string;
  }): Promise<Order> => {
    return api.post<Order>('/orders', data);
  },

  // Update order
  updateOrder: (id: string, data: {
    order_id?: string;
    description?: string;
    comment?: string;
  }): Promise<Order> => {
    return api.put<Order>(`/orders/${id}`, data);
  },

  // Delete order
  deleteOrder: (id: string): Promise<void> => {
    return api.delete<void>(`/orders/${id}`);
  },
};
