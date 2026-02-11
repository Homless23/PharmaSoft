const express = require('express');
const router = express.Router();
const { getBudget, updateBudget } = require('../controllers/budget');
const auth = require('../middleware/auth');

// All budget routes are protected
router.use(auth);

router
  .route('/')
  .get(getBudget)
  .put(updateBudget);

module.exports = router;