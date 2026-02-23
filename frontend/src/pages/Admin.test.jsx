import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Admin from './Admin';
import api from '../services/api';

jest.mock('../services/api');
jest.mock('../components/AppShell', () => ({ children }) => <div>{children}</div>);

const mockSetError = jest.fn();
const mockShowToast = jest.fn();
const mockPushNotification = jest.fn();
let mockUser = { _id: 'admin-1', role: 'admin', name: 'Admin' };

jest.mock('../context/globalContext', () => ({
  useGlobalContext: () => ({
    user: mockUser,
    error: '',
    setError: mockSetError,
    showToast: mockShowToast,
    pushNotification: mockPushNotification
  })
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockImplementation((url) => {
    if (url === '/admin/users') {
      return Promise.resolve({
        data: [
          { _id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'admin', createdAt: new Date().toISOString() },
          { _id: 'cashier-1', name: 'Cashier', email: 'cashier@example.com', role: 'cashier', createdAt: new Date().toISOString() }
        ]
      });
    }
    if (url === '/admin/logins') return Promise.resolve({ data: [] });
    if (url === '/admin/expired-overrides') return Promise.resolve({ data: { tokens: [], bills: [] } });
    return Promise.resolve({ data: [] });
  });
  api.post.mockResolvedValue({ data: {} });
  api.put.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
});

test('locks admin actions for non-admin roles in UI', async () => {
  mockUser = { _id: 'ph-1', role: 'pharmacist', name: 'Pharmacist' };
  render(<Admin />);

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /add random entries/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /issue token/i })).toBeDisabled();
  });
});

test('prevents self-delete in admin users table', async () => {
  mockUser = { _id: 'admin-1', role: 'admin', name: 'Admin' };
  render(<Admin />);

  const deleteButtons = await screen.findAllByRole('button', { name: /^delete$/i });
  expect(deleteButtons.length).toBeGreaterThan(1);
  expect(deleteButtons[0]).toBeDisabled();
  expect(deleteButtons[1]).not.toBeDisabled();
});

