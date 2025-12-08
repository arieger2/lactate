'use client';

import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import { LactateTrendData } from '@/lib/types';

interface TrendChartProps {
  data: LactateTrendData[];
  timeRange: '24h' | '7d' | '30d' | 'all';
  loading: boolean;
  unit: 'Watt' | 'km/h';
}

export default function TrendChart({ data, timeRange, loading, unit }: TrendChartProps) {
  const trendChartRef = useRef<HTMLDivElement>(null);
  const trendChartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (trendChartRef.current && !trendChartInstance.current) {
      trendChartInstance.current = echarts.init(trendChartRef.current);
    }

    const handleResize = () => trendChartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (trendChartInstance.current && !trendChartInstance.current.isDisposed()) {
        trendChartInstance.current.dispose();
      }
      trendChartInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (trendChartInstance.current) {
      const getChartOption = () => {
        const dates = data.map(d => new Date(d.created_at).toLocaleDateString());
        const lt1Values = data.map(d => d.lt1_load);
        const lt2Values = data.map(d => d.lt2_load);

        return {
          title: { show: false },
          tooltip: {
            trigger: 'axis',
            formatter: (params: any) => {
              const dataIndex = params[0].dataIndex;
              const date = data[dataIndex].created_at;
              let tooltipHtml = `<div style="padding: 8px;"><strong>${new Date(date).toLocaleDateString()}</strong><br/>`;
              params.forEach((param: any) => {
                tooltipHtml += `${param.seriesName}: <span style="color: ${param.color}; font-weight: bold;">${param.value ? param.value.toFixed(2) : 'N/A'}</span><br/>`;
              });
              tooltipHtml += '</div>';
              return tooltipHtml;
            }
          },
          legend: {
            data: ['LT1', 'LT2'],
            textStyle: { color: '#9ca3af' },
            bottom: 10,
          },
          grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: dates,
            axisLabel: { color: '#6b7280', fontSize: 11 },
            axisLine: { lineStyle: { color: '#374151' } }
          },
          yAxis: {
            type: 'value',
            name: `Load (${unit})`,
            nameTextStyle: { color: '#6b7280', fontSize: 12 },
            axisLabel: { color: '#6b7280', fontSize: 11 },
            axisLine: { lineStyle: { color: '#374151' } },
            splitLine: { lineStyle: { color: '#374151', opacity: 0.3 } }
          },
          series: [
            {
              name: 'LT1',
              type: 'line',
              smooth: true,
              data: lt1Values,
              itemStyle: { color: '#10b981' }, // Green
              lineStyle: { color: '#10b981', width: 3 },
            },
            {
              name: 'LT2',
              type: 'line',
              smooth: true,
              data: lt2Values,
              itemStyle: { color: '#ef4444' }, // Red
              lineStyle: { color: '#ef4444', width: 3 },
            }
          ]
        };
      };

      if (loading) {
        trendChartInstance.current.showLoading();
      } else {
        trendChartInstance.current.hideLoading();
        trendChartInstance.current.setOption(getChartOption());
      }
    }
  }, [data, loading, timeRange]);

  return <div ref={trendChartRef} className="w-full h-[400px]" />;
}
