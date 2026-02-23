import { useMemo } from 'react';

export const useGroupedTransactions = (transactions, categories) => {
  return useMemo(() => {
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const safeCategories = Array.isArray(categories) ? categories : [];

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Stock Budget Health (Current Month Only)
    const currentMonthTransactions = safeTransactions.filter(entry => {
      if (!entry || !entry.date) return false;
      if ((entry.type || 'outflow') === 'income') return false;
      const d = new Date(entry.date);
      if (Number.isNaN(d.getTime())) return false;
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalBudget = safeCategories.reduce((acc, cat) => acc + Number(cat?.budget || 0), 0);
    const totalSpentThisMonth = currentMonthTransactions.reduce((acc, item) => acc + Number(item?.amount || 0), 0);
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
    const sortedTransactions = [...safeTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedTransactions.forEach(transaction => {
      if (!transaction) return;
      if ((transaction.type || 'outflow') === 'income') return;
      const amount = Number(transaction.amount);
      if (!Number.isFinite(amount) || amount <= 0) return;

      const transactionDate = new Date(transaction.date);
      if (Number.isNaN(transactionDate.getTime())) return;
      const transactionTime = startOfDay(transactionDate);

      let targetGroup;

      if (transactionTime === todayTime) {
        targetGroup = 'today';
      } else if (transactionTime === yesterdayTime) {
        targetGroup = 'yesterday';
      } else if (transactionTime > weekThreshold) {
        targetGroup = 'thisWeek';
      } else {
        targetGroup = 'older';
      }

      groups[targetGroup].items.push(transaction);
      groups[targetGroup].total += amount;
    });

    // Determine status color/message
    let status = 'safe';
    let message = "Procurement is on track.";
    
    if (usagePercentage > 100) {
      status = 'danger';
      message = "Purchase cap exceeded!";
    } else if (usagePercentage > 80) {
      status = 'warning';
      message = "Stock budget is tight.";
    } else if (usagePercentage > 50) {
      message = "Halfway through monthly stock budget.";
    }

    if (totalBudget === 0) {
        status = 'neutral';
        message = "Set stock budgets to see health.";
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
  }, [transactions, categories]);
};

