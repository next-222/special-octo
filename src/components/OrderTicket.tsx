import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, TrendingUp, TrendingDown } from 'lucide-react';

type Props = {
  onTradeExecuted: () => void;
};

type OrderSide = 'BUY' | 'SELL';
type OrderType = 'MARKET' | 'LIMIT';

export default function OrderTicket({ onTradeExecuted }: Props) {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mexc-trade`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            symbol,
            side,
            orderType,
            quantity: parseFloat(quantity),
            price: orderType === 'LIMIT' ? parseFloat(price) : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute trade');
      }

      setSuccess(`${side} order placed successfully for ${quantity} ${symbol}`);
      setQuantity('');
      setPrice('');
      onTradeExecuted();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="w-6 h-6 text-emerald-500" />
        <h2 className="text-xl font-semibold text-white">Place Order</h2>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500 text-emerald-500 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Order Side
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  side === 'BUY'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Buy
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  side === 'SELL'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                Sell
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Order Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderType('MARKET')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  orderType === 'MARKET'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Market
              </button>
              <button
                type="button"
                onClick={() => setOrderType('LIMIT')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  orderType === 'LIMIT'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Limit
              </button>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="symbol" className="block text-sm font-medium text-slate-300 mb-2">
            Trading Pair
          </label>
          <input
            id="symbol"
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            required
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            placeholder="BTCUSDT"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-slate-300 mb-2">
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="0.001"
            />
          </div>

          {orderType === 'LIMIT' && (
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-slate-300 mb-2">
                Price
              </label>
              <input
                id="price"
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="50000"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 px-4 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${
            side === 'BUY'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500'
              : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
          }`}
        >
          {loading ? 'Placing Order...' : `${side} ${symbol}`}
        </button>
      </form>
    </div>
  );
}
