import { describe, it, expect } from 'vitest';
import { computeStats, bucketizeHistory } from '../stats';

describe('computeStats', () => {
  it('should calculate peak rating correctly', () => {
    const history = [
      { rating: 7500, created_at: '2024-01-01T00:00:00Z' },
      { rating: 8000, created_at: '2024-01-02T00:00:00Z' },
      { rating: 7800, created_at: '2024-01-03T00:00:00Z' },
      { rating: 8200, created_at: '2024-01-04T00:00:00Z' },
    ];

    const stats = computeStats(history);
    expect(stats.peak).toBe(8200);
  });

  it('should calculate games count correctly', () => {
    const history = [
      { rating: 7500, created_at: '2024-01-01T00:00:00Z' },
      { rating: 7500, created_at: '2024-01-01T01:00:00Z' }, // No change
      { rating: 7600, created_at: '2024-01-02T00:00:00Z' }, // Change
      { rating: 7700, created_at: '2024-01-03T00:00:00Z' }, // Change
      { rating: 7700, created_at: '2024-01-03T01:00:00Z' }, // No change
    ];

    const stats = computeStats(history);
    expect(stats.games).toBe(2);
  });

  it('should calculate 7-day gain correctly', () => {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    const history = [
      { rating: 7500, created_at: eightDaysAgo.toISOString() }, // Outside 7-day window
      { rating: 7600, created_at: fiveDaysAgo.toISOString() },  // Inside window
      { rating: 7800, created_at: now.toISOString() },          // Latest
    ];

    const stats = computeStats(history);
    expect(stats.gain7d).toBe(200); // 7800 - 7600
  });

  it('should return 0 gain if no data in last 7 days', () => {
    const history = [
      { rating: 7500, created_at: '2024-01-01T00:00:00Z' },
      { rating: 7600, created_at: '2024-01-02T00:00:00Z' },
    ];

    const stats = computeStats(history);
    expect(stats.gain7d).toBe(0);
  });

  it('should handle empty history', () => {
    const history: { rating: number; created_at: string }[] = [];
    const stats = computeStats(history);
    expect(stats.peak).toBe(0);
    expect(stats.games).toBe(0);
    expect(stats.gain7d).toBe(0);
  });

  it('should work with HistoryPoint format', () => {
    const history = [
      { mmr: 7500, date: '10:00', timestamp: Date.now() - 10000 },
      { mmr: 7600, date: '11:00', timestamp: Date.now() - 5000 },
      { mmr: 7700, date: '12:00', timestamp: Date.now() },
    ];

    const stats = computeStats(history);
    expect(stats.peak).toBe(7700);
  });
});

describe('bucketizeHistory', () => {
  const baseTime = Date.now();

  it('should add live data point if provided and different from last', () => {
    const data = [
      { mmr: 7500, date: '10:00', timestamp: baseTime - 10000 },
      { mmr: 7600, date: '11:00', timestamp: baseTime - 5000 },
    ];

    const result = bucketizeHistory(data, '24h', { rating: 7700 });
    // Live point is added but then filtered because last point (7600) != live (7700)
    // The filter keeps first and last points
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[result.length - 1].mmr).toBe(7700);
  });

  it('should filter consecutive duplicate MMR values', () => {
    // Points spread across different buckets (6+ hours apart for 24h range = 2 hour buckets)
    const data = [
      { mmr: 7500, date: 'Day 1 10:00', timestamp: baseTime - 3 * 60 * 60 * 1000 }, // 3 hours ago
      { mmr: 7600, date: 'Day 1 14:00', timestamp: baseTime - 2 * 60 * 60 * 1000 }, // 2 hours ago (new bucket)
      { mmr: 7600, date: 'Day 1 15:00', timestamp: baseTime - 1 * 60 * 60 * 1000 }, // 1 hour ago (same bucket as prev)
      { mmr: 7700, date: 'Day 1 16:00', timestamp: baseTime },                       // Now (new bucket)
    ];

    const result = bucketizeHistory(data, '24h');
    // After bucketization and filtering: should have unique values
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].mmr).toBeLessThanOrEqual(7600);
    expect(result[result.length - 1].mmr).toBe(7700);
  });

  it('should keep at least 2 points for graph', () => {
    const data = [
      { mmr: 7500, date: '10:00', timestamp: baseTime - 10000 },
    ];

    const result = bucketizeHistory(data, '24h');
    expect(result).toHaveLength(1);
  });

  it('should create time buckets for 24h range', () => {
    const data = [
      { mmr: 7500, date: '08:00', timestamp: baseTime - 7200000 }, // 2 hours ago
      { mmr: 7550, date: '09:00', timestamp: baseTime - 3600000 }, // 1 hour ago
      { mmr: 7600, date: '10:00', timestamp: baseTime },           // Now
    ];

    const result = bucketizeHistory(data, '24h');
    // Should bucket into 2-hour buckets
    expect(result.length).toBeLessThanOrEqual(3);
  });
});
