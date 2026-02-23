import React, { useState } from 'react';
import { Button, InputNumber, Modal, Slider, Space, Typography } from 'antd';
import { useGlobalContext } from '../context/globalContext';

const OnboardingWizard = ({ onClose }) => {
  const { Title, Text } = Typography;
  const { autoAllocateBudgets, getData } = useGlobalContext();
  const [income, setIncome] = useState(null);
  const [savingsRate, setSavingsRate] = useState(20);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState(1);

  const handleAutoBudget = async () => {
    const monthlyIncome = Number(income);
    if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) return;

    setIsSaving(true);
    const savingsBudget = monthlyIncome * (Number(savingsRate || 0) / 100);
    const result = await autoAllocateBudgets({
      income: monthlyIncome,
      savingsTarget: savingsBudget,
      apply: true
    });
    if (result.success) {
      await getData({ force: true });
      setStep(2);
    }
    setIsSaving(false);
  };

  return (
    <Modal open onCancel={onClose} footer={null} title={step === 1 ? 'Smart Budget Assistant' : 'Budgets Applied'}>
      {step === 1 ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>Set your income once and distribute category budgets using a realistic split.</Text>
          <InputNumber style={{ width: '100%' }} min={0} value={income} onChange={setIncome} placeholder="Monthly income" />
          <Text>Savings Goal: {savingsRate}%</Text>
          <Slider min={0} max={80} step={5} value={Number(savingsRate)} onChange={setSavingsRate} />
          <Space>
            <Button type="primary" loading={isSaving} disabled={!income} onClick={handleAutoBudget}>
              Apply Plan
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </Space>
        </Space>
      ) : (
        <Space direction="vertical">
          <Title level={4}>Budgets Applied</Title>
          <Text>All categories were updated based on your income and savings preference.</Text>
          <Button type="primary" onClick={onClose}>Done</Button>
        </Space>
      )}
    </Modal>
  );
};

export default OnboardingWizard;
