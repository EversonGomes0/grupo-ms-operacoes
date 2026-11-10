import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UseIsAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error: Error | null;
}

export const useIsAdmin = (): UseIsAdminResult => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setIsAdmin(false);
      setError(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);

    const fetchAdminStatus = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('is_admin');
        if (rpcError) throw rpcError;

        if (!active) return;
        setIsAdmin(data);
      } catch (error) {
        if (!active) return;
        console.error('Erro ao verificar papel de administrador:', error);
        setIsAdmin(false);
        setError(error instanceof Error ? error : new Error('Falha ao consultar o papel de administrador.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchAdminStatus();

    return () => {
      active = false;
    };
  }, [userId]);

  return { isAdmin, loading, error };
};
