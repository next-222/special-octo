import { useState, useEffect } from 'react';
import { supabase, Trade } from '../lib/supabase';
import ConnectMexc from '../components/ConnectMexc';
import OrderTicket from '../components/OrderTicket';
import { LogOut, TrendingUp, Activity } from 'lucide-react';
import { mexcStatus } from '../lib/mexcConnect';

export default function Dashboard() {
  const [connected, setConnected] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || '');

      const status = await mexcStatus();
      setConnected(status.connected);

      const { data: tradesData } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setTrades(tradesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleConnectionUpdate = () => {
    loadData();
  };

  const handleTradeExecuted = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-500" />
              <h1 className="text-2xl font-bold text-white">MEXC Mini</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-400 text-sm">{userEmail}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <ConnectMexc
              connected={connected}
              onUpdate={handleConnectionUpdate}
            />
          </div>
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg font-semibold text-white">Quick Stats</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Trades</span>
                <span className="text-white font-semibold">{trades.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">MEXC Status</span>
                <span className={`font-semibold ${connected ? 'text-emerald-500' : 'text-slate-500'}`}>
                  {connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {connected && (
          <div className="mb-8">
            <OrderTicket onTradeExecuted={handleTradeExecuted} />
          </div>
        )}

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Trades</h2>
          {trades.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No trades yet. Start trading to see your history here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-slate-400 font-medium py-3 px-4">Symbol</th>
                    <th className="text-left text-slate-400 font-medium py-3 px-4">Side</th>
                    <th className="text-left text-slate-400 font-medium py-3 px-4">Type</th>
                    <th className="text-right text-slate-400 font-medium py-3 px-4">Quantity</th>
                    <th className="text-right text-slate-400 font-medium py-3 px-4">Price</th>
                    <th className="text-left text-slate-400 font-medium py-3 px-4">Status</th>
                    <th className="text-left text-slate-400 font-medium py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 text-white font-medium">{trade.symbol}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          trade.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.side}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{trade.order_type}</td>
                      <td className="py-3 px-4 text-right text-white">{trade.quantity}</td>
                      <td className="py-3 px-4 text-right text-white">{trade.price || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          trade.status === 'FILLED' ? 'bg-emerald-500/20 text-emerald-400' :
                          trade.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-sm">
                        {new Date(trade.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
