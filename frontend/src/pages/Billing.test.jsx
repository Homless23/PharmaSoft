import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Billing from './Billing';
import api from '../services/api';

jest.mock('../services/api');
jest.mock('../components/AppShell', () => ({ children }) => <div>{children}</div>);

const mockGetData = jest.fn(() => Promise.resolve(true));
const mockGetCategories = jest.fn(() => Promise.resolve(true));
const mockShowToast = jest.fn();
const mockPushNotification = jest.fn();

jest.mock('../context/globalContext', () => ({
  useGlobalContext: () => ({
    user: { _id: 'u1', role: 'cashier', name: 'Cashier' },
    loading: false,
    error: '',
    categories: [
      {
        _id: 'm1',
        name: 'Cetirizine 10mg',
        genericName: 'cetirizine',
        stockQty: 150,
        unitPrice: 18,
        rackLocation: 'R1',
        active: true,
        batchNumber: 'B403',
        batches: [{ batchNumber: 'B403', expiryDate: '2027-12-31', qty: 100 }]
      },
      {
        _id: 'm2',
        name: 'Amoxicillin 250mg',
        genericName: 'amoxicillin',
        stockQty: 80,
        unitPrice: 55,
        rackLocation: 'R2',
        active: true,
        batchNumber: 'B2402',
        batches: [{ batchNumber: 'B2402', expiryDate: '2028-01-31', qty: 80 }]
      },
      {
        _id: 'm3',
        name: 'Paracetamol 500mg',
        genericName: 'paracetamol',
        stockQty: 120,
        unitPrice: 20,
        rackLocation: 'R3',
        active: true,
        batchNumber: 'B2401',
        batches: [{ batchNumber: 'B2401', expiryDate: '2028-06-30', qty: 120 }]
      }
    ],
    getData: mockGetData,
    getCategories: mockGetCategories,
    showToast: mockShowToast,
    pushNotification: mockPushNotification
  })
}));

const mockQuickSearch = ({ q }) => {
  const query = String(q || '').toLowerCase();
  if (query.startsWith('cet')) {
    return [{ _id: 'm1', name: 'Cetirizine 10mg', stockQty: 150, unitPrice: 18, rackLocation: 'R1' }];
  }
  if (query.startsWith('amo')) {
    return [{ _id: 'm2', name: 'Amoxicillin 250mg', stockQty: 80, unitPrice: 55, rackLocation: 'R2' }];
  }
  return [];
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  api.get.mockImplementation((url, config = {}) => {
    if (url === '/v1/bills') return Promise.resolve({ data: [] });
    if (url === '/v1/bills/end-of-day') return Promise.resolve({ data: { totals: {} } });
    if (url === '/v1/categories/quick-search') return Promise.resolve({ data: mockQuickSearch(config.params || {}) });
    return Promise.resolve({ data: [] });
  });
  api.post.mockResolvedValue({ data: {} });
  api.put.mockResolvedValue({ data: {} });
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

const openSuggestion = async (query) => {
  const searchInput = await screen.findByPlaceholderText('Type 3+ letters or scan barcode');
  fireEvent.focus(searchInput);
  fireEvent.change(searchInput, { target: { value: query } });
  await act(async () => {
    jest.advanceTimersByTime(220);
  });
};

const pickSuggestionAndAdd = async (name) => {
  const suggestion = await screen.findByText(name);
  fireEvent.mouseDown(suggestion);
  expect(await screen.findByText('Select Batch')).toBeTruthy();
  const addButton = screen.getByRole('button', { name: 'Add Item' });
  fireEvent.click(addButton);
};

test('keeps previous cart items when adding a new medicine', async () => {
  render(<Billing />);

  await openSuggestion('cet');
  await pickSuggestionAndAdd('Cetirizine 10mg');

  await openSuggestion('amo');
  await pickSuggestionAndAdd('Amoxicillin 250mg');

  await waitFor(() => {
    expect(screen.getByText('Cetirizine 10mg')).toBeTruthy();
    expect(screen.getByText('Amoxicillin 250mg')).toBeTruthy();
  });
});

test('falls back to local medicine search when quick-search API fails', async () => {
  api.get.mockImplementation((url) => {
    if (url === '/v1/bills') return Promise.resolve({ data: [] });
    if (url === '/v1/bills/end-of-day') return Promise.resolve({ data: { totals: {} } });
    if (url === '/v1/categories/quick-search') return Promise.reject(new Error('network'));
    return Promise.resolve({ data: [] });
  });

  render(<Billing />);
  await openSuggestion('par');

  await waitFor(() => {
    expect(screen.getByText('Paracetamol 500mg')).toBeTruthy();
  });
});
