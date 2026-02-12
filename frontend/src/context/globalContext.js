import React, { useCallback, useContext, useMemo, useState } from 'react';
import api from '../services/api';

const DEFAULT_CATEGORIES = [
  { name: 'Food', budget: 0 },
  { name: 'Transport', budget: 0 },
  { name: 'Bills', budget: 0 },
  { name: 'Shopping', budget: 0 },
  { name: 'Entertainment', budget: 0 },
  { name: 'Health', budget: 0 },
  { name: 'Other', budget: 0 },
  { name: 'Salary', budget: 0 },
  { name: 'Freelance', budget: 0 },
  { name: 'Investments', budget: 0 }
];

export const GlobalContext = React.createContext();

export const GlobalProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getApiErrorMessage = useCallback((err, fallback) => {
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.response?.data?.error) return err.response.data.error;
    if (Array.isArray(err?.response?.data?.errors) && err.response.data.errors[0]?.msg) {
      return err.response.data.errors[0].msg;
    }
    if (err?.code === 'ERR_NETWORK') {
      return 'Cannot reach backend API. Ensure backend is running on http://localhost:5000.';
    }
    return fallback;
  }, []);

  const registerUser = useCallback(async (userData) => {
    try {
      setError(null);
      const res = await api.post('/auth/register', userData);
      localStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration Failed'));
      return false;
    }
  }, [getApiErrorMessage]);

  const loginUser = useCallback(async (userData) => {
    try {
      setError(null);
      const res = await api.post('/auth/login', userData);
      localStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login Failed'));
      return false;
    }
  }, [getApiErrorMessage]);

  const logoutUser = useCallback(() => {
    localStorage.removeItem('user');
    setUser(null);
    setExpenses([]);
    setHistoryItems([]);
    setHistoryPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
    setCategories([]);
    setError(null);
  }, []);

  const getExpenses = useCallback(async () => {
    try {
      const res = await api.get('/v1/get-expenses');
      if (Array.isArray(res.data)) {
        setExpenses(res.data);
      } else if (Array.isArray(res.data?.items)) {
        setExpenses(res.data.items);
      } else {
        setExpenses([]);
      }
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error fetching expenses'));
      return false;
    }
  }, [getApiErrorMessage]);

  const getExpenseHistory = useCallback(async (params = {}) => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/v1/get-expenses', { params });
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

  const addExpense = useCallback(async (expense) => {
    try {
      setError(null);
      await api.post('/v1/add-expense', expense);
      await getExpenses();
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error adding expense'));
      return false;
    }
  }, [getApiErrorMessage, getExpenses]);

  const addTransaction = addExpense;

  const deleteExpense = useCallback(async (id) => {
    try {
      setError(null);
      await api.delete(`/v1/delete-expense/${id}`);
      await getExpenses();
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error deleting expense'));
      return false;
    }
  }, [getApiErrorMessage, getExpenses]);

  const updateExpense = useCallback(async (id, payload) => {
    try {
      setError(null);
      await api.put(`/v1/update-expense/${id}`, payload);
      await getExpenses();
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating expense'));
      return false;
    }
  }, [getApiErrorMessage, getExpenses]);

  const generateRecurringExpense = useCallback(async (id) => {
    try {
      setError(null);
      const res = await api.post(`/v1/generate-recurring/${id}`);
      await getExpenses();
      return { success: true, data: res.data };
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error generating recurring expense'));
      return { success: false, data: null };
    }
  }, [getApiErrorMessage, getExpenses]);

  const addCategory = useCallback(async (name, budget = 0) => {
    const cleanedName = String(name || '').trim();
    if (!cleanedName) return false;

    try {
      setError(null);
      const res = await api.post('/v1/categories/add', { name: cleanedName, budget: Number(budget) || 0 });
      setCategories((prev) => [...prev, res.data]);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error adding category'));
      return false;
    }
  }, [getApiErrorMessage]);

  const getCategories = useCallback(async () => {
    try {
      const res = await api.get('/v1/categories');
      setCategories(Array.isArray(res.data) ? res.data : []);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error fetching categories'));
      return false;
    }
  }, [getApiErrorMessage]);

  const editBudget = useCallback(async (id, budget) => {
    try {
      setError(null);
      const res = await api.put(`/v1/categories/${id}`, { budget: Number(budget) || 0 });
      setCategories((prev) => prev.map((c) => (c._id === id ? res.data : c)));
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error updating budget'));
      return false;
    }
  }, [getApiErrorMessage]);

  const ensureDefaultCategories = useCallback(async () => {
    try {
      const res = await api.get('/v1/categories');
      const existing = Array.isArray(res.data) ? res.data : [];
      const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));

      for (const baseCategory of DEFAULT_CATEGORIES) {
        if (!existingNames.has(baseCategory.name.toLowerCase())) {
          await api.post('/v1/categories/add', baseCategory);
        }
      }

      const finalRes = await api.get('/v1/categories');
      setCategories(Array.isArray(finalRes.data) ? finalRes.data : []);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Error preparing categories'));
      return false;
    }
  }, [getApiErrorMessage]);

  const getData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [expenseOk, categoryOk] = await Promise.all([getExpenses(), ensureDefaultCategories()]);
    setLoading(false);
    return expenseOk && categoryOk;
  }, [ensureDefaultCategories, getExpenses]);

  const contextValue = useMemo(() => ({
    user,
    setUser,
    expenses,
    historyItems,
    historyPagination,
    historyLoading,
    categories,
    loading,
    error,
    setError,
    registerUser,
    loginUser,
    logoutUser,
    addExpense,
    addTransaction,
    getExpenses,
    deleteExpense,
    updateExpense,
    getExpenseHistory,
    generateRecurringExpense,
    addCategory,
    getCategories,
    editBudget,
    getData
  }), [
    user,
    expenses,
    historyItems,
    historyPagination,
    historyLoading,
    categories,
    loading,
    error,
    registerUser,
    loginUser,
    logoutUser,
    addExpense,
    addTransaction,
    getExpenses,
    deleteExpense,
    updateExpense,
    getExpenseHistory,
    generateRecurringExpense,
    addCategory,
    getCategories,
    editBudget,
    getData
  ]);

  return <GlobalContext.Provider value={contextValue}>{children}</GlobalContext.Provider>;
};

export const useGlobalContext = () => {
  return useContext(GlobalContext);
};
