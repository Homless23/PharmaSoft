import React from 'react';
import { Flex, Spin } from 'antd';

const Spinner = () => {
  return (
    <Flex
      role="status"
      aria-live="polite"
      aria-label="Loading"
      justify="center"
      align="center"
      style={{ minHeight: '40vh' }}
    >
      <Spin size="large" />
    </Flex>
  );
};

export default Spinner;
