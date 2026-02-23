import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input, Typography } from 'antd';
import { BarcodeOutlined } from '@ant-design/icons';

const BarcodeScannerInput = ({
  onScan,
  placeholder = 'Scan barcode or type manually',
  minScanLength = 4,
  scanWindowMs = 40
}) => {
  const { Text } = Typography;
  const [value, setValue] = useState('');
  const [lastScan, setLastScan] = useState('');
  const bufferRef = useRef('');
  const timerRef = useRef(null);
  const activeRef = useRef(false);

  const flushScan = useMemo(
    () => () => {
      const code = String(bufferRef.current || '').trim();
      bufferRef.current = '';
      if (code.length >= minScanLength) {
        setLastScan(code);
        if (onScan) onScan(code);
      }
    },
    [minScanLength, onScan]
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!activeRef.current) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        if (timerRef.current) clearTimeout(timerRef.current);
        flushScan();
        return;
      }
      if (event.key.length !== 1) return;
      bufferRef.current += event.key;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        flushScan();
      }, scanWindowMs);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flushScan, scanWindowMs]);

  return (
    <div>
      <Input
        prefix={<BarcodeOutlined />}
        value={value}
        placeholder={placeholder}
        onFocus={() => {
          activeRef.current = true;
        }}
        onBlur={() => {
          activeRef.current = false;
        }}
        onChange={(e) => setValue(e.target.value)}
        onPressEnter={() => {
          const code = String(value || '').trim();
          if (!code) return;
          setLastScan(code);
          if (onScan) onScan(code);
          setValue('');
        }}
      />
      {lastScan ? <Text type="secondary">Last scan: {lastScan}</Text> : null}
    </div>
  );
};

export default BarcodeScannerInput;
