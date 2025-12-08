'use client';

import { useState, useEffect } from 'react';
import { useCustomer } from '@/lib/CustomerContext';
import TrendChart from './lactate-trend/TrendChart';
import Statistics from './lactate-trend/Statistics';
import { LactateTrendData } from '@/lib/types';

type TrendDataByUnit = {
  watt: LactateTrendData[];
  kmh: LactateTrendData[];
};

export default function LactateGraph() {
  const { selectedCustomer, dataVersion } = useCustomer();
  const [data, setData] = useState<TrendDataByUnit>({ watt: [], kmh: [] });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('all');

  useEffect(() => {
    if (!selectedCustomer) {
      setData({ watt: [], kmh: [] });
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/lactate-trend?customerId=${selectedCustomer.customer_id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch lactate trend data');
        }
        const fetchedData: TrendDataByUnit = await response.json();
        setData(fetchedData);
      } catch (error) {
        console.error(error);
        setData({ watt: [], kmh: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCustomer, dataVersion]);

  const filterDataByTimeRange = (data: LactateTrendData[]) => {
    return data.filter(point => {
      const pointDate = new Date(point.created_at);
      const now = new Date();
      const diffHours = (now.getTime() - pointDate.getTime()) / (1000 * 60 * 60);

      if (timeRange === 'all') return true;

      switch (timeRange) {
        case '24h':
          return diffHours <= 24;
        case '7d':
          return diffHours <= 24 * 7;
        case '30d':
          return diffHours <= 24 * 30;
        default:
          return true;
      }
    });
  };

  const filteredWattData = filterDataByTimeRange(data.watt);
  const filteredKmhData = filterDataByTimeRange(data.kmh);

  return (
    <div className="space-y-6">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {filteredWattData.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Lactate Threshold Trends (Watt)
                </h2>
                <div className="flex gap-2">
                  {(['24h', '7d', '30d', 'all'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        timeRange === range
                          ? 'bg-primary text-white'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                      }`}
                    >
                      {range.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <TrendChart data={filteredWattData} timeRange={timeRange} loading={loading} unit="Watt" />
              <Statistics data={filteredWattData} unit="Watt" />
            </div>
          )}
          {filteredKmhData.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Lactate Threshold Trends (km/h)
                </h2>
                <div className="flex gap-2">
                  {(['24h', '7d', '30d', 'all'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        timeRange === range
                          ? 'bg-primary text-white'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                      }`}
                    >
                      {range.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <TrendChart data={filteredKmhData} timeRange={timeRange} loading={loading} unit="km/h" />
              <Statistics data={filteredKmhData} unit="km/h" />
            </div>
          )}
        </>
      )}
    </div>
  );
}