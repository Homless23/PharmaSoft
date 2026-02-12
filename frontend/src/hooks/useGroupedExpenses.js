import { useMemo } from 'react';

export const useGroupedExpenses = (expenses, categories) => {
  return useMemo(() => {
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    const safeCategories = Array.isArray(categories) ? categories : [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Financial Health (Current Month Only)
    const currentMonthExpenses = safeExpenses.filter(exp => {
      if (!exp || !exp.date) return false;
      if ((exp.type || 'expense') !== 'expense') return false;
      const d = new Date(exp.date);
      if (Number.isNaN(d.getTime())) return false;
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalBudget = safeCategories.reduce((acc, cat) => acc + Number(cat?.budget || 0), 0);
    const totalSpentThisMonth = currentMonthExpenses.reduce((acc, item) => acc + Number(item?.amount || 0), 0);
    const remaining = totalBudget - totalSpentThisMonth;
    const usagePercentage = totalBudget > 0 ? (totalSpentThisMonth / totalBudget) * 100 : 0;

    // 2. Grouping Logic
    const groups = {
      today: { title: 'Today', items: [], total: 0 },
      yesterday: { title: 'Yesterday', items: [], total: 0 },
      thisWeek: { title: 'This Week', items: [], total: 0 },
      older: { title: 'Older', items: [], total: 0 },
    };

    // Helper to strip time for strictly date comparison
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const todayTime = startOfDay(now);
    const yesterdayTime = todayTime - 86400000;
    const weekThreshold = todayTime - (86400000 * 7);

    // Sort descending by date first
    const sortedExpenses = [...safeExpenses].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedExpenses.forEach(expense => {
      if (!expense) return;
      if ((expense.type || 'expense') !== 'expense') return;
      const amount = Number(expense.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;

      const expDate = new Date(expense.date);
      if (Number.isNaN(expDate.getTime())) return;
      const expTime = startOfDay(expDate);

      let targetGroup;

      if (expTime === todayTime) {
        targetGroup = 'today';
      } else if (expTime === yesterdayTime) {
        targetGroup = 'yesterday';
      } else if (expTime > weekThreshold) {
        targetGroup = 'thisWeek';
      } else {
        targetGroup = 'older';
      }

      groups[targetGroup].items.push(expense);
      groups[targetGroup].total += amount;
    });

    // Determine status color/message
    let status = 'safe';
    let message = "You are doing great!";
    
    if (usagePercentage > 100) {
      status = 'danger';
      message = "Limit exceeded!";
    } else if (usagePercentage > 80) {
      status = 'warning';
      message = "Budget is tight.";
    } else if (usagePercentage > 50) {
      message = "Halfway through monthly budget.";
    }

    if (totalBudget === 0) {
        status = 'neutral';
        message = "Set budgets to see health.";
    }

    return {
      financials: {
        totalBudget,
        totalSpent: totalSpentThisMonth,
        remaining,
        usagePercentage,
        status,
        message
      },
      groupedData: [
        groups.today,
        groups.yesterday,
        groups.thisWeek,
        groups.older
      ].filter(g => g.items.length > 0) // Only return groups with data
    };
  }, [expenses, categories]);
};
