import React, { useContext, useState } from "react";
import axios from 'axios';

const BASE_URL = "http://localhost:5000/api";

const GlobalContext = React.createContext();

export const GlobalProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [error, setError] = useState(null);

    // --- AUTHENTICATION ---
    const registerUser = async (userData) => {
        try {
            const res = await axios.post(`${BASE_URL}/auth/register`, userData);
            // Save user & token
            localStorage.setItem('user', JSON.stringify(res.data));
            setUser(res.data);
            return true; 
        } catch (err) {
            setError(err.response?.data?.message || "Registration Failed");
            return false;
        }
    }

    const loginUser = async (userData) => {
        try {
            const res = await axios.post(`${BASE_URL}/auth/login`, userData);
            localStorage.setItem('user', JSON.stringify(res.data));
            setUser(res.data);
            return true;
        } catch (err) {
            setError(err.response?.data?.message || "Login Failed");
            return false;
        }
    }

    const logoutUser = () => {
        localStorage.removeItem('user');
        setUser(null);
        setExpenses([]); // Clear data on logout
    }

    // --- EXPENSES ---
    // Helper to get headers with token
    const getConfig = () => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        return {
            headers: {
                Authorization: `Bearer ${storedUser?.token}`
            }
        };
    }

    const addExpense = async (expense) => {
        try {
            await axios.post(`${BASE_URL}/v1/add-expense`, expense, getConfig());
            getExpenses(); // Refresh list
        } catch (err) {
            setError(err.response?.data?.message || "Error adding expense");
        }
    }

    const getExpenses = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/v1/get-expenses`, getConfig());
            setExpenses(res.data);
        } catch (err) {
            setError(err.response?.data?.message || "Error fetching expenses");
        }
    }

    const deleteExpense = async (id) => {
        try {
            await axios.delete(`${BASE_URL}/v1/delete-expense/${id}`, getConfig());
            getExpenses(); // Refresh list
        } catch (err) {
            setError(err.response?.data?.message || "Error deleting expense");
        }
    }

    return (
        <GlobalContext.Provider value={{
            user,
            setUser, // Exposed for App.js to check initialization
            expenses,
            error,
            setError,
            registerUser,
            loginUser,
            logoutUser,
            addExpense,
            getExpenses,
            deleteExpense
        }}>
            {children}
        </GlobalContext.Provider>
    )
}

export const useGlobalContext = () => {
    return useContext(GlobalContext);
}