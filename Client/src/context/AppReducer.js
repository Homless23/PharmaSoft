/* eslint-disable import/no-anonymous-default-export */
export default (state, action) => {
    switch (action.type) {
        case 'GET_TRANSACTIONS':
            return {
                ...state,
                loading: false,
                transactions: action.payload,
                error: null
            };
        case 'ADD_TRANSACTION':
            return {
                ...state,
                transactions: [action.payload, ...state.transactions],
                error: null
            };
        case 'DELETE_TRANSACTION':
            return {
                ...state,
                transactions: state.transactions.filter(t => t._id !== action.payload)
            };
        case 'TRANSACTION_ERROR':
            return {
                ...state,
                error: action.payload,
                loading: false
            };
        case 'CLEAR_ERRORS':
            return { ...state, error: null };
            
        // --- AUTH ACTIONS ---
        case 'LOGIN_SUCCESS':
        case 'REGISTER_SUCCESS':
            localStorage.setItem('token', action.payload.token); // Save token to browser
            return {
                ...state,
                ...action.payload,
                isAuthenticated: true,
                loading: false,
                error: null
            };
        case 'AUTH_ERROR':
        case 'LOGIN_FAIL':
        case 'LOGOUT':
            localStorage.removeItem('token'); // Destroy token
            return {
                ...state,
                token: null,
                user: null,
                isAuthenticated: false,
                loading: false,
                error: action.payload
            };
        default:
            return state;
    }
};