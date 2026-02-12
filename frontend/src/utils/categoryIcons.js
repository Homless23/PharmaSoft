import React from 'react';
import {
  FiBriefcase,
  FiDollarSign,
  FiFilm,
  FiHeart,
  FiHome,
  FiMapPin,
  FiPackage,
  FiShoppingBag,
  FiTool,
  FiTruck,
  FiTrendingUp
} from 'react-icons/fi';

const iconStyle = { fontSize: '1rem' };

const CATEGORY_ICON_MAP = {
  Food: <FiPackage style={iconStyle} />,
  Transport: <FiTruck style={iconStyle} />,
  Entertainment: <FiFilm style={iconStyle} />,
  Bills: <FiHome style={iconStyle} />,
  Health: <FiHeart style={iconStyle} />,
  Shopping: <FiShoppingBag style={iconStyle} />,
  Groceries: <FiPackage style={iconStyle} />,
  Rent: <FiHome style={iconStyle} />,
  Education: <FiBriefcase style={iconStyle} />,
  Travel: <FiMapPin style={iconStyle} />,
  Investment: <FiTrendingUp style={iconStyle} />,
  Investments: <FiTrendingUp style={iconStyle} />,
  Salary: <FiDollarSign style={iconStyle} />,
  Bonus: <FiDollarSign style={iconStyle} />,
  Freelance: <FiBriefcase style={iconStyle} />,
  Gift: <FiPackage style={iconStyle} />,
  Tools: <FiTool style={iconStyle} />,
  Other: <FiPackage style={iconStyle} />
};

export const getCategoryIcon = (category, type = 'expense') => {
  if (type === 'income') {
    return <FiDollarSign style={iconStyle} />;
  }
  return CATEGORY_ICON_MAP[category] || <FiPackage style={iconStyle} />;
};
