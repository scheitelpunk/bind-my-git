import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '@/services/items';

export const useItem = (id: string | undefined) => {
  return useQuery({
    queryKey: ['item', id],
    queryFn: () => itemsApi.getItem(id!),
    enabled: !!id,
  });
};

export const useItems = () => {
  return useQuery({
    queryKey: ['items'],
    queryFn: () => itemsApi.getItems(),
  });
};

export const useItemsByOrder = (orderId: string | undefined) => {
  return useQuery({
    queryKey: ['items', 'order', orderId],
    queryFn: () => itemsApi.getItemsByOrder(orderId!),
    enabled: !!orderId,
  });
};

export const useCreateItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: itemsApi.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      itemsApi.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

export const useDeleteItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: itemsApi.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};
