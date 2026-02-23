import React, { useCallback, useContext, useMemo, useState } from 'react';
import api from '../services/api';
import { ACTIONS, hasPermission, normalizeRole } from '../config/rbacPolicy';
import { getApiErrorMessage as getApiErrorMessageUtil } from '../utils/apiError';

const DEFAULT_CATEGORIES = [
  { name: 'Paracetamol 500mg', sku: 'MED-001', batchNumber: 'B-2401', manufacturer: 'Cipla', unitPrice: 20, stockQty: 120, budget: 0 },
  { name: 'Amoxicillin 250mg', sku: 'MED-002', batchNumber: 'B-2402', manufacturer: 'Sun Pharma', unitPrice: 55, stockQty: 80, budget: 0 },
  { name: 'Cetirizine 10mg', sku: 'MED-003', batchNumber: 'B-2403', manufacturer: 'Dr Reddy', unitPrice: 18, stockQty: 150, budget: 0 },
  { name: 'ORS Sachet', sku: 'MED-004', batchNumber: 'B-2404', manufacturer: 'Dabur', unitPrice: 30, stockQty: 200, budget: 0 }
];

const normalizeCategoryName = (value) => String(value || '').trim().toLowerCase();
const toTimestamp = (value) => {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
};
const DEMO_SEED_ENABLED = String(process.env.REACT_APP_ENABLE_DEMO_MEDICINE_SEED || '').trim().toLowerCase() === 'true';
const dedupeCategoriesByName = (items) => {
  const list = Array.isArray(items) ? items : [];
  const map = new Map();

  list.forEach((item) => {
    const key = normalizeCategoryName(item?.name);
    if (!key) return;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      return;
    }

    const pickCurrent =
      (existing.active === false && item.active !== false) ||
      toTimestamp(item?.updatedAt || item?.date) > toTimestamp(existing?.updatedAt || existing?.date);
    if (pickCurrent) {
      map.set(key, item);
    }
  });

  return Array.from(map.values()).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
};

export const GlobalContext = React.createContext();

export const GlobalProvider = ({ children }) => {
  // Unified pharmacy transaction ledger (sales/purchases/income).
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categorySummary, setCategorySummary] = useState({ items: [], totals: { totalSpent: 0, totalBudget: 0 } });
  const [goals, setGoals] = useState([]);
  const [insights, setInsights] = useState({ metrics: null, insights: [] });
  const [recurringAlerts, setRecurringAlerts] = useState({ dueCount: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [toastTimeoutId, setToastTimeoutId] = useState(null);
  const lastSyncAtRef = React.useRef(0);
  const getDataInFlightRef = React.useRef(false);
  const dataSnapshotRef = React.useRef({ transactions: 0, categories: 0 });
  const notificationUserId = String(user?._id || user?.id || '').trim();

  React.useEffect(() => {
    dataSnapshotRef.current = {
      transactions: transactions.length,
      categories: categories.length
    };
  }, [transactions.length, categories.length]);

  React.useEffect(() => {
    // Reset throttling/cache guards when auth context changes so each account
    // immediately fetches its own tenant data.
    lastSyncAtRef.current = 0;
    dataSnapshotRef.current = { transactions: 0, categories: 0 };
    getDataInFlightRef.current = false;
  }, [notificationUserId]);

  React.useEffect(() => {
    let mounted = true;
    const loadNotifications = async () => {
      if (!notificationUserId) {
        if (mounted) setNotifications([]);
        return;
      }
      try {
        const res = await api.get('/notifications', { params: { limit: 60 } });
        const rows = Array.isArray(res?.data) ? res.data : [];
        if (mounted) setNotifications(rows);
      } catch {
        if (mounted) setNotifications([]);
      }
    };
    loadNotifications();
    return () => {
      mounted = false;
    };
  }, [notificationUserId]);

  const pushNotification = useCallback((message, options = {}) => {
    const scopedUser = options?.scopeUser || user;
    const scopedUserId = String(scopedUser?._id || scopedUser?.id || '').trim();
    const item = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      message: String(message || ''),
      type: options.type || 'info',
      createdAt: new Date().toISOString(),
      read: false
    };
    if (!scopedUserId) return;
    const optimistic = {
      _id: item.id,
      message: item.message,
      type: item.type,
      read: false,
      createdAt: item.createdAt
    };
    setNotifications((prev) => [optimistic, ...prev].slice(0, 60));
    api.post('/notifications', { message: item.message, type: item.type })
      .then((res) => {
        const created = res?.data;
        if (!created?._id) return;
        setNotifications((prev) => [
          created,
          ...prev.filter((n) => String(n?._id || '') !== optimistic._id)
        ].slice(0, 60));
      })
      .catch(() => {
        setNotifications((prev) => prev.filter((n) => String(n?._id || '') !== optimistic._id));
      });
  }, [user]);

  const markNotificationsRead = useCallback(() => {
    if (!notificationUserId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    api.post('/notifications/read-all').catch(() => {});
  }, [notificationUserId]);

  const hideToast = useCallback(() => {
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
      setToastTimeoutId(null);
    }
    setToast(null);
  }, [toastTimeoutId]);

  const showToast = useCallback((message, options = {}) => {
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
      setToastTimeoutId(null);
    }

    const nextToast = {
      message,
      type: options.type || 'success',
      actionLabel: options.actionLabel || null,
      onAction: options.onAction || null
    };
    setToast(nextToast);

    const duration = Number(options.duration ?? 2500);
    if (duration > 0) {
      const id = setTimeout(() => {
        setToast(null);
        setToastTimeoutId(null);
      }, duration);
      setToastTimeoutId(id);
    }
  }, [toastTimeoutId]);

  const getApiErrorMessage = useCallback((err, fallback) => {
    return getApiErrorMessageUtil(err, fallback);
  }, []);

  const registerUser = useCallback(async (userData) => {
    try {
      setError(null);
      const res = await api.post('/auth/register', userData);
      setUser(res.data);
      pushNotification('New account registered successfully', { type: 'success', scopeUser: res.data });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration Failed'));
      return false;
    }
  }, [getApiErrorMessage, pushNotification]);

  const loginUser = useCallback(async (userData) => {
    try {
      setError(null);
      const res = await api.post('/auth/login', userData);
      setUser(res.data);
      // Save token to localStorage for cross-domain requests
      if (res.data?.token) {
        localStorage.setItem('auth_token', res.data.token);
      }
      pushNotification('Signed in successfully', { type: 'success', scopeUser: res.data });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login Failed'));
      return false;
    }
  }, [getApiErrorMessage, pushNotification]);

  const logoutUser = useCallback(() => {
    api.post('/auth/logout').catch(() => {});
    // Clear token from localStorage
    localStorage.removeItem('auth_token');
    setUser(null);
    setTransactions([]);
    setHistoryItems([]);
    setHistoryPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
    setCategories([]);
    setGoals([]);
    setInsights({ metrics: null, insights: [] });
    setRecurringAlerts({ dueCount: 0, items: [] });
    setError(null);
    pushNotification('Signed out', { type: 'warning' });
  }, [pushNotification]);

  const getCurrentUser = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setError(null);
      const res = await api.get('/auth/me');
      return { success: true, data: res.data };
    } catch (err) {
      if (!silent) {
        setError(getApiErrorMessage(err, 'Error fetching profile'));
      }
      return { success: false, data: null };
    }
  }, [getApiErrorMessage]);

  const updateProfile = useCallback(async ({ name, avatarDataUrl, removeAvatar } = {}) => {
    try {
      setError(null);
      const payload = { name };
      if (typeof avatarDataUrl !== 'undefined') {
        payload.avatarDataUrl = avatarDataUrl;
      }
      if (typeof removeAvatar !== 'undefined') {
        payload.removeAvatar = Boolean(removeAvatar);
      }

      const res = await api.put('/auth/profile', payload);
      const nextUser = {
        ...(user || {}),
        name: res.data?.name || name || user?.name,
        email: res.data?.email || user?.email,
        role: res.data?.role || user?.role,
        avatarDataUrl: typeof res.data?.avatarDataUrl === 'string'
          ? res.data.avatarDataUrl
          : (removeAvatar ? '' : (avatarDataUrl ?? user?.avatarDataUrl ?? ''))
      };
      setUser(nextUser);
      pushNotification('Profile updated', { type: 'success' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating profile'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, pushNotification, user]);

  const updatePassword = useCallback(async ({ currentPassword, newPassword }) => {
    try {
      setError(null);
      const res = await api.put('/auth/password', { currentPassword, newPassword });
      pushNotification('Password updated', { type: 'success' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating password'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, pushNotification]);

  const getTransactions = useCallback(async () => {
    try {
      const res = await api.get('/v1/transactions');
      if (Array.isArray(res.data)) {
        setTransactions(res.data);
      } else if (Array.isArray(res.data?.items)) {
        setTransactions(res.data.items);
      } else {
        setTransactions([]);
      }
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error fetching transactions'));
      return false;
    }
  }, [getApiErrorMessage]);

  const getTransactionHistory = useCallback(async (params = {}) => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/v1/transactions', { params });
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      const pagination = res.data?.pagination || {
        page: Number(params.page) || 1,
        limit: Number(params.limit) || 10,
        total: items.length,
        totalPages: 1
      };
      setHistoryItems(items);
      setHistoryPagination(pagination);
      return { success: true, items, pagination };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error fetching history'));
      return {
        success: false,
        items: [],
        pagination: {
          page: Number(params.page) || 1,
          limit: Number(params.limit) || 10,
          total: 0,
          totalPages: 1
        }
      };
    } finally {
      setHistoryLoading(false);
    }
  }, [getApiErrorMessage]);

  const createTransaction = useCallback(async (transaction) => {
    try {
      setError(null);
      const res = await api.post('/v1/transactions', transaction);
      const created = res?.data;
      if (created && created._id) {
        setTransactions((prev) => [created, ...prev.filter((item) => item._id !== created._id)]);
        setHistoryItems((prev) => {
          const safe = Array.isArray(prev) ? prev : [];
          if (Number(historyPagination.page || 1) !== 1) return safe;
          const limit = Number(historyPagination.limit) || 10;
          return [created, ...safe.filter((item) => item._id !== created._id)].slice(0, limit);
        });
        setHistoryPagination((prev) => {
          const nextTotal = Number(prev?.total || 0) + 1;
          const limit = Number(prev?.limit || 10);
          return {
            ...prev,
            total: nextTotal,
            totalPages: Math.max(Math.ceil(nextTotal / limit), 1)
          };
        });
      }
      pushNotification(`Entry added: ${transaction.title}`, { type: 'success' });
      return created || true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error adding transaction'));
      return false;
    }
  }, [getApiErrorMessage, historyPagination.limit, historyPagination.page, pushNotification]);

  const removeTransaction = useCallback(async (id) => {
    try {
      setError(null);
      await api.delete(`/v1/transactions/${id}`);
      await getTransactions();
      pushNotification('Entry deleted', { type: 'warning' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error deleting transaction'));
      return false;
    }
  }, [getApiErrorMessage, getTransactions, pushNotification]);

  const updateTransaction = useCallback(async (id, payload) => {
    try {
      setError(null);
      await api.put(`/v1/transactions/${id}`, payload);
      await getTransactions();
      pushNotification(`Entry updated: ${payload?.title || 'item'}`, { type: 'info' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating transaction'));
      return false;
    }
  }, [getApiErrorMessage, getTransactions, pushNotification]);

  const generateRecurringTransaction = useCallback(async (id) => {
    try {
      setError(null);
      const res = await api.post(`/v1/transactions/${id}/generate-recurring`);
      await getTransactions();
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error generating recurring transaction'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, getTransactions]);

  const transactionItems = transactions;
  const transactionHistoryItems = historyItems;
  const transactionHistoryPagination = historyPagination;
  const transactionHistoryLoading = historyLoading;

  const addCategory = useCallback(async (nameOrPayload, budget = 0) => {
    const isObjectPayload = typeof nameOrPayload === 'object' && nameOrPayload !== null;
    const cleanedName = isObjectPayload
      ? String(nameOrPayload.name || '').trim()
      : String(nameOrPayload || '').trim();
    if (!cleanedName) return false;

    try {
      setError(null);
      const payload = isObjectPayload
        ? {
          ...nameOrPayload,
          name: cleanedName,
          budget: Number(nameOrPayload.budget) || 0,
          unitPrice: Math.max(Number(nameOrPayload.unitPrice) || 0, 0),
          stockQty: Math.max(Number(nameOrPayload.stockQty) || 0, 0),
          active: nameOrPayload.active !== false
        }
        : { name: cleanedName, budget: Number(budget) || 0, active: true };
      const res = await api.post('/v1/categories/add', payload);
      setCategories((prev) => dedupeCategoriesByName([...prev, res.data]));
      pushNotification(`Medicine created: ${cleanedName}`, { type: 'success' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error adding medicine'));
      return false;
    }
  }, [getApiErrorMessage, pushNotification]);

  const getCategories = useCallback(async () => {
    try {
      const res = await api.get('/v1/categories');
      setCategories(dedupeCategoriesByName(res.data));
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error fetching categories'));
      return false;
    }
  }, [getApiErrorMessage]);

  const getCategorySummary = useCallback(async () => {
    try {
      const res = await api.get('/v1/categories/summary');
      const payload = res?.data || {};
      setCategorySummary({
        items: Array.isArray(payload.items) ? payload.items : [],
        totals: payload.totals || { totalSpent: 0, totalBudget: 0 }
      });
      return true;
    } catch (err) {
      setCategorySummary({ items: [], totals: { totalSpent: 0, totalBudget: 0 } });
      setError(getApiErrorMessage(err, 'Error fetching category summary'));
      return false;
    }
  }, [getApiErrorMessage]);

  const getGoals = useCallback(async () => {
    try {
      const res = await api.get('/v1/goals');
      setGoals(Array.isArray(res.data) ? res.data : []);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error fetching goals'));
      return false;
    }
  }, [getApiErrorMessage]);

  const createGoal = useCallback(async (payload) => {
    try {
      setError(null);
      const res = await api.post('/v1/goals', payload);
      setGoals((prev) => [res.data, ...prev]);
      pushNotification(`Goal created: ${res?.data?.title || payload?.title || 'goal'}`, { type: 'success' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error creating goal'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, pushNotification]);

  const updateGoal = useCallback(async (id, payload) => {
    try {
      setError(null);
      const res = await api.put(`/v1/goals/${id}`, payload);
      setGoals((prev) => prev.map((goal) => (goal._id === id ? res.data : goal)));
      pushNotification(`Goal updated: ${res?.data?.title || 'goal'}`, { type: 'info' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating goal'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, pushNotification]);

  const deleteGoal = useCallback(async (id) => {
    try {
      setError(null);
      await api.delete(`/v1/goals/${id}`);
      setGoals((prev) => prev.filter((goal) => goal._id !== id));
      pushNotification('Goal deleted', { type: 'warning' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error deleting goal'));
      return false;
    }
  }, [getApiErrorMessage, pushNotification]);

  const getInsights = useCallback(async () => {
    try {
      const res = await api.get('/v1/transactions/insights');
      const payload = res?.data || {};
      setInsights({
        metrics: payload.metrics || null,
        insights: Array.isArray(payload.insights) ? payload.insights : []
      });
      return true;
    } catch (err) {
      setInsights({ metrics: null, insights: [] });
      setError(getApiErrorMessage(err, 'Error fetching operational insights'));
      return false;
    }
  }, [getApiErrorMessage]);

  const getRecurringAlerts = useCallback(async () => {
    try {
      const res = await api.get('/v1/transactions/recurring-alerts');
      const payload = res?.data || {};
      const dueCount = Number(payload.dueCount || 0);
      const items = Array.isArray(payload.items) ? payload.items : [];
      setRecurringAlerts({ dueCount, items });
      if (dueCount > 0) {
        const alertKey = `due_${dueCount}_${items[0]?._id || 'x'}`;
        if (localStorage.getItem('last_due_alert_key') !== alertKey) {
          localStorage.setItem('last_due_alert_key', alertKey);
          pushNotification(`${dueCount} recurring supplier payable${dueCount > 1 ? 's are' : ' is'} due`, { type: 'warning' });
        }
      }
      return true;
    } catch (err) {
      setRecurringAlerts({ dueCount: 0, items: [] });
      setError(getApiErrorMessage(err, 'Error fetching recurring due alerts'));
      return false;
    }
  }, [getApiErrorMessage, pushNotification]);

  const processRecurringDue = useCallback(async () => {
    try {
      setError(null);
      const res = await api.post('/v1/transactions/process-recurring-due');
      const createdCount = Number(res?.data?.createdCount || 0);
      if (createdCount > 0) {
        pushNotification(`Auto-created ${createdCount} due recurring purchase${createdCount > 1 ? 's' : ''}`, { type: 'success' });
      }
      await getTransactions();
      await getRecurringAlerts();
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error processing recurring dues'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, getTransactions, getRecurringAlerts, pushNotification]);

  const autoAllocateBudgets = useCallback(async ({ savingsTarget, income, apply = true } = {}) => {
    try {
      setError(null);
      const payload = { apply: apply !== false };
      const hasSavingsValue = !(savingsTarget === '' || savingsTarget === null || typeof savingsTarget === 'undefined');
      const hasIncomeValue = !(income === '' || income === null || typeof income === 'undefined');
      const parsedSavings = hasSavingsValue ? Number(savingsTarget) : NaN;
      const parsedIncome = hasIncomeValue ? Number(income) : NaN;
      if (hasSavingsValue && Number.isFinite(parsedSavings) && parsedSavings >= 0) {
        payload.savingsTarget = parsedSavings;
      }
      if (hasIncomeValue && Number.isFinite(parsedIncome) && parsedIncome >= 0) {
        payload.income = parsedIncome;
      }

      const res = await api.post('/v1/budgets/auto-allocate', payload);
      await Promise.all([getCategories(), getCategorySummary()]);
      pushNotification('Stock budgets auto-allocated from revenue and reserve target', { type: 'success' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error auto-allocating budgets'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, getCategories, getCategorySummary, pushNotification]);

  const editBudget = useCallback(async (id, budget) => {
    try {
      setError(null);
      const res = await api.put(`/v1/categories/${id}`, { budget: Number(budget) || 0 });
      setCategories((prev) => dedupeCategoriesByName(prev.map((c) => (c._id === id ? res.data : c))));
      pushNotification('Category budget updated', { type: 'info' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating budget'));
      return false;
    }
  }, [getApiErrorMessage, pushNotification]);

  const updateCategory = useCallback(async (id, payload) => {
    try {
      setError(null);
      const res = await api.put(`/v1/categories/${id}`, payload);
      setCategories((prev) => dedupeCategoriesByName(prev.map((category) => (category._id === id ? res.data : category))));
      pushNotification(`Category updated: ${res?.data?.name || 'item'}`, { type: 'info' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating category'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, pushNotification]);

  const toggleCategoryStatus = useCallback(async (id, active) => {
    return updateCategory(id, { active: Boolean(active) });
  }, [updateCategory]);

  const deleteCategory = useCallback(async (id) => {
    try {
      setError(null);
      await api.delete(`/v1/categories/${id}`);
      setCategories((prev) => dedupeCategoriesByName(prev.filter((category) => category._id !== id)));
      pushNotification('Category deleted', { type: 'warning' });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error deleting category'));
      return false;
    }
  }, [getApiErrorMessage, pushNotification]);

  const cleanupDuplicateCategories = useCallback(async () => {
    try {
      setError(null);
      const res = await api.post('/v1/categories/cleanup-duplicates');
      await Promise.all([getCategories(), getCategorySummary()]);
      const removed = Number(res?.data?.removed || 0);
      pushNotification(`Category cleanup completed (${removed} duplicate${removed === 1 ? '' : 's'} removed)`, { type: 'success' });
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error cleaning duplicate categories'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, getCategories, getCategorySummary, pushNotification]);

  const ensureDefaultCategories = useCallback(async () => {
    try {
      const res = await api.get('/v1/categories');
      const existing = dedupeCategoriesByName(res.data);
      setCategories(existing);
      const role = String(user?.role || '').toLowerCase();
      const canManageMedicines = role === 'admin' || role === 'pharmacist';
      if (!canManageMedicines || !DEMO_SEED_ENABLED) {
        return true;
      }

      const existingNames = new Set(existing.map((c) => normalizeCategoryName(c.name)));

      for (const baseCategory of DEFAULT_CATEGORIES) {
        if (!existingNames.has(baseCategory.name.toLowerCase())) {
          try {
            await api.post('/v1/categories/add', baseCategory);
            existingNames.add(baseCategory.name.toLowerCase());
          } catch (err) {
            const duplicateError =
              err?.response?.status === 400 &&
              (
                err?.response?.data?.code === 'CATEGORY_EXISTS' ||
                err?.apiError?.code === 'CATEGORY_EXISTS'
              );
            if (!duplicateError) {
              throw err;
            }
          }
        }
      }

      const finalRes = await api.get('/v1/categories');
      setCategories(dedupeCategoriesByName(finalRes.data));
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error preparing categories'));
      return false;
    }
  }, [getApiErrorMessage, user?.role]);

  const getData = useCallback(async (options = {}) => {
    // Central refresh used by all major PMS screens.
    // This throttles repeated page-level fetches and prevents UI flicker.
    const force = Boolean(options.force);
    const now = Date.now();
    const hasCachedData =
      dataSnapshotRef.current.transactions > 0 || dataSnapshotRef.current.categories > 0;
    if (!force && hasCachedData && now - lastSyncAtRef.current < 20000) {
      return true;
    }
    if (getDataInFlightRef.current) {
      return true;
    }

    getDataInFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const role = normalizeRole(user?.role);
      const canManageTransactions = hasPermission(role, ACTIONS.TRANSACTIONS_MANAGE);
      const [transactionOk, categoryOk] = await Promise.all([
        canManageTransactions ? getTransactions() : Promise.resolve(true),
        ensureDefaultCategories()
      ]);
      await Promise.all([
        getCategorySummary(),
        getGoals(),
        canManageTransactions ? getInsights() : Promise.resolve(true),
        canManageTransactions ? getRecurringAlerts() : Promise.resolve(true)
      ]);
      lastSyncAtRef.current = Date.now();
      return transactionOk && categoryOk;
    } finally {
      getDataInFlightRef.current = false;
      setLoading(false);
    }
  }, [
    ensureDefaultCategories,
    getCategorySummary,
    getTransactions,
    getGoals,
    getInsights,
    getRecurringAlerts,
    user?.role
  ]);

  const contextValue = useMemo(() => ({
    user,
    setUser,
    transactions,
    transactionItems,
    setTransactions,
    transactionHistoryItems,
    transactionHistoryPagination,
    transactionHistoryLoading,
    categories,
    categorySummary,
    goals,
    insights,
    recurringAlerts,
    loading,
    error,
    setError,
    toast,
    notifications,
    showToast,
    hideToast,
    pushNotification,
    markNotificationsRead,
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    updateProfile,
    updatePassword,
    getTransactions,
    getTransactionHistory,
    createTransaction,
    removeTransaction,
    updateTransaction,
    generateRecurringTransaction,
    addCategory,
    getCategories,
    getCategorySummary,
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    getInsights,
    getRecurringAlerts,
    processRecurringDue,
    autoAllocateBudgets,
    editBudget,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory,
    cleanupDuplicateCategories,
    getData
  }), [
    user,
    transactions,
    transactionItems,
    setTransactions,
    transactionHistoryItems,
    transactionHistoryPagination,
    transactionHistoryLoading,
    categories,
    categorySummary,
    goals,
    insights,
    recurringAlerts,
    loading,
    error,
    toast,
    notifications,
    showToast,
    hideToast,
    pushNotification,
    markNotificationsRead,
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    updateProfile,
    updatePassword,
    getTransactions,
    getTransactionHistory,
    createTransaction,
    removeTransaction,
    updateTransaction,
    generateRecurringTransaction,
    addCategory,
    getCategories,
    getCategorySummary,
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    getInsights,
    getRecurringAlerts,
    processRecurringDue,
    autoAllocateBudgets,
    editBudget,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory,
    cleanupDuplicateCategories,
    getData
  ]);

  return <GlobalContext.Provider value={contextValue}>{children}</GlobalContext.Provider>;
};

export const useGlobalContext = () => {
  return useContext(GlobalContext);
};
