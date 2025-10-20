import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/services/users';
import type { User } from '@/types';

export const useUsers = () => {
  return useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: usersApi.getUsers,
    staleTime: 5 * 60 * 1000,
  });
};
