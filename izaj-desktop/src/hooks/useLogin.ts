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
  const [isLoading, setIsLoading] = useState(false);
  const [rememberedAccounts, setRememberedAccounts] = useState<
    { email: string; password: string }[]
  >([]);

  useEffect(() => {
    const stored = localStorage.getItem('rememberedAccounts');
    if (stored) {
      const parsed = JSON.parse(stored);
      setRememberedAccounts(parsed);
      
      // Load the last remembered email if available
      if (parsed.length > 0) {
        const lastAccount = parsed[parsed.length - 1];
        setEmail(lastAccount.email);
      }
    }
  }, []);

  useEffect(() => {
    const match = rememberedAccounts.find((acc) => acc.email === email);
    if (match && match.password) {
      try {
        setPassword(decrypt(match.password));
      } catch (error) {
        setPassword('');
      }
    } else {
      setPassword('');
    }
  }, [email, rememberedAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const data = await authService.login({ email, password });

      if (rememberMe) {
        const updated = [
          ...rememberedAccounts.filter((acc) => acc.email !== email),
          { email, password: encrypt(password) },
        ];
        localStorage.setItem('rememberedAccounts', JSON.stringify(updated));
        setRememberedAccounts(updated);
      } else {
        // Still save email, but don't save password
        const updated = [
          ...rememberedAccounts.filter((acc) => acc.email !== email),
          { email, password: '' },
        ];
        localStorage.setItem('rememberedAccounts', JSON.stringify(updated));
        setRememberedAccounts(updated);
      }

      onLogin(data.session);
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
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
    isLoading,
    handleSubmit,
    handleForgotPassword,
    rememberedAccounts,
  };
};
