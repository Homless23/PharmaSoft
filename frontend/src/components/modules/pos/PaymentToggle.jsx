import React from 'react';
import { Segmented } from 'antd';

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'esewa', label: 'eSewa' },
  { value: 'khalti', label: 'Khalti' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' }
];

const PaymentToggle = ({ value, onChange }) => {
  return (
    <Segmented
      block
      value={value}
      onChange={onChange}
      options={PAYMENT_OPTIONS}
    />
  );
};

export default PaymentToggle;
