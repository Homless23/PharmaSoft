import React, { useMemo } from 'react';
import { Card, Tag, Timeline, Typography } from 'antd';

const TIME_PRESETS = {
  once: ['08:00 AM'],
  bid: ['08:00 AM', '08:00 PM'],
  tid: ['08:00 AM', '02:00 PM', '08:00 PM'],
  qid: ['06:00 AM', '12:00 PM', '06:00 PM', '10:00 PM']
};

const DoseScheduleTimeline = ({ frequency = 'bid', days = 5 }) => {
  const { Text } = Typography;
  const times = TIME_PRESETS[frequency] || TIME_PRESETS.bid;
  const timelineItems = useMemo(
    () =>
      times.map((time, index) => ({
        key: `${time}_${index}`,
        label: `Dose ${index + 1}`,
        children: `${time}`
      })),
    [times]
  );

  return (
    <Card size="small" title="Dose Schedule">
      <Text type="secondary">Planned for {Math.max(Number(days) || 1, 1)} day(s)</Text>
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <Tag color="blue">{String(frequency || 'bid').toUpperCase()}</Tag>
      </div>
      <Timeline mode="left" items={timelineItems} />
    </Card>
  );
};

export default DoseScheduleTimeline;
