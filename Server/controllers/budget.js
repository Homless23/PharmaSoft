const Budget = require('../models/Budget');

// @desc    Get user budget
// @route   GET /api/budget
exports.getBudget = async (req, res) => {
  try {
    let budget = await Budget.findOne({ user: req.user });

    // If no budget exists, create a default one
    if (!budget) {
      budget = await Budget.create({ user: req.user });
    }

    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Update user budget
// @route   PUT /api/budget
exports.updateBudget = async (req, res) => {
  try {
    let budget = await Budget.findOne({ user: req.user });

    if (!budget) {
      budget = await Budget.create({ ...req.body, user: req.user });
    } else {
      budget = await Budget.findOneAndUpdate(
        { user: req.user },
        req.body,
        { new: true, runValidators: true }
      );
    }

    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Budget update failed' });
  }
};