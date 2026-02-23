import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useGlobalContext } from './context/globalContext';
import Spinner from './components/Spinner';
import Toast from './components/Toast';
import { ACTIONS, hasPermission, normalizeRole } from './config/rbacPolicy';
import './App.css';
import './styles/ui.css';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const SalesHistory = lazy(() => import('./pages/SalesHistory'));
const MedicineMaster = lazy(() => import('./pages/MedicineMaster'));
const Billing = lazy(() => import('./pages/Billing'));
const Categories = lazy(() => import('./pages/Categories'));
const Purchases = lazy(() => import('./pages/Purchases'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const StockAlerts = lazy(() => import('./pages/StockAlerts'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AccessDenied = lazy(() => import('./pages/AccessDenied'));

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

const getDefaultRouteForRole = (user) => {
    const role = normalizeRole(user?.role);
    if (hasPermission(role, ACTIONS.BILLING_ACCESS)) return '/billing';
    if (hasPermission(role, ACTIONS.TRANSACTIONS_MANAGE)) return '/dashboard';
    return '/profile';
};

const ActionProtectedRoute = ({ user, isLoading, action, element }) => {
    if (isLoading) {
        return <Spinner />;
    }
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    const normalizedRole = normalizeRole(user?.role);
    if (!hasPermission(normalizedRole, action)) {
        return <AccessDenied />;
    }
    return element;
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

const AdminRoute = ({ user, isLoading, element }) => {
    if (isLoading) {
        return <Spinner />;
    }
    if (!user) {
        return <Navigate to="/admin/login" replace />;
    }
    return user?.role === 'admin' ? element : <AccessDenied />;
};

/**
 * Main app content with routing logic
 * Handles initial user state restoration and route protection
 */
const AppContent = () => {
    const { user, setUser, getCurrentUser } = useGlobalContext();
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        let isMounted = true;
        const bootstrapSession = async () => {
            const result = await getCurrentUser({ silent: true });
            if (isMounted) {
                setUser(result.success ? result.data : null);
                setIsLoading(false);
            }
        };
        bootstrapSession();
        return () => {
            isMounted = false;
        };
    }, [getCurrentUser, setUser]);

    return (
        <>
            <Suspense fallback={<Spinner />}>
                <Routes>
                    {/* Session entrypoint */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute
                                isAuthenticated={!!user}
                                isLoading={isLoading}
                                element={<Navigate to={getDefaultRouteForRole(user)} replace />}
                            />
                        }
                    />
                    {/* Main PMS operations */}
                    <Route
                        path="/dashboard"
                        element={
                            <ActionProtectedRoute
                                user={user}
                                isLoading={isLoading}
                                action={ACTIONS.TRANSACTIONS_MANAGE}
                                element={<Dashboard />}
                            />
                        }
                    />
                    <Route
                        path="/sales-history"
                        element={
                            <ActionProtectedRoute
                                user={user}
                                isLoading={isLoading}
                                action={ACTIONS.TRANSACTIONS_MANAGE}
                                element={<SalesHistory />}
                            />
                        }
                    />
                    <Route
                        path="/medicine-master"
                        element={
                            <ActionProtectedRoute
                                user={user}
                                isLoading={isLoading}
                                action={ACTIONS.MEDICINE_WRITE}
                                element={<MedicineMaster />}
                            />
                        }
                    />
                    <Route
                        path="/billing"
                        element={
                            <ActionProtectedRoute
                                user={user}
                                isLoading={isLoading}
                                action={ACTIONS.BILLING_ACCESS}
                                element={<Billing />}
                            />
                        }
                    />
                    <Route
                        path="/inventory"
                        element={
                            <ActionProtectedRoute
                                user={user}
                                isLoading={isLoading}
                                action={ACTIONS.MEDICINE_WRITE}
                                element={<Categories />}
                            />
                        }
                    />
                    <Route
                        path="/purchases"
                        element={
                            <ActionProtectedRoute
                                user={user}
                                isLoading={isLoading}
                                action={ACTIONS.STOCK_MANAGE}
                                element={<Purchases />}
                            />
                        }
                    />
                    <Route
                        path="/reports"
                        element={
                            <ActionProtectedRoute
                                user={user}
                                isLoading={isLoading}
                                action={ACTIONS.REPORTS_VIEW_PROFIT}
                                element={<Reports />}
                            />
                        }
                    />
                    <Route
                        path="/stock-alerts"
                        element={
                            <ActionProtectedRoute
                                user={user}
                                isLoading={isLoading}
                                action={ACTIONS.MEDICINE_VIEW}
                                element={<StockAlerts />}
                            />
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ActionProtectedRoute
                                user={user}
                                isLoading={isLoading}
                                action={ACTIONS.SETTINGS_MANAGE}
                                element={<Settings />}
                            />
                        }
                    />
                    {/* User/admin account area */}
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute
                                isAuthenticated={!!user}
                                isLoading={isLoading}
                                element={<Profile />}
                            />
                        }
                    />
                    <Route
                        path="/admin"
                        element={
                            <AdminRoute
                                user={user}
                                isLoading={isLoading}
                                element={<Admin />}
                            />
                        }
                    />
                    <Route
                        path="/analytics"
                        element={
                            <ActionProtectedRoute
                                user={user}
                                isLoading={isLoading}
                                action={ACTIONS.REPORTS_VIEW_PROFIT}
                                element={<Analytics />}
                            />
                        }
                    />
                    <Route
                        path="/transactions"
                        element={<Navigate to="/sales-history" replace />}
                    />
                    <Route
                        path="/add"
                        element={<Navigate to="/medicine-master" replace />}
                    />
                    <Route
                        path="/budget"
                        element={<Navigate to="/billing" replace />}
                    />
                    <Route
                        path="/categories"
                        element={<Navigate to="/inventory" replace />}
                    />
                    <Route
                        path="/history"
                        element={<Navigate to="/sales-history" replace />}
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
                    <Route
                        path="/admin/login"
                        element={
                            <PublicRoute
                                isAuthenticated={!!user}
                                isLoading={isLoading}
                                element={<AdminLogin />}
                            />
                        }
                    />
                    {/* Catch-all route for 404 pages */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
            <Toast />
        </>
    );
};

/**
 * Root App component
 * Note: GlobalProvider should only wrap the app once in index.js
 */
export default function App() {
    return <AppContent />;
}
