const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal
} = require('../controllers/goalController');

router.get('/goals', protect, getGoals);
router.post('/goals', protect, createGoal);
router.put('/goals/:id', protect, updateGoal);
router.delete('/goals/:id', protect, deleteGoal);

module.exports = router;
