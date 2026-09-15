import { useState } from 'react';
import axios from 'axios';
import type { AxiosError } from 'axios';
import type { AuthResponse } from '../models/User.model';

const API_URL = 'http://localhost:3000/api/v1';

export const useAuthController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string): Promise<AuthResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem('access_token', response.data.accessToken);
      localStorage.setItem('refresh_token', response.data.refreshToken);
      return response.data;
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>
      setError(axiosError.response?.data?.message || 'Erreur lors de la connexion');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};
