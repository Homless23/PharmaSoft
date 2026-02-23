import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography
} from 'antd';
import dayjs from 'dayjs';
import AppShell from '../components/AppShell';
import BillingWorkhorse from '../components/billing/BillingWorkhorse';
import BatchSelectionOverlay from '../components/billing/BatchSelectionOverlay';
import ExpiredOverrideModal from '../components/billing/ExpiredOverrideModal';
import DrugInteractionAlert from '../components/modules/prescription/DrugInteractionAlert';
import DoseScheduleTimeline from '../components/modules/prescription/DoseScheduleTimeline';
import RxVerificationCard from '../components/modules/prescription/RxVerificationCard';
import PaymentToggle from '../components/modules/pos/PaymentToggle';
import POSSidebarCart from '../components/modules/pos/POSSidebarCart';
import { buildThermalInvoiceHtml } from '../components/modules/pos/InvoiceTemplate';
import AddressBookForm from '../components/modules/profiles/AddressBookForm';
import PatientHistoryDrawer from '../components/modules/profiles/PatientHistoryDrawer';
import { useGlobalContext } from '../context/globalContext';
import api from '../services/api';
import { ACTIONS, hasPermission, normalizeRole } from '../config/rbacPolicy';
import { exportRowsToPDF, exportTableToXlsx } from '../utils/export';
import { getApiError, getApiErrorMessage } from '../utils/apiError';
import './DashboardUI.css';

const formatDateForInput = (date) => new Date(date).toISOString().slice(0, 10);
const formatDisplayDate = (date) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString();
};
const getDaysUntil = (date) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.ceil((parsed.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};
const isNearExpiry = (date, thresholdDays = 30) => {
  const days = getDaysUntil(date);
  return days !== null && days >= 0 && days <= thresholdDays;
};
const isExpired = (date) => {
  const days = getDaysUntil(date);
  return days !== null && days < 0;
};
const toBatchChoices = (medicine) => {
  const fromBatches = Array.isArray(medicine?.batches)
    ? medicine.batches
      .map((batch) => ({
        batchNumber: String(batch?.batchNumber || '').trim(),
        expiryDate: batch?.expiryDate || null,
        qty: Math.max(Number(batch?.qty || 0), 0)
      }))
      .filter((batch) => batch.batchNumber && batch.qty > 0)
    : [];
  if (fromBatches.length) {
    return fromBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }
  if (medicine?.batchNumber) {
    return [{
      batchNumber: String(medicine.batchNumber),
      expiryDate: medicine.expiryDate || null,
      qty: Math.max(Number(medicine.stockQty || 0), 0)
    }];
  }
  return [];
};
const getMedicineSafetyTone = (medicine) => {
  const regulatoryClass = String(medicine?.regulatoryClass || 'none').toLowerCase();
  if (medicine?.prescriptionRequired || ['narcotic', 'schedule_h', 'psychotropic'].includes(regulatoryClass)) {
    return 'regulated';
  }
  return 'normal';
};
const normalizeCustomerName = (value) => String(value || '').trim();
let lineIdCounter = 0;
const createLineId = (seed = 0) => {
  lineIdCounter += 1;
  return `${Date.now()}_${seed}_${lineIdCounter}`;
};
const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Failed to read file'));
  reader.readAsDataURL(file);
});
const createClientRequestId = () => `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const ADDRESS_BOOK_KEY = 'address_book_entries_v1';
const DRUG_INTERACTION_RULES = [
  { left: 'warfarin', right: 'aspirin', severity: 'high', message: 'Increased bleeding risk.' },
  { left: 'warfarin', right: 'ibuprofen', severity: 'high', message: 'Major bleeding interaction.' },
  { left: 'atorvastatin', right: 'clarithromycin', severity: 'high', message: 'May increase statin toxicity.' },
  { left: 'azithromycin', right: 'digoxin', severity: 'medium', message: 'Monitor digoxin levels and ECG.' },
  { left: 'metformin', right: 'ciprofloxacin', severity: 'medium', message: 'May alter blood glucose control.' }
];

const getMedicineIdentity = (medicine) => {
  const generic = String(medicine?.genericName || '').trim().toLowerCase();
  if (generic) return generic;
  return String(medicine?.name || '').trim().toLowerCase();
};

const findDrugInteractionConflicts = (targetMedicine, existingMedicines) => {
  const targetKey = getMedicineIdentity(targetMedicine);
  if (!targetKey) return [];
  const conflicts = [];
  (existingMedicines || []).forEach((medicine) => {
    const existingKey = getMedicineIdentity(medicine);
    if (!existingKey) return;
    DRUG_INTERACTION_RULES.forEach((rule, idx) => {
      const left = String(rule.left || '').toLowerCase();
      const right = String(rule.right || '').toLowerCase();
      const match =
        (targetKey.includes(left) && existingKey.includes(right)) ||
        (targetKey.includes(right) && existingKey.includes(left));
      if (!match) return;
      conflicts.push({
        key: `${left}_${right}_${idx}_${existingKey}_${targetKey}`,
        left: rule.left,
        right: rule.right,
        severity: rule.severity || 'medium',
        message: rule.message || 'Potential interaction.'
      });
    });
  });
  return conflicts;
};

const Billing = () => {
  const { Title, Text } = Typography;
  const {
    user,
    loading,
    error,
    categories,
    getData,
    getCategories,
    showToast,
    pushNotification
  } = useGlobalContext();

  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(formatDateForInput(new Date()));
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPan, setCustomerPan] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [configuredVatRate, setConfiguredVatRate] = useState(13);
  const [paymentReference, setPaymentReference] = useState('');
  const [prescriptionMode, setPrescriptionMode] = useState('none');
  const [prescriptionImageDataUrl, setPrescriptionImageDataUrl] = useState('');
  const [prescriptionDigitalText, setPrescriptionDigitalText] = useState('');
  const [prescriptionDoctorName, setPrescriptionDoctorName] = useState('');
  const [prescriptionDoctorLicense, setPrescriptionDoctorLicense] = useState('');
  const [vatApplicable, setVatApplicable] = useState(true);
  const [discountPercent, setDiscountPercent] = useState('0');
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [addressBookEntries, setAddressBookEntries] = useState([]);
  const [patientHistoryDrawerOpen, setPatientHistoryDrawerOpen] = useState(false);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);
  const [activeLineId, setActiveLineId] = useState('');
  const [searchFocusLineId, setSearchFocusLineId] = useState('');
  const [highlightedSuggestionByLine, setHighlightedSuggestionByLine] = useState({});
  const [prescriptionActionLoading, setPrescriptionActionLoading] = useState(false);
  const [eodLoading, setEodLoading] = useState(false);
  const [eodReport, setEodReport] = useState(null);
  const [activeSearchSuggestions, setActiveSearchSuggestions] = useState([]);
  const [activeSearchLoading, setActiveSearchLoading] = useState(false);
  const [showExpiredOverrideModal, setShowExpiredOverrideModal] = useState(false);
  const [expiredLineWarnings, setExpiredLineWarnings] = useState([]);
  const [overrideToken, setOverrideToken] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [doseFrequency, setDoseFrequency] = useState('bid');
  const [doseDays, setDoseDays] = useState(5);
  const [drugInteractionModalOpen, setDrugInteractionModalOpen] = useState(false);
  const [pendingInteractionPayload, setPendingInteractionPayload] = useState(null);
  const [interactionConflicts, setInteractionConflicts] = useState([]);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState('');
  const [printPreviewInvoice, setPrintPreviewInvoice] = useState(null);
  const [batchOverlay, setBatchOverlay] = useState({
    open: false,
    lineId: '',
    lineIndex: -1,
    medicine: null,
    batches: [],
    selectedIndex: 0,
    qty: '1'
  });
  const searchInputRefs = useRef({});
  const hasInitialAutoFocus = useRef(false);
  const qtyOverlayInputRef = useRef(null);
  const pendingRequestIdRef = useRef('');
  const saveBillRef = useRef(() => {});
  const invoicePreviewRef = useRef(null);

  useEffect(() => {
    if (!user?._id) return;
    getData({ force: true });
    getCategories();
    if (hasPermission(user?.role, ACTIONS.SETTINGS_MANAGE)) {
      api.get('/v1/settings')
        .then((res) => {
          const vat = Math.max(Number(res?.data?.defaultVatRate ?? 13) || 13, 0);
          setConfiguredVatRate(vat);
        })
        .catch(() => {
          setConfiguredVatRate(13);
        });
    } else {
      setConfiguredVatRate(13);
    }
    // Intentionally keyed by authenticated user to avoid refresh loops while
    // ensuring cashier medicine list is hydrated after login/session switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const loadInvoices = async () => {
    try {
      setInvoiceLoading(true);
      const res = await api.get('/v1/bills', { params: { limit: 200 } });
      const rows = Array.isArray(res?.data) ? res.data : [];
      setInvoices(rows);
      if (rows.length && !selectedInvoiceId) {
        setSelectedInvoiceId(rows[0]._id);
      }
    } catch {
      setInvoices([]);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const loadEndOfDayReport = async (dateValue = billDate) => {
    try {
      setEodLoading(true);
      const res = await api.get('/v1/bills/end-of-day', { params: { date: dateValue } });
      setEodReport(res?.data || null);
    } catch {
      setEodReport(null);
    } finally {
      setEodLoading(false);
    }
  };

  useEffect(() => {
    if (!user?._id) {
      setInvoices([]);
      setSelectedInvoiceId('');
      setEodReport(null);
      return;
    }
    loadInvoices();
    loadEndOfDayReport(formatDateForInput(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const loadAddressBookEntries = useCallback(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(ADDRESS_BOOK_KEY) || '[]');
      setAddressBookEntries(Array.isArray(parsed) ? parsed : []);
    } catch {
      setAddressBookEntries([]);
    }
  }, []);

  useEffect(() => {
    loadAddressBookEntries();
  }, [loadAddressBookEntries]);

  const medicines = useMemo(
    () => (Array.isArray(categories) ? categories : []).filter((item) => item.active !== false),
    [categories]
  );

  const medicineMap = useMemo(() => {
    const map = new Map();
    medicines.forEach((m) => map.set(String(m._id), m));
    return map;
  }, [medicines]);

  const createEmptyLine = (seed = 0) => ({
    id: createLineId(seed),
    medicineId: '',
    searchTerm: '',
    qty: 1,
    rate: '',
    batchNumber: ''
  });

  const focusSearchInput = useCallback((lineId) => {
    if (!lineId) return;
    setActiveLineId(lineId);
    setSearchFocusLineId(lineId);
    const input = searchInputRefs.current[lineId];
    if (input) {
      input.focus();
      input.select();
      return;
    }
    // Ref can be unavailable immediately after adding a line; retry once on next frame.
    setTimeout(() => {
      const retryInput = searchInputRefs.current[lineId];
      if (retryInput) {
        retryInput.focus();
        retryInput.select();
      }
    }, 40);
  }, []);

  const resetBillForm = useCallback(() => {
    const firstLine = createEmptyLine(0);
    setBillNumber('');
    setBillDate(formatDateForInput(new Date()));
    setCustomerName('');
    setCustomerPhone('');
    setCustomerPan('');
    setPaymentMethod('cash');
    setPaymentReference('');
    setPrescriptionMode('none');
    setPrescriptionImageDataUrl('');
    setPrescriptionDigitalText('');
    setPrescriptionDoctorName('');
    setPrescriptionDoctorLicense('');
    setVatApplicable(true);
    setDiscountPercent('0');
    setShowExpiredOverrideModal(false);
    setExpiredLineWarnings([]);
    setOverrideToken('');
    setOverrideReason('');
    setDoseFrequency('bid');
    setDoseDays(5);
    setDrugInteractionModalOpen(false);
    setPendingInteractionPayload(null);
    setInteractionConflicts([]);
    pendingRequestIdRef.current = '';
    setLines([firstLine]);
    setHighlightedSuggestionByLine({});
    setTimeout(() => focusSearchInput(firstLine.id), 0);
  }, [focusSearchInput]);

  useEffect(() => {
    if (!lines.length) {
      setLines([createEmptyLine(0)]);
    }
  }, [lines.length]);

  useEffect(() => {
    if (!hasInitialAutoFocus.current && lines.length) {
      hasInitialAutoFocus.current = true;
      setTimeout(() => focusSearchInput(lines[0]?.id), 0);
    }
  }, [lines, focusSearchInput]);

  const computedLines = useMemo(() => {
    return lines.map((line) => {
      const medicine = medicineMap.get(String(line.medicineId));
      const qtyInput = line.qty;
      const rateInput = line.rate;
      const searchTerm = typeof line.searchTerm === 'string' ? line.searchTerm : (medicine?.name || '');
      const qty = Math.max(Number(qtyInput) || 0, 0);
      const rate = Math.max(Number(rateInput) || 0, 0);
      const amount = qty * rate;
      return { ...line, medicine, searchTerm, qtyInput, rateInput, qty, rate, amount };
    });
  }, [lines, medicineMap]);

  const subtotal = useMemo(
    () => computedLines.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [computedLines]
  );
  const discountAmount = useMemo(
    () => subtotal * (Math.max(Number(discountPercent) || 0, 0) / 100),
    [discountPercent, subtotal]
  );
  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const vatPercent = vatApplicable ? configuredVatRate : 0;
  const taxAmount = useMemo(
    () => taxableAmount * (vatPercent / 100),
    [taxableAmount, vatPercent]
  );
  const grandTotal = Math.max(taxableAmount + taxAmount, 0);
  const rxRequiredLineItems = useMemo(
    () => computedLines.filter((line) => line.medicine && line.qty > 0 && Boolean(line.medicine?.prescriptionRequired)),
    [computedLines]
  );

  const addLine = () => {
    setLines((prev) => [...prev, createEmptyLine(prev.length)]);
  };

  const focusNextLineFromIndex = (lineIndex) => {
    const nextLine = lines[lineIndex + 1];
    if (nextLine) {
      setTimeout(() => focusSearchInput(nextLine.id), 0);
    } else {
      addLineAndFocus();
    }
  };

  const addLineAndFocus = () => {
    let nextId = '';
    setLines((prev) => {
      const nextLine = createEmptyLine(prev.length);
      nextId = nextLine.id;
      return [...prev, nextLine];
    });
    setActiveLineId(nextId);
    setSearchFocusLineId(nextId);
    setTimeout(() => focusSearchInput(nextId), 0);
  };

  const closeBatchOverlay = () => {
    setBatchOverlay({
      open: false,
      lineId: '',
      lineIndex: -1,
      medicine: null,
      batches: [],
      selectedIndex: 0,
      qty: '1'
    });
  };

  const openBatchOverlay = (lineId, lineIndex, medicine, qty = '1') => {
    const batches = toBatchChoices(medicine);
    if (!batches.length) {
      focusNextLineFromIndex(lineIndex);
      return;
    }
    setBatchOverlay({
      open: true,
      lineId,
      lineIndex,
      medicine,
      batches,
      selectedIndex: 0,
      qty: String(Math.max(Number(qty) || 1, 1))
    });
  };

  const updateLine = (id, updates) => {
    setLines((prev) => prev.map((line) => {
      if (line.id !== id) return line;
      const next = { ...line, ...updates };
      if (typeof updates.medicineId !== 'undefined' && updates.medicineId) {
        const med = medicineMap.get(String(updates.medicineId));
        next.rate = Number(med?.unitPrice || 0);
        next.searchTerm = med?.name || '';
        next.batchNumber = med?.batchNumber || '';
      }
      return next;
    }));
  };

  const commitOverlaySelection = () => {
    if (!batchOverlay.open) return;
    const selectedBatch = batchOverlay.batches[batchOverlay.selectedIndex] || batchOverlay.batches[0];
    if (!selectedBatch) return;
    updateLine(batchOverlay.lineId, {
      batchNumber: selectedBatch.batchNumber,
      qty: Math.max(Number(batchOverlay.qty) || 1, 1),
      rate: Number(batchOverlay.medicine?.unitPrice || 0)
    });
    closeBatchOverlay();
    focusNextLineFromIndex(batchOverlay.lineIndex);
  };

  const getLineSuggestionsLocal = useCallback((line) => {
    const query = String(line.searchTerm || '').trim().toLowerCase();
    if (query.length < 3) return [];
    const starts = [];
    const exactBarcode = [];
    const contains = [];
    medicines.forEach((medicine) => {
      const name = String(medicine?.name || '').toLowerCase();
      const generic = String(medicine?.genericName || '').toLowerCase();
      const barcode = String(medicine?.barcode || '').toLowerCase();
      const sku = String(medicine?.sku || '').toLowerCase();
      const rack = String(medicine?.rackLocation || '').toLowerCase();
      const exactBarcodeHit = (barcode && barcode === query) || (sku && sku === query);
      if (exactBarcodeHit) {
        exactBarcode.push(medicine);
        return;
      }
      const startsWith = name.startsWith(query) || generic.startsWith(query);
      if (startsWith) {
        starts.push(medicine);
        return;
      }
      const matchesContains = name.includes(query) || generic.includes(query) || barcode.includes(query) || sku.includes(query) || rack.includes(query);
      if (matchesContains) {
        contains.push(medicine);
      }
    });
    return [...exactBarcode, ...starts, ...contains].slice(0, 8);
  }, [medicines]);

  const selectSuggestion = (lineId, medicine, options = {}) => {
    updateLine(lineId, {
      medicineId: medicine?._id || '',
      searchTerm: medicine?.name || '',
      rate: Number(medicine?.unitPrice || 0)
    });
    setHighlightedSuggestionByLine((prev) => ({ ...prev, [lineId]: 0 }));
    if (options.addToCart) {
      const lineIndex = Number(options.lineIndex || 0);
      openBatchOverlay(lineId, lineIndex, medicine, String(lines[lineIndex]?.qty || 1));
      return;
    }
    setActiveLineId(lineId);
  };

  const removeLine = (id) => {
    setLines((prev) => prev.filter((line) => line.id !== id));
  };

  const handleSearchKeyDown = (event, line, suggestions, lineIndex) => {
    const key = String(event.key || '');
    const currentIndex = Number(highlightedSuggestionByLine[line.id] || 0);
    if (key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min(currentIndex + 1, Math.max(suggestions.length - 1, 0));
      setHighlightedSuggestionByLine((prev) => ({ ...prev, [line.id]: nextIndex }));
      return;
    }
    if (key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = Math.max(currentIndex - 1, 0);
      setHighlightedSuggestionByLine((prev) => ({ ...prev, [line.id]: nextIndex }));
      return;
    }
    if (key === 'Enter') {
      if (!suggestions.length) return;
      event.preventDefault();
      const picked = suggestions[Math.min(currentIndex, suggestions.length - 1)] || suggestions[0];
      if (picked) {
        selectSuggestion(line.id, picked, { addToCart: true, lineIndex });
      }
    }
  };

  useEffect(() => {
    const onHotKey = (event) => {
      const key = String(event.key || '');
      if (key === 'F1') {
        event.preventDefault();
        resetBillForm();
        return;
      }
      if (key === 'F2') {
        event.preventDefault();
        const targetId = activeLineId || lines[0]?.id;
        focusSearchInput(targetId);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === 'Enter') {
        event.preventDefault();
        saveBillRef.current();
        return;
      }
      if (key === 'Escape') {
        if (batchOverlay.open) {
          event.preventDefault();
          closeBatchOverlay();
        } else if (showExpiredOverrideModal) {
          event.preventDefault();
          setShowExpiredOverrideModal(false);
        } else if (drugInteractionModalOpen) {
          event.preventDefault();
          setDrugInteractionModalOpen(false);
          setPendingInteractionPayload(null);
        }
      }
    };
    window.addEventListener('keydown', onHotKey);
    return () => window.removeEventListener('keydown', onHotKey);
  }, [
    activeLineId,
    lines,
    resetBillForm,
    focusSearchInput,
    batchOverlay.open,
    showExpiredOverrideModal,
    drugInteractionModalOpen
  ]);

  const activeEditableLine = useMemo(
    () => computedLines.find((line) => line.id === activeLineId) || computedLines[0] || null,
    [computedLines, activeLineId]
  );
  const activeLineIndex = computedLines.findIndex((line) => line.id === (activeEditableLine?.id || ''));
  const activeLineSuggestions = activeSearchSuggestions;
  const activeHighlightedIndex = Number(
    highlightedSuggestionByLine[activeEditableLine?.id || ''] || 0
  );
  const cartLines = useMemo(
    () => computedLines.filter((line) => line.medicine && line.qty > 0),
    [computedLines]
  );
  const cartInteractionConflicts = useMemo(() => {
    const medicinesInCart = cartLines.map((line) => line.medicine).filter(Boolean);
    const conflicts = [];
    medicinesInCart.forEach((medicine, idx) => {
      const others = medicinesInCart.filter((_, i) => i !== idx);
      conflicts.push(...findDrugInteractionConflicts(medicine, others));
    });
    const seen = new Set();
    return conflicts.filter((item) => {
      if (seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    });
  }, [cartLines]);
  const resolveLineExpiry = useCallback((line) => {
    const medicine = line?.medicine;
    if (!medicine) return null;
    const selectedBatch = String(line?.batchNumber || '').trim().toLowerCase();
    const matchedBatch = Array.isArray(medicine.batches)
      ? medicine.batches.find((batch) => String(batch?.batchNumber || '').trim().toLowerCase() === selectedBatch)
      : null;
    return matchedBatch?.expiryDate || medicine.expiryDate || null;
  }, []);
  const addActiveLineToCart = () => {
    if (!activeEditableLine?.medicine) {
      showToast('Select a medicine first', { type: 'warning' });
      return;
    }
    const existingMedicines = cartLines
      .filter((line) => line.id !== activeEditableLine.id)
      .map((line) => line.medicine)
      .filter(Boolean);
    const conflicts = findDrugInteractionConflicts(activeEditableLine.medicine, existingMedicines);
    if (conflicts.length) {
      setInteractionConflicts(conflicts);
      setPendingInteractionPayload({
        lineId: activeEditableLine.id,
        lineIndex: Math.max(activeLineIndex, 0),
        medicine: activeEditableLine.medicine,
        qty: String(activeEditableLine.qty || 1)
      });
      setDrugInteractionModalOpen(true);
      return;
    }
    openBatchOverlay(
      activeEditableLine.id,
      Math.max(activeLineIndex, 0),
      activeEditableLine.medicine,
      String(activeEditableLine.qty || 1)
    );
  };

  useEffect(() => {
    if (!batchOverlay.open) return;
    const id = setTimeout(() => {
      qtyOverlayInputRef.current?.focus();
      qtyOverlayInputRef.current?.select();
    }, 0);
    return () => clearTimeout(id);
  }, [batchOverlay.open]);

  useEffect(() => {
    const query = String(activeEditableLine?.searchTerm || '').trim();
    const lineId = String(activeEditableLine?.id || '');
    if (!lineId || query.length < 3 || searchFocusLineId !== lineId) {
      setActiveSearchLoading(false);
      setActiveSearchSuggestions([]);
      return undefined;
    }

    let cancelled = false;
    setActiveSearchLoading(true);
    const timerId = setTimeout(async () => {
      try {
        const res = await api.get('/v1/categories/quick-search', {
          params: { q: query, limit: 8 }
        });
        const rows = Array.isArray(res?.data) ? res.data : [];
        if (!cancelled) {
          setActiveSearchSuggestions(rows);
          setActiveSearchLoading(false);
        }
      } catch {
        if (!cancelled) {
          setActiveSearchSuggestions(getLineSuggestionsLocal(activeEditableLine).slice(0, 8));
          setActiveSearchLoading(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [activeEditableLine, searchFocusLineId, getLineSuggestionsLocal]);

  const onPrescriptionFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      showToast('Only PNG/JPG/WEBP images are supported for prescriptions', { type: 'warning' });
      return;
    }
    if (file.size > 900 * 1024) {
      showToast('Prescription image must be under 900KB', { type: 'warning' });
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPrescriptionImageDataUrl(dataUrl);
    } catch {
      showToast('Failed to read prescription image', { type: 'warning' });
    }
  };

  const openPrintWindow = (html, autoPrint = true) => {
    if (!html) return;
    const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!win) {
      showToast('Popup blocked. Please allow popups for this site.', { type: 'warning' });
      return;
    }
    win.opener = null;
    win.document.write(html);
    win.document.close();
    if (autoPrint) {
      setTimeout(() => {
        win.focus();
        win.print();
      }, 250);
    }
  };

  const printInvoice = (invoice, autoPrint = false) => {
    if (!invoice) return;
    const html = buildThermalInvoiceHtml(invoice);
    if (autoPrint) {
      openPrintWindow(html, true);
      return;
    }
    setPrintPreviewInvoice(invoice);
    setPrintPreviewHtml(buildThermalInvoiceHtml(invoice, { preview: true }));
    setPrintPreviewOpen(true);
  };

  const exportInvoiceXlsx = (invoice) => {
    if (!invoice) return;
    const header = ['Invoice', 'FiscalYear', 'Date', 'Customer', 'Phone', 'CustomerPAN', 'PaymentMethod', 'PaymentRef', 'VATPercent', 'Medicine', 'Batch', 'Qty', 'Rate', 'Amount'];
    const rows = (invoice.items || []).map((item) => [
      invoice.billNumber,
      invoice.fiscalYear || '',
      formatDateForInput(invoice.billDate),
      invoice.customerName || '',
      invoice.customerPhone || '',
      invoice.customerPan || '',
      invoice.paymentMethod || 'cash',
      invoice.paymentReference || '',
      Number(invoice.taxPercent || 0),
      item.medicineName || '',
      item.batchNumber || '',
      Number(item.qty || 0),
      Number(item.rate || 0),
      Number(item.amount || 0)
    ]);
    exportTableToXlsx({
      headers: header,
      rows,
      filename: `${invoice.billNumber}.xlsx`,
      sheetName: 'Invoice'
    });
  };

  const exportInvoicePdf = (invoice) => {
    if (!invoice) return;
    const headers = ['Medicine', 'Batch', 'Qty', 'Rate', 'Amount'];
    const rows = (invoice.items || []).map((item) => [
      String(item.medicineName || ''),
      String(item.batchNumber || ''),
      Number(item.qty || 0),
      Number(item.rate || 0),
      Number(item.amount || 0)
    ]);
    exportRowsToPDF({
      title: `Invoice ${invoice.billNumber || ''}`,
      headers,
      rows,
      filename: `${invoice.billNumber || 'invoice'}.pdf`
    });
  };

  const saveBill = async () => {
    const saleLines = computedLines.filter((line) => line.medicine && line.qty > 0);
    if (!saleLines.length) {
      showToast('Add at least one medicine line item', { type: 'warning' });
      return;
    }

    const insufficient = saleLines.find((line) => Number(line.qty) > Number(line.medicine?.stockQty || 0));
    if (insufficient) {
      showToast(`Insufficient stock for ${insufficient.medicine?.name || 'medicine'}`, { type: 'warning' });
      return;
    }
    if (rxRequiredLineItems.length && prescriptionMode === 'none') {
      showToast('Prescription attachment is required for selected Schedule/Narcotic medicines', { type: 'warning' });
      return;
    }
    if (prescriptionMode === 'image' && !prescriptionImageDataUrl) {
      showToast('Attach prescription image before finalizing', { type: 'warning' });
      return;
    }
    if (prescriptionMode === 'digital' && !prescriptionDigitalText.trim()) {
      showToast('Enter digital prescription text before finalizing', { type: 'warning' });
      return;
    }
    const expiredWarnings = saleLines
      .map((line) => {
        const expiryDate = resolveLineExpiry(line);
        if (!isExpired(expiryDate)) return null;
        return {
          lineId: line.id,
          medicineName: line.medicine?.name || 'Medicine',
          batchNumber: line.batchNumber || line.medicine?.batchNumber || '-',
          expiryDate
        };
      })
      .filter(Boolean);
    const overridePayload = {
      token: overrideToken.trim(),
      reason: overrideReason.trim()
    };
    const hasOverrideCredentials = Boolean(overridePayload.token);
    if (expiredWarnings.length && !hasOverrideCredentials) {
      setExpiredLineWarnings(expiredWarnings);
      setShowExpiredOverrideModal(true);
      return;
    }

    const invoicePayload = {
      clientRequestId: pendingRequestIdRef.current || createClientRequestId(),
      billNumber,
      billDate,
      customerName: customerName.trim(),
      customerKey: (() => {
        const cleanedName = String(customerName || '').trim().toLowerCase();
        const cleanedPhone = String(customerPhone || '').replace(/\s+/g, '');
        if (cleanedName && cleanedPhone) return `${cleanedName}::${cleanedPhone}`;
        if (cleanedName) return cleanedName;
        if (cleanedPhone) return cleanedPhone;
        return 'walk-in-customer';
      })(),
      customerPhone: customerPhone.trim(),
      customerPan: customerPan.trim(),
      paymentMethod,
      paymentReference: paymentReference.trim(),
      prescriptionRecord: {
        mode: prescriptionMode,
        imageDataUrl: prescriptionImageDataUrl,
        digitalText: prescriptionDigitalText.trim(),
        doctorName: prescriptionDoctorName.trim(),
        doctorLicense: prescriptionDoctorLicense.trim(),
        doseSchedule: {
          frequency: doseFrequency,
          days: Math.max(Number(doseDays) || 1, 1)
        }
      },
      items: saleLines.map((line) => ({
        medicineId: line.medicine._id,
        medicineName: line.medicine.name,
        batchNumber: String(line.batchNumber || line.medicine.batchNumber || '').trim(),
        qty: line.qty,
        rate: line.rate,
        amount: line.amount
      })),
      subtotal,
      discountPercent: Number(discountPercent) || 0,
      discountAmount,
      vatApplicable,
      taxPercent: vatPercent,
      taxAmount,
      grandTotal,
      expiredOverride: hasOverrideCredentials ? overridePayload : undefined
    };

    const proceed = await new Promise((resolve) => {
      Modal.confirm({
        title: 'Finalize Invoice?',
        okText: 'Finalize Invoice',
        cancelText: 'Review',
        content: (
          <Space direction="vertical" size={6}>
            <Text>
              This action will create an IRD invoice and update stock ledger totals.
            </Text>
            <Text strong type="danger">
              This action is audited and cannot be silently modified later.
            </Text>
            <Text>
              Grand Total: <strong>Rs.{Math.round(grandTotal).toLocaleString()}</strong>
            </Text>
          </Space>
        ),
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
    if (!proceed) return;

    try {
      setSaving(true);
      if (!pendingRequestIdRef.current) {
        pendingRequestIdRef.current = invoicePayload.clientRequestId;
      }
      const billRes = await api.post('/v1/bills/finalize', invoicePayload);
      const createdBill = billRes?.data?.bill;
      if (createdBill?._id) {
        setInvoices((prev) => [createdBill, ...prev.filter((item) => item._id !== createdBill._id)].slice(0, 200));
        setSelectedInvoiceId(createdBill._id);
      }

      pushNotification(`Invoice ${createdBill?.billNumber || billNumber || 'IRD'} created`, { type: 'success' });
      showToast('Invoice created successfully', { type: 'success' });
      resetBillForm();
      await Promise.all([getData({ force: true }), loadInvoices(), loadEndOfDayReport(billDate)]);
    } catch (requestError) {
      const apiError = getApiError(requestError, 'Failed to create invoice');
      if (apiError.code === 'EXPIRED_OVERRIDE_REQUIRED') {
        setExpiredLineWarnings(expiredWarnings);
        setShowExpiredOverrideModal(true);
      }
      showToast(apiError.message, { type: 'warning' });
    } finally {
      setSaving(false);
    }
  };
  saveBillRef.current = saveBill;

  const selectedInvoice = useMemo(
    () => invoices.find((item) => item._id === selectedInvoiceId) || invoices[0] || null,
    [invoices, selectedInvoiceId]
  );
  const handleSelectInvoice = useCallback((invoiceId) => {
    if (!invoiceId) return;
    setSelectedInvoiceId(invoiceId);
    setTimeout(() => {
      const target = invoicePreviewRef.current;
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  }, []);
  const canVerifyPrescription = useMemo(() => {
    const role = normalizeRole(user?.role);
    return hasPermission(role, ACTIONS.PRESCRIPTION_VERIFY);
  }, [user?.role]);

  const updatePrescriptionStatus = async (status) => {
    if (!selectedInvoice?._id || !canVerifyPrescription) return;
    let noteValue = '';
    const confirmed = await new Promise((resolve) => {
      Modal.confirm({
        title: status === 'verified' ? 'Verify Prescription' : 'Reject Prescription',
        content: (
          <Input.TextArea
            rows={3}
            placeholder={status === 'verified' ? 'Verification note (optional)' : 'Reason for rejection (optional)'}
            onChange={(e) => {
              noteValue = String(e?.target?.value || '');
            }}
          />
        ),
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
    if (!confirmed) return;
    try {
      setPrescriptionActionLoading(true);
      const res = await api.put(`/v1/bills/${selectedInvoice._id}/verify-prescription`, {
        status,
        note: String(noteValue || '').trim()
      });
      const updated = res?.data;
      if (updated?._id) {
        setInvoices((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      }
      showToast(`Prescription ${status}`, { type: 'success' });
    } catch (requestError) {
      showToast(getApiErrorMessage(requestError, 'Failed to update prescription status'), { type: 'warning' });
    } finally {
      setPrescriptionActionLoading(false);
    }
  };

  const openPrescriptionImage = (dataUrl) => {
    if (!dataUrl) return;
    const win = window.open('', '_blank', 'noopener,noreferrer,width=800,height=700');
    if (!win) return;
    win.opener = null;
    const doc = win.document;
    doc.open();
    doc.write('<!doctype html><html><head><title>Prescription</title></head><body style="margin:0;background:#111;display:flex;justify-content:center;align-items:center;"></body></html>');
    doc.close();
    const img = doc.createElement('img');
    img.alt = 'Prescription';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    img.src = dataUrl;
    doc.body.appendChild(img);
  };

  const customerPurchaseGroups = useMemo(() => {
    const grouped = new Map();
    invoices.forEach((invoice) => {
      const cleanedName = normalizeCustomerName(invoice.customerName);
      const cleanedPhone = String(invoice.customerPhone || '').trim();
      const customerNameLabel = cleanedName || 'Walk-in Customer';
      const customerKey = cleanedName
        ? `${cleanedName.toLowerCase()}::${cleanedPhone || '-'}`
        : (cleanedPhone || 'walk-in-customer');
      const billDateValue = new Date(invoice.billDate).getTime();
      if (!grouped.has(customerKey)) {
        grouped.set(customerKey, {
          customerKey,
          customerName: customerNameLabel,
          latestBillDate: Number.isNaN(billDateValue) ? 0 : billDateValue,
          totalSpent: 0,
          purchaseLines: []
        });
      }

      const bucket = grouped.get(customerKey);
      bucket.totalSpent += Number(invoice.grandTotal || 0);
      if (!Number.isNaN(billDateValue) && billDateValue > bucket.latestBillDate) {
        bucket.latestBillDate = billDateValue;
      }

      (invoice.items || []).forEach((item, index) => {
        bucket.purchaseLines.push({
          rowKey: `${invoice._id || invoice.billNumber || 'bill'}_${index}`,
          billNumber: invoice.billNumber,
          billDate: invoice.billDate,
          medicineName: item?.medicineName || '-',
          qty: Number(item?.qty || 0),
          rate: Number(item?.rate || 0),
          amount: Number(item?.amount || 0)
        });
      });
    });

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        purchaseLines: group.purchaseLines.sort(
          (a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime()
        )
      }))
      .sort((a, b) => b.latestBillDate - a.latestBillDate);
  }, [invoices]);
  const patientProfilesByName = useMemo(() => {
    const map = new Map();
    addressBookEntries
      .filter((entry) => String(entry?.type || '').toLowerCase() === 'patient')
      .forEach((entry) => {
        const key = normalizeCustomerName(entry?.name).toLowerCase();
        if (key) map.set(key, entry);
      });
    return map;
  }, [addressBookEntries]);
  const activePatientProfile = useMemo(
    () => patientProfilesByName.get(String(customerName || '').trim().toLowerCase()) || null,
    [customerName, patientProfilesByName]
  );

  useEffect(() => {
    if (!activePatientProfile) return;
    if (!String(customerPhone || '').trim() && String(activePatientProfile?.phone || '').trim()) {
      setCustomerPhone(String(activePatientProfile.phone).trim());
    }
  }, [activePatientProfile, customerPhone]);

  const openPatientHistory = useCallback((group) => {
    if (!group) return;
    const profile = patientProfilesByName.get(String(group.customerName || '').toLowerCase());
    setSelectedPatientHistory({
      patientName: group.customerName,
      purchases: group.purchaseLines || [],
      knownAllergies: Array.isArray(profile?.allergies) ? profile.allergies : []
    });
    setPatientHistoryDrawerOpen(true);
  }, [patientProfilesByName]);
  const invoicePreviewColumns = useMemo(
    () => ([
      { title: 'Invoice', dataIndex: 'billNumber', key: 'billNumber' },
      { title: 'Date', key: 'billDate', render: (_, item) => formatDisplayDate(item.billDate) },
      { title: 'Customer', key: 'customerName', render: (_, item) => item.customerName || 'Walk-in Customer' },
      {
        title: 'Prescription',
        key: 'prescriptionStatus',
        render: (_, item) => (
          <Tag color={item.prescriptionStatus === 'verified' ? 'green' : 'orange'}>
            {String(item.prescriptionStatus || 'pending').toUpperCase()}
          </Tag>
        )
      },
      { title: 'Payment', key: 'paymentMethod', render: (_, item) => String(item.paymentMethod || 'cash').toUpperCase() },
      { title: 'Total', key: 'grandTotal', render: (_, item) => `Rs.${Math.round(item.grandTotal || 0).toLocaleString()}` },
      { title: 'Items', key: 'items', render: (_, item) => item.items?.length || 0 }
    ]),
    []
  );

  const rightPanel = (
      <POSSidebarCart
      subtotal={subtotal}
      discountAmount={discountAmount}
      vatPercent={vatPercent}
      taxAmount={taxAmount}
      grandTotal={grandTotal}
      eodLoading={eodLoading}
      billDate={billDate}
        eodReport={eodReport}
        loadEndOfDayReport={loadEndOfDayReport}
        invoices={invoices}
        invoiceLoading={invoiceLoading}
        selectedInvoiceId={selectedInvoiceId}
        onSelectInvoice={handleSelectInvoice}
        onPrintInvoice={printInvoice}
      />
  );

  return (
    <AppShell
      title="Billing"
      subtitle="Create IRD-ready invoices with automatic VAT and unique invoice numbers"
      rightPanel={rightPanel}
    >
      {loading ? <Alert style={{ marginBottom: 16 }} type="info" showIcon message="Refreshing billing data..." /> : null}
      {error ? <Alert style={{ marginBottom: 16 }} type="error" showIcon message={error} /> : null}

      <Card style={{ marginBottom: 16 }} ref={invoicePreviewRef}>
        <Title level={4}>Create Bill</Title>
        <Text type="secondary">Shortcuts: F1 New Bill, F2 Focus Search, Enter Add to Cart</Text>
        <Space style={{ marginTop: 8, marginBottom: 8 }}>
          <Button onClick={() => setAddressBookOpen(true)}>Address Book</Button>
        </Space>
        <DrugInteractionAlert
          bannerConflicts={cartInteractionConflicts}
          modalConflicts={interactionConflicts}
          open={drugInteractionModalOpen}
          onCancel={() => {
            setDrugInteractionModalOpen(false);
            setPendingInteractionPayload(null);
          }}
          onProceed={() => {
            if (pendingInteractionPayload) {
              openBatchOverlay(
                pendingInteractionPayload.lineId,
                pendingInteractionPayload.lineIndex,
                pendingInteractionPayload.medicine,
                pendingInteractionPayload.qty
              );
            }
            setDrugInteractionModalOpen(false);
            setPendingInteractionPayload(null);
          }}
        />
        <div className="form-grid cols-4 gap-bottom">
          <div className="form-field">
            <label>Invoice No. (Auto)</label>
            <Input value={billNumber} placeholder="Will be generated on finalize" readOnly />
          </div>
          <div className="form-field">
            <label>Date</label>
            <DatePicker
              style={{ width: '100%' }}
              value={billDate ? dayjs(billDate) : null}
              onChange={(value) => setBillDate(value ? value.format('YYYY-MM-DD') : '')}
            />
          </div>
          <div className="form-field">
            <label>Customer Name</label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in Customer" />
          </div>
          <div className="form-field">
            <label>Phone</label>
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Customer PAN (Optional)</label>
            <Input value={customerPan} onChange={(e) => setCustomerPan(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Payment Method</label>
            <PaymentToggle value={paymentMethod} onChange={setPaymentMethod} />
          </div>
          <div className="form-field">
            <label>Payment Ref (Optional)</label>
            <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Txn ID / UTR / note" />
          </div>
        </div>
        {activePatientProfile ? (
          <Space wrap style={{ marginBottom: 10 }}>
            <Tag color="volcano">Patient Profile Matched</Tag>
            {Array.isArray(activePatientProfile?.allergies) && activePatientProfile.allergies.length
              ? activePatientProfile.allergies.map((item) => (
                <Tag key={item} color="red">{item}</Tag>
              ))
              : <Tag color="green">No recorded allergies</Tag>}
          </Space>
        ) : null}

        <div className="form-grid cols-4 gap-bottom">
          <div className="form-field">
            <label>Prescription Mode</label>
            <Select
              value={prescriptionMode}
              onChange={setPrescriptionMode}
              options={[
                { value: 'none', label: 'No Prescription' },
                { value: 'image', label: 'Photo Upload' },
                { value: 'digital', label: 'Digital Text' }
              ]}
            />
          </div>
          <div className="form-field">
            <label>Doctor Name</label>
            <Input value={prescriptionDoctorName} onChange={(e) => setPrescriptionDoctorName(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Doctor License/NMC</label>
            <Input value={prescriptionDoctorLicense} onChange={(e) => setPrescriptionDoctorLicense(e.target.value)} />
          </div>
          <div className="form-field">
            {prescriptionMode === 'image' ? (
              <>
                <label>Prescription Photo</label>
                <Input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={onPrescriptionFileChange} />
              </>
            ) : (
              <>
                <label>Prescription Note</label>
                <Input
                  placeholder={prescriptionMode === 'digital' ? 'See text box below' : 'Not required'}
                  value={prescriptionMode === 'image' ? 'Image attached' : ''}
                  readOnly
                />
              </>
            )}
          </div>
        </div>
        {prescriptionMode === 'digital' ? (
          <div className="form-field gap-bottom">
            <label>Digital Prescription</label>
            <Input.TextArea
              value={prescriptionDigitalText}
              onChange={(e) => setPrescriptionDigitalText(e.target.value)}
              placeholder="Doctor's digital prescription text"
              rows={4}
            />
          </div>
        ) : null}
        {rxRequiredLineItems.length ? (
          <p className="empty-hint">
            Prescription required for: {rxRequiredLineItems.map((line) => line.medicine?.name).filter(Boolean).join(', ')}
          </p>
        ) : null}
        <div className="form-grid cols-4 gap-bottom">
          <div className="form-field">
            <label>Dose Frequency</label>
            <Select
              value={doseFrequency}
              onChange={setDoseFrequency}
              options={[
                { value: 'once', label: 'Once Daily' },
                { value: 'bid', label: 'Twice Daily (BID)' },
                { value: 'tid', label: 'Three Times Daily (TID)' },
                { value: 'qid', label: 'Four Times Daily (QID)' }
              ]}
            />
          </div>
          <div className="form-field">
            <label>Dose Days</label>
            <InputNumber min={1} max={30} value={doseDays} onChange={(value) => setDoseDays(value || 1)} style={{ width: '100%' }} />
          </div>
        </div>
        <DoseScheduleTimeline frequency={doseFrequency} days={doseDays} />

      </Card>

      <BillingWorkhorse
        activeEditableLine={activeEditableLine}
        searchInputRefs={searchInputRefs}
        setActiveLineId={setActiveLineId}
        setSearchFocusLineId={setSearchFocusLineId}
        setHighlightedSuggestionByLine={setHighlightedSuggestionByLine}
        updateLine={updateLine}
        handleSearchKeyDown={handleSearchKeyDown}
        activeLineSuggestions={activeLineSuggestions}
        activeSearchLoading={activeSearchLoading}
        activeLineIndex={activeLineIndex}
        totalLines={computedLines.length}
        searchFocusLineId={searchFocusLineId}
        activeHighlightedIndex={activeHighlightedIndex}
        selectSuggestion={selectSuggestion}
        getMedicineSafetyTone={getMedicineSafetyTone}
        discountPercent={discountPercent}
        setDiscountPercent={setDiscountPercent}
        vatApplicable={vatApplicable}
        setVatApplicable={setVatApplicable}
        resetBillForm={resetBillForm}
        addActiveLineToCart={addActiveLineToCart}
        addLine={addLine}
        saveBill={saveBill}
        saving={saving}
        grandTotal={grandTotal}
        cartLines={cartLines}
        resolveLineExpiry={resolveLineExpiry}
        isExpired={isExpired}
        isNearExpiry={isNearExpiry}
        formatDisplayDate={formatDisplayDate}
        focusSearchInput={focusSearchInput}
        removeLine={removeLine}
      />

      <Card style={{ marginBottom: 16 }}>
        <div className="section-head-row">
          <Title level={4} style={{ margin: 0 }}>Invoice Preview</Title>
          <Space wrap>
            {canVerifyPrescription && selectedInvoice ? (
              <>
                <Button onClick={() => updatePrescriptionStatus('verified')} loading={prescriptionActionLoading}>Verify Rx</Button>
                <Button danger onClick={() => updatePrescriptionStatus('rejected')} loading={prescriptionActionLoading}>Reject Rx</Button>
              </>
            ) : null}
            <Button onClick={() => exportInvoiceXlsx(selectedInvoice)}>Export Excel</Button>
            <Button onClick={() => exportInvoicePdf(selectedInvoice)}>Export PDF</Button>
            <Button type="primary" onClick={() => printInvoice(selectedInvoice, false)}>Print</Button>
          </Space>
        </div>

        {selectedInvoice ? (
          <div>
            <Table rowKey="_id" columns={invoicePreviewColumns} dataSource={[selectedInvoice]} pagination={false} />
            <div className="mt-8">
              <p className="muted">
                Rx Mode: <strong>{String(selectedInvoice?.prescriptionRecord?.mode || 'none').toUpperCase()}</strong>
                {' | '}Doctor: <strong>{selectedInvoice?.prescriptionRecord?.doctorName || '-'}</strong>
                {' | '}License: <strong>{selectedInvoice?.prescriptionRecord?.doctorLicense || '-'}</strong>
              </p>
              <DoseScheduleTimeline
                frequency={selectedInvoice?.prescriptionRecord?.doseSchedule?.frequency || 'bid'}
                days={selectedInvoice?.prescriptionRecord?.doseSchedule?.days || 5}
              />
              <div style={{ marginTop: 10 }}>
                <RxVerificationCard
                  prescriptionRecord={selectedInvoice?.prescriptionRecord || {}}
                  medicines={selectedInvoice?.items?.map((item) => ({ name: item.medicineName, genericName: '' })) || []}
                  onMatch={(med) => showToast(`Matched: ${med?.name || 'medicine'}`, { type: 'success' })}
                />
              </div>
              {selectedInvoice?.prescriptionRecord?.mode === 'image' && selectedInvoice?.prescriptionRecord?.imageDataUrl ? (
                <Button onClick={() => openPrescriptionImage(selectedInvoice.prescriptionRecord.imageDataUrl)}>
                  View Prescription Image
                </Button>
              ) : null}
              {selectedInvoice?.prescriptionRecord?.mode === 'digital' ? (
                <p className="empty-hint">{selectedInvoice?.prescriptionRecord?.digitalText || 'No digital prescription text'}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <Empty description="No invoice available yet. Create a bill to preview and export." />
        )}
      </Card>

      <Card>
        <Title level={4}>Customer Purchases By Name</Title>
        {customerPurchaseGroups.length ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {customerPurchaseGroups.map((group) => {
              return (
                <Card key={group.customerKey} size="small">
                  <div className="goal-head">
                    <strong>{group.customerName}</strong>
                    <Text type="secondary">
                      {group.purchaseLines.length} purchases | Rs.
                      {Math.round(group.totalSpent).toLocaleString()}
                    </Text>
                  </div>
                  <div className="goal-actions" style={{ marginTop: 8 }}>
                    <Button onClick={() => openPatientHistory(group)}>Open</Button>
                  </div>
                </Card>
              );
            })}
          </Space>
        ) : (
          <Empty description="No customer purchase history found yet." />
        )}
      </Card>

      <BatchSelectionOverlay
        batchOverlay={batchOverlay}
        closeBatchOverlay={closeBatchOverlay}
        setBatchOverlay={setBatchOverlay}
        commitOverlaySelection={commitOverlaySelection}
        formatDisplayDate={formatDisplayDate}
        qtyOverlayInputRef={qtyOverlayInputRef}
      />

      <ExpiredOverrideModal
        show={showExpiredOverrideModal}
        expiredLineWarnings={expiredLineWarnings}
        formatDisplayDate={formatDisplayDate}
        overrideToken={overrideToken}
        setOverrideToken={setOverrideToken}
        overrideReason={overrideReason}
        setOverrideReason={setOverrideReason}
        setShowExpiredOverrideModal={setShowExpiredOverrideModal}
        saveBill={saveBill}
        saving={saving}
      />

      <AddressBookForm
        open={addressBookOpen}
        onClose={() => setAddressBookOpen(false)}
        onSave={() => {
          loadAddressBookEntries();
          showToast('Address book entry saved', { type: 'success' });
        }}
      />

      <PatientHistoryDrawer
        open={patientHistoryDrawerOpen}
        onClose={() => setPatientHistoryDrawerOpen(false)}
        patientName={selectedPatientHistory?.patientName || ''}
        purchases={selectedPatientHistory?.purchases || []}
        knownAllergies={selectedPatientHistory?.knownAllergies || []}
      />

      <Modal
        open={printPreviewOpen}
        title="Invoice Print Preview"
        onCancel={() => {
          setPrintPreviewOpen(false);
          setPrintPreviewInvoice(null);
          setPrintPreviewHtml('');
        }}
        width={980}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setPrintPreviewOpen(false);
              setPrintPreviewInvoice(null);
              setPrintPreviewHtml('');
            }}
          >
            Close
          </Button>,
          <Button
            key="print"
            type="primary"
            onClick={() => {
              if (!printPreviewInvoice) return;
              openPrintWindow(buildThermalInvoiceHtml(printPreviewInvoice), true);
            }}
          >
            Print Now
          </Button>
        ]}
      >
        <iframe
          title="Invoice Preview"
          srcDoc={printPreviewHtml}
          style={{ width: '100%', height: '68vh', border: '1px solid #d9d9d9', borderRadius: 8 }}
        />
      </Modal>
    </AppShell>
  );
};

export default Billing;
