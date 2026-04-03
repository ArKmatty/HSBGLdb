"use client";

import { useMemo } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ChartSkeleton } from '@/components/Skeleton';

type TimeRange = '24h' | '7d' | '30d' | 'all';

interface HistoryPoint {
  mmr: number;
  date: string;
  timestamp: number;
  fullDate?: string;
  isLive?: boolean;
}

interface LiveData {
  rating: number;
  rank: number;
  region: string;
  accountid: string;
}

const RANGE_MS: Record<TimeRange, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  'all': Infinity,
};

function formatXAxisDate(timestamp: number, range: TimeRange, locale: string): string {
  const d = new Date(timestamp);
  if (range === '24h') {
    return d.toLocaleTimeString(locale === 'it' ? 'it-IT' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (range === '7d') {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-US', { weekday: 'short' });
  }
  return d.toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-US', { month: 'short', day: 'numeric' });
}

function formatTooltipDate(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleString(locale === 'it' ? 'it-IT' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface MMRChartProps {
  historyData: HistoryPoint[];
  liveData: LiveData | null;
  timeRange: TimeRange;
  locale: string;
  loadingHistory: boolean;
}

export default function MMRChart({ historyData, liveData, timeRange, locale, loadingHistory }: MMRChartProps) {
  const chartData = useMemo(() => {
    const cutoff = timeRange === 'all' ? 0 : Date.now() - RANGE_MS[timeRange];
    const filtered = historyData.filter(h => h.timestamp >= cutoff);
    
    // Simple passthrough - bucketization done by parent
    return filtered;
  }, [historyData, timeRange]);

  const xAxisTicks = useMemo(() => {
    const maxTicks = 6;
    const data = chartData.filter(d => !d.isLive);
    if (data.length <= maxTicks) return data.map(d => d.timestamp);
    const step = Math.ceil(data.length / maxTicks);
    const ticks: number[] = [];
    for (let i = 0; i < data.length; i += step) {
      ticks.push(data[i].timestamp);
    }
    if (ticks[ticks.length - 1] !== data[data.length - 1].timestamp) {
      ticks.push(data[data.length - 1].timestamp);
    }
    return ticks;
  }, [chartData]);

  if (loadingHistory) {
    return <ChartSkeleton />;
  }

  if (chartData.length <= 1) {
    return (
      <div style={{ height: 'clamp(250px, 45vw, 400px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Not enough data to display chart</p>
      </div>
    );
  }

  return (
    <div style={{ height: 'clamp(250px, 45vw, 400px)', minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            stroke="var(--text-muted)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            dy={10}
            fontWeight={500}
            tickFormatter={(ts: number) => formatXAxisDate(ts, timeRange, locale)}
            ticks={xAxisTicks}
          />
          <YAxis
            domain={['dataMin - 150', 'dataMax + 150']}
            stroke="var(--text-muted)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            dx={-8}
            fontWeight={500}
            tickFormatter={(val: number) => val.toLocaleString()}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-mid)',
              borderRadius: 8,
              padding: '10px 14px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
            cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
            labelFormatter={(label: unknown) => formatTooltipDate(label as number, locale)}
            formatter={(value: unknown) => [(value as number).toLocaleString(), 'MMR']}
          />
          <Area
            type="linear"
            dataKey="mmr"
            stroke="var(--accent)"
            strokeWidth={2}
            fillOpacity={1}
            fill="var(--accent-dim)"
            isAnimationActive={false}
            connectNulls={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
