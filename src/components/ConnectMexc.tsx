import { useState, FormEvent } from 'react';
import { supabase, MexcConnection } from '../lib/supabase';
import { Link2, CheckCircle, AlertCircle } from 'lucide-react';

type Props = {
  connection: MexcConnection | null;
  onUpdate: () => void;
};

export default function ConnectMexc({ connection, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mexc-connect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey,
            apiSecret,
            userId: user.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect MEXC');
      }

      setSuccess('MEXC API connected successfully!');
      setApiKey('');
      setApiSecret('');
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your MEXC API?')) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('mexc_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setSuccess('MEXC API disconnected');
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link2 className="w-6 h-6 text-emerald-500" />
          <h2 className="text-xl font-semibold text-white">MEXC Connection</h2>
        </div>
        {connection?.is_active && !isEditing && (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-emerald-500 font-medium">Connected</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500 text-emerald-500 px-4 py-3 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {!connection?.is_active || isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-slate-300 mb-2">
              MEXC API Key
            </label>
            <input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="Enter your MEXC API key"
            />
          </div>

          <div>
            <label htmlFor="apiSecret" className="block text-sm font-medium text-slate-300 mb-2">
              MEXC API Secret
            </label>
            <input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="Enter your MEXC API secret"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {loading ? 'Connecting...' : 'Connect MEXC'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all"
              >
                Cancel
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Your API credentials are encrypted and stored securely. Make sure your API key has trading permissions enabled.
          </p>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-slate-300 text-sm mb-2">API Key</p>
            <p className="text-white font-mono text-sm break-all">
              {connection.api_key_encrypted.substring(0, 20)}...
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all"
            >
              Update Credentials
            </button>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
