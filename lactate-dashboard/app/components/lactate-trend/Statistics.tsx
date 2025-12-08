import React from 'react';
import { LactateTrendData } from '@/lib/types';

interface StatisticsProps {
  data: LactateTrendData[];
  unit: 'Watt' | 'km/h';
}

const Statistics: React.FC<StatisticsProps> = ({ data, unit }) => {
  const latestPoint = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="mt-4">
      {latestPoint ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
          <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <h3 className="text-md font-semibold text-zinc-600 dark:text-zinc-300">Latest LT1</h3>
            <p className="text-2xl font-bold text-green-500">
              {latestPoint.lt1_load.toFixed(2)} {unit}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              @ {latestPoint.lt1_lactate.toFixed(2)} mmol/L
            </p>
          </div>
          <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <h3 className="text-md font-semibold text-zinc-600 dark:text-zinc-300">Latest LT2</h3>
            <p className="text-2xl font-bold text-red-500">
              {latestPoint.lt2_load.toFixed(2)} {unit}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              @ {latestPoint.lt2_lactate.toFixed(2)} mmol/L
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <p className="text-zinc-500 dark:text-zinc-400">No statistics available.</p>
        </div>
      )}
    </div>
  );
};

export default Statistics;
