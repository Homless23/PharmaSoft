import React, { createContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import AppReducer from './AppReducer';
import * as types from './types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const initialState = {
  transactions: [],
  logs: [],
  budget: null,
  token: localStorage.getItem('token'),
  isAuthenticated: null,
  loading: true,
  user: null,
  error: null,
  alert: null
};

export const GlobalContext = createContext(initialState);

export const GlobalProvider = ({ children }) => {
  const [state, dispatch] = useReducer(AppReducer, initialState);

  // Configure axios with Bearer token
  useEffect(() => {
    if (state.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
      localStorage.setItem('token', state.token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [state.token]);

  // --- UI UTILITIES ---

  const applyTheme = useCallback((theme) => {
    theme === 'dark' 
      ? document.body.classList.add('dark-theme') 
      : document.body.classList.remove('dark-theme');
  }, []);

  const setAlert = useCallback((msg, type = 'success') => {
    dispatch({ type: types.SET_ALERT, payload: { msg, type } });
    setTimeout(() => dispatch({ type: types.CLEAR_ALERT }), 5000);
  }, []);

  const clearAlert = useCallback(() => {
    dispatch({ type: types.CLEAR_ALERT });
  }, []);

  const handleError = useCallback((err, defaultMsg) => {
    const msg = err.response?.data?.error || defaultMsg;
    if (err.response?.status === 401) {
      dispatch({ type: types.LOGOUT });
      localStorage.removeItem('token');
      setAlert("Session expired. Please login.", "warning");
    } else {
      setAlert(msg, "danger");
    }
  }, [setAlert]);

  // --- AUTH ACTIONS ---

  const loadUser = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/me`);
      dispatch({ type: types.USER_LOADED, payload: res.data.data });
      applyTheme(res.data.data.theme || 'dark');
    } catch (err) {
      dispatch({ type: types.AUTH_ERROR });
      applyTheme('dark');
    }
  }, [applyTheme]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadUser();
    } else {
      dispatch({ type: types.AUTH_ERROR }); 
    }
    // eslint-disable-next-line
  }, []);

  const login = useCallback(async (formData) => {
    dispatch({ type: types.SET_LOADING });
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, formData);
      dispatch({ type: types.LOGIN_SUCCESS, payload: res.data });
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      await loadUser(); 
      setAlert("Logged in successfully", "success");
    } catch (err) {
      dispatch({ type: types.LOGIN_FAIL }); 
      setAlert(err.response?.data?.error || "Login failed", "danger");
    }
  }, [loadUser, setAlert]);

  const register = useCallback(async (formData) => {
    dispatch({ type: types.SET_LOADING });
    try {
      const res = await axios.post(`${API_BASE}/auth/register`, formData);
      dispatch({ type: types.REGISTER_SUCCESS, payload: res.data });
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      await loadUser();
      setAlert("Account created", "success");
    } catch (err) { 
      dispatch({ type: types.REGISTER_FAIL });
      console.error('Registration error:', err.response?.data || err.message);
      handleError(err, "Registration failed - Check console for details"); 
    }
  }, [loadUser, setAlert, handleError]);

  const logout = useCallback(() => {
    dispatch({ type: types.LOGOUT });
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setAlert("Signed out safely", "success");
  }, [setAlert]);

  // --- THEME & SETTINGS ---

  const toggleTheme = useCallback(async () => {
    const newTheme = state.user?.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    try {
      const res = await axios.put(`${API_BASE}/auth/updatedetails`, { theme: newTheme });
      dispatch({ type: types.USER_LOADED, payload: res.data.data });
    } catch (err) { setAlert("Theme sync failed", "danger"); }
  }, [state.user, applyTheme, setAlert]);

  const updateDetails = useCallback(async (details) => {
    try {
      const res = await axios.put(`${API_BASE}/auth/updatedetails`, details);
      dispatch({ type: types.USER_LOADED, payload: res.data.data });
      setAlert("Profile updated", "success");
    } catch (err) { handleError(err, "Update failed"); }
  }, [setAlert, handleError]);

  const updatePassword = useCallback(async (passwords) => {
    try {
      await axios.put(`${API_BASE}/auth/updatepassword`, passwords);
      setAlert("Password updated", "success");
    } catch (err) { handleError(err, "Verification failed"); }
  }, [setAlert, handleError]);

  const getLogs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/logs`);
      dispatch({ type: types.GET_LOGS, payload: res.data.data });
    } catch (err) { console.error("Audit access denied"); }
  }, []);

  // --- DATA ACTIONS (OPTIMIZED) ---

  const getTransactions = useCallback(async () => {
    dispatch({ type: types.SET_LOADING });
    try {
      const res = await axios.get(`${API_BASE}/transactions`);
      dispatch({ type: types.GET_TRANSACTIONS, payload: res.data.data });
    } catch (err) { handleError(err, "Data fetch failed"); }
  }, [handleError]);

  const addTransaction = useCallback(async (t) => {
    try {
      const res = await axios.post(`${API_BASE}/transactions`, t);
      dispatch({ type: types.ADD_TRANSACTION, payload: res.data.data });
      setAlert("Transaction recorded", "success");
    } catch (err) { handleError(err, "Entry failed"); }
  }, [setAlert, handleError]);

  const deleteTransaction = useCallback(async (id) => {
    try {
      await axios.delete(`${API_BASE}/transactions/${id}`);
      dispatch({ type: types.DELETE_TRANSACTION, payload: id });
      setAlert("Transaction deleted", "success");
    } catch (err) { handleError(err, "Delete failed"); }
  }, [setAlert, handleError]);

  const getBudget = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/budget`);
      dispatch({ type: types.GET_BUDGET, payload: res.data.data });
    } catch (err) { console.error("Budget fetch failed"); }
  }, []);

  const updateBudget = useCallback(async (b) => {
    try {
      const res = await axios.put(`${API_BASE}/budget`, b);
      dispatch({ type: types.UPDATE_BUDGET, payload: res.data.data });
      setAlert("Financial goals updated", "success");
    } catch (err) { handleError(err, "Budget sync failed"); }
  }, [setAlert, handleError]);

  // Memoize the provider value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    getTransactions,
    addTransaction,
    deleteTransaction,
    toggleTheme,
    updateDetails,
    updatePassword,
    getLogs,
    getBudget,
    updateBudget,
    setAlert,
    clearAlert
  }), [
    state,
    login,
    register,
    logout,
    getTransactions,
    addTransaction,
    deleteTransaction,
    toggleTheme,
    updateDetails,
    updatePassword,
    getLogs,
    getBudget,
    updateBudget,
    setAlert,
    clearAlert
  ]);

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};
