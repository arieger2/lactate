import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { calculateThresholds } from '@/lib/lactateCalculations';
import { LactateDataPoint, LactateTrendData } from '@/lib/types';

type TrendDataByUnit = {
  watt: LactateTrendData[];
  kmh: LactateTrendData[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');

  if (!customerId) {
    return NextResponse.json({ message: 'Customer ID is required' }, { status: 400 });
  }

  try {
    const testsResponse = await pool.query(
      `SELECT test_id, created_at, unit FROM test_infos WHERE profile_id = $1 ORDER BY created_at ASC`,
      [customerId]
    );

    if (testsResponse.rows.length === 0) {
      return NextResponse.json({ watt: [], kmh: [] });
    }

    const trendDataByUnit: TrendDataByUnit = {
      watt: [],
      kmh: [],
    };

    for (const test of testsResponse.rows) {
      const stagesResponse = await pool.query(
        `SELECT load, lactate_mmol as lactate FROM stages WHERE test_id = $1 AND load IS NOT NULL AND lactate_mmol IS NOT NULL ORDER BY stage ASC`,
        [test.test_id]
      );

      const lactateData: LactateDataPoint[] = stagesResponse.rows.map(r => ({
        power: parseFloat(r.load),
        lactate: parseFloat(r.lactate)
      }));

      if (lactateData.length > 2) {
        const { lt1, lt2 } = calculateThresholds(lactateData, 'dickhuth');
        const trendPoint = {
          created_at: test.created_at,
          lt1_load: lt1 ? lt1.power : null,
          lt1_lactate: lt1 ? lt1.lactate : null,
          lt2_load: lt2 ? lt2.power : null,
          lt2_lactate: lt2 ? lt2.lactate : null,
        };
        
        if (test.unit === 'watt') {
          trendDataByUnit.watt.push(trendPoint);
        } else if (test.unit === 'kmh') {
          trendDataByUnit.kmh.push(trendPoint);
        }
      }
    }

    return NextResponse.json(trendDataByUnit);
  } catch (error) {
    console.error('Error fetching lactate trend data:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
