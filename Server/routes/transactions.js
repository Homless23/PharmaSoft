const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const { getTransactions, addTransaction, deleteTransaction } = require('../controllers/transactions');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Transaction Validation Rules
const transactionRules = [
  check('text', 'Description is required').not().isEmpty().trim(),
  check('amount', 'Amount must be a non-zero number').isNumeric().not().equals('0'),
  check('category', 'Please select a valid category').not().isEmpty()
];

router
  .route('/')
  .get(auth, getTransactions)
  .post(
    auth,
    transactionRules,
    validate,
    addTransaction
  );

router
  .route('/:id')
  .delete(auth, deleteTransaction);

module.exports = router;