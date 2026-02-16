const Category = require('../models/Category');

const normalizeCategoryName = (value) => String(value || '').trim().toLowerCase();

const scoreCategory = (category) => {
    const activeScore = category.active === false ? 0 : 1;
    const dateScore = new Date(category.date || category.updatedAt || category.createdAt || 0).getTime();
    return (activeScore * 10_000_000_000_000) + dateScore;
};

const cleanupCategoryDuplicatesForUser = async (userId) => {
    const categories = await Category.find({ user: userId }).lean();
    if (!categories.length) {
        return {
            userId: String(userId),
            totalCategories: 0,
            groupsWithDuplicates: 0,
            removed: 0,
            updated: 0
        };
    }

    const grouped = new Map();
    categories.forEach((category) => {
        const key = normalizeCategoryName(category.name);
        if (!key) return;
        const arr = grouped.get(key) || [];
        arr.push(category);
        grouped.set(key, arr);
    });

    const toDeleteIds = [];
    const updates = [];
    let groupsWithDuplicates = 0;

    grouped.forEach((group, normalizedName) => {
        if (group.length <= 1) return;
        groupsWithDuplicates += 1;

        const sorted = [...group].sort((a, b) => scoreCategory(b) - scoreCategory(a));
        const keeper = sorted[0];
        const duplicates = sorted.slice(1);

        let nextBudget = Number(keeper.budget || 0);
        let nextActive = keeper.active !== false;
        let nextName = String(keeper.name || '').trim();

        duplicates.forEach((dup) => {
            const dupBudget = Number(dup.budget || 0);
            if (dupBudget > nextBudget) nextBudget = dupBudget;
            if (dup.active !== false) nextActive = true;
            toDeleteIds.push(dup._id);
        });

        if (!nextName) {
            nextName = normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1);
        }

        const shouldUpdate =
            Number(keeper.budget || 0) !== nextBudget ||
            (keeper.active !== false) !== nextActive ||
            String(keeper.name || '').trim() !== nextName;

        if (shouldUpdate) {
            updates.push({
                id: keeper._id,
                payload: {
                    budget: nextBudget,
                    active: nextActive,
                    name: nextName,
                    date: new Date()
                }
            });
        }
    });

    if (updates.length) {
        await Promise.all(
            updates.map((item) => Category.findByIdAndUpdate(item.id, { $set: item.payload }))
        );
    }
    if (toDeleteIds.length) {
        await Category.deleteMany({ _id: { $in: toDeleteIds } });
    }

    return {
        userId: String(userId),
        totalCategories: categories.length,
        groupsWithDuplicates,
        removed: toDeleteIds.length,
        updated: updates.length
    };
};

module.exports = {
    cleanupCategoryDuplicatesForUser
};
