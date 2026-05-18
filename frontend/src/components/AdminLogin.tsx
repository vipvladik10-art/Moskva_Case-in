import { useState } from 'react';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/auth';

export function AdminLogin() {
  const { token, role, setAuth, clearAuth, isAdmin } = useAuthStore();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ role: 'viewer' | 'admin'; token: string }>('/auth/login', {
        token: input.trim(),
      });
      setAuth(data.token, data.role);
      setInput('');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(
        status === 401
          ? 'Неверный токен (проверьте ADMIN_API_TOKEN в .env)'
          : 'Не удалось связаться с API',
      );
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin()) {
    return (
      <span className="status-pill ok" title={token ?? undefined}>
        Админ
        <button type="button" className="ghost" style={{ marginLeft: 8 }} onClick={clearAuth}>
          Выйти
        </button>
      </span>
    );
  }

  return (
    <div className="row" style={{ gap: 6, alignItems: 'center' }}>
      <span className="status-pill">{role === 'viewer' ? 'Просмотр' : 'Гость'}</span>
      <input
        type="password"
        placeholder="admin или dev-admin-token"
        title="Токен из ADMIN_API_TOKEN в .env"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && login()}
        style={{
          width: 120,
          background: 'var(--c-surface-2)',
          border: '1px solid var(--c-border)',
          color: 'var(--c-text)',
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 12,
        }}
      />
      <button type="button" onClick={login} disabled={loading || !input.trim()}>
        {loading ? '…' : 'Вход'}
      </button>
      {error && (
        <span className="muted" style={{ fontSize: 11 }}>
          {error}
        </span>
      )}
    </div>
  );
}

