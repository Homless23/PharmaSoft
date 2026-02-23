import React, { useMemo, useState } from 'react';
import { AutoComplete, Card, List, Space, Tag, Typography } from 'antd';

const RxVerificationCard = ({ prescriptionRecord, medicines = [], onMatch }) => {
  const { Text } = Typography;
  const [query, setQuery] = useState('');
  const [matched, setMatched] = useState([]);

  const options = useMemo(
    () =>
      (medicines || []).map((item) => ({
        value: String(item?.name || '')
      })),
    [medicines]
  );

  const details = useMemo(() => {
    const mode = String(prescriptionRecord?.mode || 'none');
    if (mode === 'image') return prescriptionRecord?.imageDataUrl ? 'Prescription image attached' : 'No image attached';
    if (mode === 'digital') return prescriptionRecord?.digitalText || 'No digital text';
    return 'No prescription linked';
  }, [prescriptionRecord]);

  return (
    <Card size="small" title="Rx Verification">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue">Mode: {String(prescriptionRecord?.mode || 'none').toUpperCase()}</Tag>
          <Tag>Doctor: {prescriptionRecord?.doctorName || '-'}</Tag>
          <Tag>License: {prescriptionRecord?.doctorLicense || '-'}</Tag>
        </Space>
        <Text type="secondary">{details}</Text>
        <AutoComplete
          options={options}
          value={query}
          onChange={setQuery}
          onSelect={(value) => {
            const selected = (medicines || []).find((item) => String(item?.name || '') === String(value));
            if (!selected) return;
            setMatched((prev) => [...prev, selected].slice(-8));
            if (onMatch) onMatch(selected);
            setQuery('');
          }}
          placeholder="Match dispensed medicine to prescription"
          filterOption={(inputValue, option) => String(option?.value || '').toLowerCase().includes(inputValue.toLowerCase())}
        />
        <List
          size="small"
          dataSource={matched}
          locale={{ emptyText: 'No matched medicines yet' }}
          renderItem={(item) => (
            <List.Item>
              <Space>
                <strong>{item.name}</strong>
                <Text type="secondary">{item.genericName || '-'}</Text>
              </Space>
            </List.Item>
          )}
        />
      </Space>
    </Card>
  );
};

export default RxVerificationCard;
