const express = require('express');
const router = express.Router();
const { 
    getTransactions, 
    addTransaction, 
    deleteTransaction // 
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected by JWT/Guest Bypass
router.use(protect);

router.route('/')
    .get(getTransactions)
    .post(addTransaction);

router.route('/:id')
    .delete(deleteTransaction); // Express throws an error if this is undefined

module.exports = router;