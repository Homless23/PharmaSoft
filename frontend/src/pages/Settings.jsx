import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, Input, InputNumber, Select, Space, Typography } from 'antd';
import AppShell from '../components/AppShell';
import api from '../services/api';
import { useGlobalContext } from '../context/globalContext';
import { getApiErrorMessage } from '../utils/apiError';

const Settings = () => {
  const { Title } = Typography;
  const { showToast } = useGlobalContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    businessName: '',
    businessPan: '',
    businessAddress: '',
    defaultVatRate: 13,
    receiptFooter: '',
    printerType: 'thermal_80mm'
  });
  const [backupFile, setBackupFile] = useState(null);
  const [importIncludeBills, setImportIncludeBills] = useState(false);
  const [importReplace, setImportReplace] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/v1/settings');
      setForm({
        businessName: String(res?.data?.businessName || ''),
        businessPan: String(res?.data?.businessPan || ''),
        businessAddress: String(res?.data?.businessAddress || ''),
        defaultVatRate: Number(res?.data?.defaultVatRate ?? 13),
        receiptFooter: String(res?.data?.receiptFooter || ''),
        printerType: String(res?.data?.printerType || 'thermal_80mm')
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to load settings'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      await api.put('/v1/settings', {
        businessName: form.businessName,
        businessPan: form.businessPan,
        businessAddress: form.businessAddress,
        defaultVatRate: Number(form.defaultVatRate || 0),
        receiptFooter: form.receiptFooter,
        printerType: form.printerType
      });
      showToast('Settings saved', { type: 'success' });
      await loadSettings();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const exportBackup = async () => {
    try {
      const res = await api.get('/admin/backup/export');
      const payload = JSON.stringify(res?.data || {}, null, 2);
      const blob = new Blob([payload], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pharmacy_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup exported', { type: 'success' });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to export backup'));
    }
  };

  const importBackup = async () => {
    if (!backupFile) {
      showToast('Select a backup file first', { type: 'warning' });
      return;
    }
    try {
      const text = await backupFile.text();
      const parsed = JSON.parse(text);
      await api.post('/admin/backup/import', {
        ...parsed,
        replaceExisting: importReplace,
        includeBills: importIncludeBills
      });
      showToast('Backup imported', { type: 'success' });
      await loadSettings();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to import backup'));
    }
  };

  return (
    <AppShell title="Settings" subtitle="Business profile, VAT, and receipt defaults">
      {loading ? <Alert style={{ marginBottom: 12 }} type="info" showIcon message="Loading settings..." /> : null}
      {error ? <Alert style={{ marginBottom: 12 }} type="error" showIcon message={error} /> : null}
      <Card>
        <Title level={4} style={{ marginTop: 0 }}>Application Settings</Title>
        <div className="form-grid cols-3">
          <div className="form-field">
            <label>Business Name</label>
            <Input value={form.businessName} onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Business PAN</label>
            <Input value={form.businessPan} onChange={(e) => setForm((p) => ({ ...p, businessPan: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Default VAT %</label>
            <InputNumber min={0} max={100} value={form.defaultVatRate} onChange={(v) => setForm((p) => ({ ...p, defaultVatRate: Number(v || 0) }))} style={{ width: '100%' }} />
          </div>
          <div className="form-field">
            <label>Business Address</label>
            <Input value={form.businessAddress} onChange={(e) => setForm((p) => ({ ...p, businessAddress: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Printer Type</label>
            <Select
              value={form.printerType}
              onChange={(value) => setForm((p) => ({ ...p, printerType: value }))}
              options={[
                { value: 'thermal_80mm', label: 'Thermal 80mm' },
                { value: 'a4', label: 'A4' },
                { value: 'other', label: 'Other' }
              ]}
            />
          </div>
          <div className="form-field">
            <label>Receipt Footer</label>
            <Input.TextArea rows={2} value={form.receiptFooter} onChange={(e) => setForm((p) => ({ ...p, receiptFooter: e.target.value }))} />
          </div>
        </div>
        <Button type="primary" loading={saving} onClick={saveSettings} style={{ marginTop: 10 }}>
          Save Settings
        </Button>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Title level={4} style={{ marginTop: 0 }}>Backup</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Button onClick={exportBackup}>Export Backup (.json)</Button>
          </Space>
          <Input type="file" accept="application/json,.json" onChange={(e) => setBackupFile(e.target.files?.[0] || null)} />
          <Checkbox checked={importReplace} onChange={(e) => setImportReplace(e.target.checked)}>
            Replace existing tenant data before import
          </Checkbox>
          <Checkbox checked={importIncludeBills} onChange={(e) => setImportIncludeBills(e.target.checked)}>
            Include bills in import
          </Checkbox>
          <Button type="primary" danger onClick={importBackup}>
            Import Backup
          </Button>
        </Space>
      </Card>
    </AppShell>
  );
};

export default Settings;
