import React from 'react';
import { render } from '@testing-library/react';
import { useGroupedTransactions } from './useGroupedTransactions';

describe('useGroupedTransactions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-12T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calculates financial totals and groups with robust coercion', () => {
    const transactions = [
      { _id: '1', title: 'Lunch', amount: '10.5', date: '2026-02-12T08:00:00.000Z', category: 'Food' },
      { _id: '2', title: 'Cab', amount: 20, date: '2026-02-11T08:00:00.000Z', category: 'Transport' },
      { _id: '3', title: 'Invalid', amount: 12, date: 'not-a-date', category: 'Other' },
      { _id: '4', title: 'Free', amount: 0, date: '2026-02-10T08:00:00.000Z', category: 'Other' }
    ];
    const categories = [{ name: 'Food', budget: '100' }, { name: 'Transport', budget: 50 }];

    let hookData;
    const Probe = () => {
      hookData = useGroupedTransactions(transactions, categories);
      return null;
    };
    render(<Probe />);

    expect(hookData.financials.totalBudget).toBe(150);
    expect(hookData.financials.totalSpent).toBeCloseTo(30.5);
    expect(hookData.financials.remaining).toBeCloseTo(119.5);
    expect(hookData.financials.status).toBe('safe');

    const groupedTitles = hookData.groupedData.map((g) => g.title);
    expect(groupedTitles).toEqual(['Today', 'Yesterday']);
  });

  it('returns neutral status when total budget is zero', () => {
    const transactions = [{ _id: '1', title: 'Lunch', amount: 20, date: '2026-02-12T08:00:00.000Z', category: 'Food' }];
    const categories = [];

    let hookData;
    const Probe = () => {
      hookData = useGroupedTransactions(transactions, categories);
      return null;
    };
    render(<Probe />);

    expect(hookData.financials.status).toBe('neutral');
    expect(hookData.financials.message).toBe('Set stock budgets to see health.');
  });
});
