import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { encrypt, decrypt } from '../utils/crypto';

interface UseLoginProps {
  onLogin: (session: any) => void;
}

export const useLogin = ({ onLogin }: UseLoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rememberedAccounts, setRememberedAccounts] = useState<
    { email: string; password: string }[]
  >([]);

  useEffect(() => {
    const stored = localStorage.getItem('rememberedAccounts');
    if (stored) {
      const parsed = JSON.parse(stored);
      setRememberedAccounts(parsed);
    }
  }, []);

  useEffect(() => {
    const match = rememberedAccounts.find((acc) => acc.email === email);
    if (match) {
      setPassword(decrypt(match.password));
    } else {
      setPassword('');
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await authService.login({ email, password });
      setError('');
      setSuccess('');

      if (rememberMe) {
        const updated = [
          ...rememberedAccounts.filter((acc) => acc.email !== email),
          { email, password: encrypt(password) },
        ];
        localStorage.setItem('rememberedAccounts', JSON.stringify(updated));
        setRememberedAccounts(updated);
      } else {
        const filtered = rememberedAccounts.filter((acc) => acc.email !== email);
        localStorage.setItem('rememberedAccounts', JSON.stringify(filtered));
        setRememberedAccounts(filtered);
      }

      onLogin(data.session);
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await authService.forgotPassword(email);
      setSuccess('The link has been sent to your email, follow the instructions in order to proceed');
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    error,
    success,
    handleSubmit,
    handleForgotPassword,
    rememberedAccounts,
  };
};
