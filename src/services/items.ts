import { api } from './api';
import type { Item } from '@/types';

export const itemsApi = {
  // Get all items
  getItems: (): Promise<Item[]> => {
    return api.get<Item[]>('/items');
  },

  // Get items by order ID
  getItemsByOrder: (orderId: string): Promise<Item[]> => {
    return api.get<Item[]>(`/items/by-order/${orderId}`);
  },

  // Get item by ID
  getItem: (id: string): Promise<Item> => {
    return api.get<Item>(`/items/${id}`);
  },

  // Create new item
  createItem: (data: {
    order_id: string;
    price_per_unit?: number;
    units?: number;
    description?: string;
    comment?: string;
    material_number?: string;
  }): Promise<Item> => {
    return api.post<Item>('/items', data);
  },

  // Update item
  updateItem: (id: string, data: {
    price_per_unit?: number;
    units?: number;
    description?: string;
    comment?: string;
    material_number?: string;
  }): Promise<Item> => {
    return api.put<Item>(`/items/${id}`, data);
  },

  // Delete item
  deleteItem: (id: string): Promise<void> => {
    return api.delete<void>(`/items/${id}`);
  },
};
