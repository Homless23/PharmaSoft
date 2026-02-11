import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import axios from 'axios';
import AppReducer from './AppReducer';
import * as types from './types';

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

  // 1. Axios Header Injection
  if (state.token) {
    axios.defaults.headers.common['x-auth-token'] = state.token;
  } else {
    delete axios.defaults.headers.common['x-auth-token'];
  }

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

  const handleError = useCallback((err, defaultMsg) => {
    const msg = err.response?.data?.error || defaultMsg;
    if (err.response?.status === 401) {
      dispatch({ type: types.LOGOUT });
      setAlert("Session expired. Please login.", "warning");
    } else {
      setAlert(msg, "danger");
    }
  }, [setAlert]);

  // --- AUTH ACTIONS ---

  const loadUser = useCallback(async () => {
    try {
      const res = await axios.get('/api/auth/me');
      dispatch({ type: types.USER_LOADED, payload: res.data.data });
      applyTheme(res.data.data.theme || 'dark');
    } catch (err) {
      dispatch({ type: types.AUTH_ERROR });
      applyTheme('dark');
    }
  }, [applyTheme]);

  useEffect(() => {
    if (localStorage.getItem('token')) loadUser();
    else {
      dispatch({ type: types.AUTH_ERROR });
      applyTheme('dark');
    }
  }, [loadUser, applyTheme]);

  const login = async (formData) => {
    dispatch({ type: types.SET_LOADING });
    try {
      const res = await axios.post('/api/auth/login', formData);
      dispatch({ type: types.LOGIN_SUCCESS, payload: res.data });
      loadUser();
      setAlert("Logged in successfully", "success");
    } catch (err) { handleError(err, "Login failed"); }
  };

  const register = async (formData) => {
    dispatch({ type: types.SET_LOADING });
    try {
      const res = await axios.post('/api/auth/register', formData);
      dispatch({ type: types.REGISTER_SUCCESS, payload: res.data });
      loadUser();
      setAlert("Account created", "success");
    } catch (err) { handleError(err, "Registration failed"); }
  };

  const logout = () => {
    dispatch({ type: types.LOGOUT });
    setAlert("Signed out safely", "success");
  };

  // --- THEME & SETTINGS ---

  const toggleTheme = async () => {
    const newTheme = state.user?.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    try {
      const res = await axios.put('/api/auth/updatedetails', { theme: newTheme });
      dispatch({ type: types.USER_LOADED, payload: res.data.data });
    } catch (err) { setAlert("Theme sync failed", "danger"); }
  };

  const updateDetails = async (details) => {
    try {
      const res = await axios.put('/api/auth/updatedetails', details);
      dispatch({ type: types.USER_LOADED, payload: res.data.data });
      setAlert("Profile updated", "success");
    } catch (err) { handleError(err, "Update failed"); }
  };

  const updatePassword = async (passwords) => {
    try {
      await axios.put('/api/auth/updatepassword', passwords);
      setAlert("Password updated", "success");
    } catch (err) { handleError(err, "Verification failed"); }
  };

  const getLogs = async () => {
    try {
      const res = await axios.get('/api/auth/logs');
      dispatch({ type: 'GET_LOGS', payload: res.data.data });
    } catch (err) { console.error("Audit access denied"); }
  };

  // --- DATA ACTIONS ---

  const getTransactions = async () => {
    dispatch({ type: types.SET_LOADING });
    try {
      const res = await axios.get('/api/transactions');
      dispatch({ type: types.GET_TRANSACTIONS, payload: res.data.data });
    } catch (err) { handleError(err, "Data fetch failed"); }
  };

  const addTransaction = async (t) => {
    try {
      const res = await axios.post('/api/transactions', t);
      dispatch({ type: types.ADD_TRANSACTION, payload: res.data.data });
      setAlert("Transaction recorded", "success");
    } catch (err) { handleError(err, "Entry failed"); }
  };

  const deleteTransaction = async (id) => {
    try {
      await axios.delete(`/api/transactions/${id}`);
      dispatch({ type: types.DELETE_TRANSACTION, payload: id });
    } catch (err) { handleError(err, "Delete failed"); }
  };

  const getBudget = async () => {
    try {
      const res = await axios.get('/api/budget');
      dispatch({ type: 'GET_BUDGET', payload: res.data.data });
    } catch (err) { console.error("Budget fetch failed"); }
  };

  const updateBudget = async (b) => {
    try {
      const res = await axios.put('/api/budget', b);
      dispatch({ type: 'UPDATE_BUDGET', payload: res.data.data });
      setAlert("Financial goals updated", "success");
    } catch (err) { handleError(err, "Budget sync failed"); }
  };

  return (
    <GlobalContext.Provider value={{ 
      ...state, login, register, logout, getTransactions, 
      addTransaction, deleteTransaction, toggleTheme, 
      updateDetails, updatePassword, getLogs, getBudget, 
      updateBudget, setAlert 
    }}>
      {children}
    </GlobalContext.Provider>
  );
};