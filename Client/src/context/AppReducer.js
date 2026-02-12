import * as types from './types';

const AppReducer = (state, action) => {
  switch (action.type) {
    // --- UI & NOTIFICATIONS ---
    case types.SET_LOADING:
      return {
        ...state,
        loading: true
      };

    case types.SET_ALERT:
      return {
        ...state,
        alert: action.payload
      };

    case types.CLEAR_ALERT:
      return {
        ...state,
        alert: null
      };

    // --- AUTHENTICATION ---
    case types.USER_LOADED:
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload
      };

    case types.LOGIN_SUCCESS:
    case types.REGISTER_SUCCESS:
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
        loading: false // CRITICAL: Fixes the "Synchronizing Session" hang
      };

    case types.AUTH_ERROR:
    case types.LOGIN_FAIL:
    case types.REGISTER_FAIL:
    case types.LOGOUT:
      localStorage.removeItem('token');
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
        user: null,
        transactions: [],
        budget: null
      };

    // --- TRANSACTIONS ---
    case types.GET_TRANSACTIONS:
      return {
        ...state,
        loading: false,
        transactions: action.payload.data || action.payload,
        pagination: {
          currentPage: action.payload.currentPage || 1,
          pages: action.payload.pages || 1,
          total: action.payload.total || 0,
          limit: action.payload.limit || 10
        }
      };

    case types.ADD_TRANSACTION:
      return {
        ...state,
        transactions: [action.payload, ...state.transactions]
      };

    case types.DELETE_TRANSACTION:
      return {
        ...state,
        transactions: state.transactions.filter(
          (t) => t._id !== action.payload
        )
      };

    case types.UPDATE_TRANSACTION:
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t._id === action.payload._id ? action.payload : t
        )
      };

    case types.TRANSACTION_ERROR:
      return {
        ...state,
        error: action.payload
      };

    // --- BUDGET & SECURITY ---
    case 'GET_BUDGET':
    case 'UPDATE_BUDGET':
      return {
        ...state,
        budget: action.payload,
        loading: false
      };

    case 'GET_LOGS':
      return {
        ...state,
        logs: action.payload,
        loading: false
      };

    // --- SUMMARY & ANALYTICS (Cached Data) ---
    case types.SET_SUMMARY:
      return {
        ...state,
        summary: action.payload
      };

    case types.SET_ANALYTICS:
      return {
        ...state,
        analytics: action.payload
      };

    default:
      return state;
  }
};

export default AppReducer;