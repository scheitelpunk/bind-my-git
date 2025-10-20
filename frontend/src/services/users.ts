import {api} from './api';
import type {User} from '@/types';

export const usersApi = {
    // Fetch all users (could be paginated later if needed)
    getUsers: (): Promise<User[]> => {
        // Backend endpoint as specified: users/
        return api.get<User[]>('/users/');
    },
    createUser: (userId: string) => {
        // Forward the user id in the POST body
        return api.post<void>('/users/', {keycloak_id: userId});
    },
};
