import React, { createContext, useReducer, useCallback, useEffect } from 'react';
import AppReducer from './AppReducer';
import api from '../services/api';

const initialState = {
    transactions: [],
    error: null,
    loading: true, // <--- Starts as true
    token: localStorage.getItem('token'),
    isAuthenticated: null,
    user: null
};

export const GlobalContext = createContext(initialState);

export const GlobalProvider = ({ children }) => {
    const [state, dispatch] = useReducer(AppReducer, initialState);

    // --- CRITICAL FIX: INITIAL LOAD CHECK ---
    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            
            if (token) {
                // If token exists, we assume they are logged in for now
                // (In a real production app, we would verify this token with the backend here)
                dispatch({ 
                    type: 'LOGIN_SUCCESS', 
                    payload: { token } 
                });
            } else {
                // No token found, stop loading so we can redirect to Login
                dispatch({ type: 'AUTH_ERROR' }); 
            }
        };

        loadUser();
    }, []); // Empty brackets [] means this runs exactly once when the app starts

    // --- Existing Actions ---

    const getTransactions = useCallback(async () => {
        try {
            const res = await api.get('/transactions');
            dispatch({ type: 'GET_TRANSACTIONS', payload: res.data.data });
        } catch (err) {
            dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.message });
        }
    }, []);

    const addTransaction = async (transaction) => {
        try {
            const res = await api.post('/transactions', transaction);
            dispatch({ type: 'ADD_TRANSACTION', payload: res.data.data });
        } catch (err) {
            dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.message });
        }
    };

    const deleteTransaction = async (id) => {
        try {
            await api.delete(`/transactions/${id}`);
            dispatch({ type: 'DELETE_TRANSACTION', payload: id });
        } catch (err) {
            dispatch({ type: 'TRANSACTION_ERROR', payload: err.response?.data?.message });
        }
    };

    const clearErrors = () => dispatch({ type: 'CLEAR_ERRORS' });

    async function register(user) {
        try {
            const res = await api.post('/auth/register', user);
            dispatch({ type: 'REGISTER_SUCCESS', payload: res.data });
        } catch (err) {
            dispatch({ type: 'AUTH_ERROR', payload: err.response?.data?.message });
        }
    }

    async function login(user) {
        try {
            const res = await api.post('/auth/login', user);
            dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
        } catch (err) {
            dispatch({ type: 'LOGIN_FAIL', payload: err.response?.data?.message });
        }
    }

    function logout() {
        dispatch({ type: 'LOGOUT' });
    }

    return (
        <GlobalContext.Provider value={{
            transactions: state.transactions,
            error: state.error,
            loading: state.loading,
            token: state.token,
            isAuthenticated: state.isAuthenticated,
            user: state.user,
            getTransactions,
            addTransaction,
            deleteTransaction,
            clearErrors,
            register,
            login,
            logout
        }}>
            {children}
        </GlobalContext.Provider>
    );
};