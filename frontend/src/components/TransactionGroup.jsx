import React from 'react';
import TransactionItem from './TransactionItem';

const TransactionGroup = ({ group, currencySymbol, onDelete }) => {
  return (
    <div className="transaction-group">
      <div className="group-header">
        <h5 className="group-title">{group.title}</h5>
        <span className="group-total">
          {currencySymbol}{group.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} spent
        </span>
      </div>
      
      <div className="group-list">
        {group.items.map(item => (
          <TransactionItem 
            key={item._id} 
            item={item} 
            currencySymbol={currencySymbol} 
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default TransactionGroup;