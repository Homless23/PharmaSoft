import * as types from './types';

export default (state, action) => {
  switch (action.type) {
    case types.SET_LOADING:
      return { ...state, loading: true };
    case types.USER_LOADED:
      return { ...state, isAuthenticated: true, loading: false, user: action.payload };
    case types.REGISTER_SUCCESS:
    case types.LOGIN_SUCCESS:
      localStorage.setItem('token', action.payload.token);
      return { ...state, token: action.payload.token, isAuthenticated: true, loading: false };
    case types.AUTH_ERROR:
    case types.LOGIN_FAIL:
    case types.REGISTER_FAIL:
    case types.LOGOUT:
      localStorage.removeItem('token');
      return { ...state, token: null, isAuthenticated: false, loading: false, user: null, transactions: [] };
    case types.GET_TRANSACTIONS:
      return { ...state, transactions: action.payload, loading: false };
    case types.ADD_TRANSACTION:
      return { ...state, transactions: [action.payload, ...state.transactions], loading: false };
    case types.UPDATE_TRANSACTION:
      return {
        ...state,
        transactions: state.transactions.map(t => t._id === action.payload._id ? action.payload : t),
        loading: false
      };
    case types.DELETE_TRANSACTION:
      return { ...state, transactions: state.transactions.filter(t => t._id !== action.payload), loading: false };
    case types.BULK_DELETE_TRANSACTIONS:
      return { ...state, transactions: state.transactions.filter(t => !action.payload.includes(t._id)), loading: false };
    case types.SET_ALERT:
      return { ...state, alert: action.payload };
    case types.CLEAR_ALERT:
      return { ...state, alert: null };
    case types.TRANSACTION_ERROR:
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
};