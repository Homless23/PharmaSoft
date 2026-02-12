import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useGlobalContext } from './context/globalContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Analytics from './pages/Analytics';
import Spinner from './components/Spinner';
import './App.css';

/**
 * Protected route component to handle authenticated routes
 * Shows loading spinner while checking auth state
 */
const ProtectedRoute = ({ isAuthenticated, isLoading, element }) => {
    if (isLoading) {
        return <Spinner />;
    }
    return isAuthenticated ? element : <Navigate to="/login" replace />;
};

/**
 * Public route component for auth pages
 * Redirects authenticated users away from login/signup
 */
const PublicRoute = ({ isAuthenticated, isLoading, element }) => {
    if (isLoading) {
        return <Spinner />;
    }
    return !isAuthenticated ? element : <Navigate to="/" replace />;
};

/**
 * Main app content with routing logic
 * Handles initial user state restoration and route protection
 */
const AppContent = () => {
    const { user, setUser } = useGlobalContext();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Initialize user from localStorage on app mount
     * Only called once to restore persisted auth state
     */
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
            }
        } catch (err) {
            console.error('Failed to restore user from localStorage:', err);
            setError('Failed to restore session. Please log in again.');
            localStorage.removeItem('user');
        } finally {
            setIsLoading(false);
        }
    }, [setUser]);

    // Show error fallback if user restoration failed
    if (error) {
        return (
            <div className="error-container">
                <h2>Session Error</h2>
                <p>{error}</p>
                <Routes>
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </div>
        );
    }

    return (
        <Routes>
            <Route
                path="/"
                element={
                    <ProtectedRoute
                        isAuthenticated={!!user}
                        isLoading={isLoading}
                        element={<Home />}
                    />
                }
            />
            <Route
                path="/analytics"
                element={
                    <ProtectedRoute
                        isAuthenticated={!!user}
                        isLoading={isLoading}
                        element={<Analytics />}
                    />
                }
            />
            <Route
                path="/login"
                element={
                    <PublicRoute
                        isAuthenticated={!!user}
                        isLoading={isLoading}
                        element={<Login />}
                    />
                }
            />
            <Route
                path="/signup"
                element={
                    <PublicRoute
                        isAuthenticated={!!user}
                        isLoading={isLoading}
                        element={<Signup />}
                    />
                }
            />
            {/* Catch-all route for 404 pages */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

/**
 * Root App component
 * Note: GlobalProvider should only wrap the app once in index.js
 */
export default function App() {
    return <AppContent />;
}
