import React, { useContext, useState } from "react"
import axios from 'axios'

// --- CONFIGURATION ---
const BASE_URL = "http://localhost:5000/api/v1";

// 1. Create a specialized axios instance
// This automatically sends your 'token' cookie with every request
const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true 
});

const GlobalContext = React.createContext()

export const GlobalProvider = ({children}) => {

    // 2. Initialize with EMPTY ARRAYS [] to prevent "undefined" crashes
    // If you use null here, your app will crash on login.
    const [incomes, setIncomes] = useState([])
    const [expenses, setExpenses] = useState([])
    const [error, setError] = useState(null)

    // --- INCOME FUNCTIONS ---
    const addIncome = async (income) => {
        try {
            await api.post('/add-income', income)
            getIncomes()
        } catch (err) {
            setError(err.response?.data?.message || "Error adding income")
        }
    }

    const getIncomes = async () => {
        try {
            const response = await api.get('/get-incomes')
            // Safety: Ensure we always set an array
            setIncomes(Array.isArray(response.data) ? response.data : [])
        } catch (err) {
            setError(err.response?.data?.message || "Error fetching incomes")
        }
    }

    const deleteIncome = async (id) => {
        try {
            await api.delete(`/delete-income/${id}`)
            getIncomes()
        } catch (err) {
            setError(err.response?.data?.message || "Error deleting income")
        }
    }

    // --- EXPENSE FUNCTIONS ---
    const addExpense = async (income) => {
        try {
            await api.post('/add-expense', income)
            getExpenses()
        } catch (err) {
            setError(err.response?.data?.message || "Error adding expense")
        }
    }

    const getExpenses = async () => {
        try {
            const response = await api.get('/get-expenses')
            // Safety: Ensure we always set an array
            setExpenses(Array.isArray(response.data) ? response.data : [])
        } catch (err) {
            setError(err.response?.data?.message || "Error fetching expenses")
        }
    }

    const deleteExpense = async (id) => {
        try {
            await api.delete(`/delete-expense/${id}`)
            getExpenses()
        } catch (err) {
            setError(err.response?.data?.message || "Error deleting expense")
        }
    }

    // --- CALCULATION HELPERS ---
    const totalIncome = () => {
        if(!incomes || incomes.length === 0) return 0;
        let total = 0;
        incomes.forEach((income) =>{
            total = total + income.amount
        })
        return total;
    }

    const totalExpense = () => {
        if(!expenses || expenses.length === 0) return 0;
        let total = 0;
        expenses.forEach((expense) =>{
            total = total + expense.amount
        })
        return total;
    }

    const totalBalance = () => {
        return totalIncome() - totalExpense()
    }

    const transactionHistory = () => {
        const history = [...incomes, ...expenses]
        history.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt)
        })
        return history.slice(0, 3)
    }

    return (
        <GlobalContext.Provider value={{
            addIncome,
            getIncomes,
            incomes,
            deleteIncome,
            expenses,
            addExpense,
            getExpenses,
            deleteExpense,
            totalIncome,
            totalExpense,
            totalBalance,
            transactionHistory,
            error,
            setError
        }}>
            {children}
        </GlobalContext.Provider>
    )
}

export const useGlobalContext = () =>{
    return useContext(GlobalContext)
}