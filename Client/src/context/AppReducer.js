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
        transactions: action.payload
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

    default:
      return state;
  }
};

export default AppReducer;