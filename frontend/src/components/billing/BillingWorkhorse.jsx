import React from 'react';
import { Button, Card, Input, InputNumber, Select, Space, Table, Tag, Typography } from 'antd';

const BillingWorkhorse = ({
  activeEditableLine,
  searchInputRefs,
  setActiveLineId,
  setSearchFocusLineId,
  setHighlightedSuggestionByLine,
  updateLine,
  handleSearchKeyDown,
  activeLineSuggestions,
  activeSearchLoading,
  activeLineIndex,
  totalLines,
  searchFocusLineId,
  activeHighlightedIndex,
  selectSuggestion,
  getMedicineSafetyTone,
  discountPercent,
  setDiscountPercent,
  vatApplicable,
  vatPercent,
  setVatApplicable,
  resetBillForm,
  addActiveLineToCart,
  addLine,
  saveBill,
  saving,
  grandTotal,
  cartLines,
  resolveLineExpiry,
  isExpired,
  isNearExpiry,
  formatDisplayDate,
  focusSearchInput,
  removeLine
}) => {
  const { Title, Text } = Typography;
  const [showHotkeyHints, setShowHotkeyHints] = React.useState(() => {
    try {
      return window.localStorage.getItem('billing_show_hotkeys') !== '0';
    } catch {
      return true;
    }
  });
  const toggleHotkeyHints = () => {
    setShowHotkeyHints((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('billing_show_hotkeys', next ? '1' : '0');
      } catch {}
      return next;
    });
  };
  const cartColumns = [
    {
      title: 'Medicine',
      key: 'medicine',
      render: (_, line) => {
        const safetyTone = getMedicineSafetyTone(line.medicine);
        return (
          <Space direction="vertical" size={4}>
            <strong>{line.medicine?.name || '-'}</strong>
            <Tag color={safetyTone === 'regulated' ? 'volcano' : 'blue'}>
              {safetyTone === 'regulated' ? 'Schedule/Narcotic' : 'Normal Medicine'}
            </Tag>
            <Text type="secondary">
              Rack: {line.medicine?.rackLocation || '-'} | Stock: {Number(line.medicine?.stockQty || 0)}
            </Text>
          </Space>
        );
      }
    },
    { title: 'Batch', key: 'batch', render: (_, line) => line.batchNumber || line.medicine?.batchNumber || '-' },
    {
      title: 'Expiry',
      key: 'expiry',
      render: (_, line) => {
        const resolvedExpiry = resolveLineExpiry(line);
        const expired = isExpired(resolvedExpiry);
        const nearExpiry = isNearExpiry(resolvedExpiry);
        return (
          <Text type={expired ? 'danger' : nearExpiry ? 'warning' : undefined} strong={expired || nearExpiry}>
            {resolvedExpiry ? formatDisplayDate(resolvedExpiry) : '-'}
          </Text>
        );
      }
    },
    { title: 'Qty', key: 'qty', render: (_, line) => Number(line.qty || 0) },
    { title: 'Rate', key: 'rate', render: (_, line) => `Rs.${Number(line.rate || 0).toLocaleString()}` },
    { title: 'Amount', key: 'amount', render: (_, line) => `Rs.${Number(line.amount || 0).toLocaleString()}` },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, line) => (
        <Space>
          <Button onClick={() => focusSearchInput(line.id)}>Edit</Button>
          <Button danger onClick={() => removeLine(line.id)}>Remove</Button>
        </Space>
      )
    }
  ];

  return (
    <section className="billing-workhorse-grid gap-bottom">
      <Card className="billing-input-card">
        <div className="section-head-row tight">
          <Title level={4} style={{ margin: 0 }}>Search &amp; Input</Title>
          <Tag color="geekblue" className="billing-active-line-tag">
            Line {Math.max(activeLineIndex + 1, 1)} / {Math.max(Number(totalLines || 0), 1)}
          </Tag>
        </div>
        {activeEditableLine ? (
          <>
            <div className="pos-search-wrap billing-search-wrap">
              <div className="billing-hints-toggle-row">
                <Button type="text" size="small" className="billing-hints-toggle" onClick={toggleHotkeyHints}>
                  {showHotkeyHints ? 'Hide shortcuts' : 'Show shortcuts'}
                </Button>
              </div>
              <Input
                ref={(el) => { searchInputRefs.current[activeEditableLine.id] = el; }}
                data-pos-search="true"
                className={`billing-search-input ${searchFocusLineId === activeEditableLine.id ? 'is-active' : ''}`}
                value={activeEditableLine.searchTerm || ''}
                onFocus={() => {
                  setActiveLineId(activeEditableLine.id);
                  setSearchFocusLineId(activeEditableLine.id);
                  setHighlightedSuggestionByLine((prev) => ({ ...prev, [activeEditableLine.id]: 0 }));
                }}
                onBlur={() => setTimeout(() => {
                  setSearchFocusLineId((prev) => (prev === activeEditableLine.id ? '' : prev));
                }, 150)}
                onChange={(e) => {
                  updateLine(activeEditableLine.id, { searchTerm: e.target.value });
                  setHighlightedSuggestionByLine((prev) => ({ ...prev, [activeEditableLine.id]: 0 }));
                }}
                onKeyDown={(event) => handleSearchKeyDown(event, activeEditableLine, activeLineSuggestions, Math.max(activeLineIndex, 0))}
                placeholder="Type 3+ letters or scan barcode"
              />
              {showHotkeyHints ? (
                <div className="billing-hotkey-hints" aria-label="Billing keyboard shortcuts">
                  <span><kbd>F1</kbd> New bill</span>
                  <span><kbd>F2</kbd> Focus search</span>
                  <span><kbd>Enter</kbd> Add selected medicine</span>
                  <span><kbd>Up</kbd>/<kbd>Down</kbd> Move suggestions</span>
                  <span><kbd>Ctrl</kbd>+<kbd>Enter</kbd> Finalize bill</span>
                  <span><kbd>Esc</kbd> Close overlays</span>
                </div>
              ) : null}
              {searchFocusLineId === activeEditableLine.id && (activeEditableLine.searchTerm || '').trim().length >= 3 ? (
                <div className="pos-search-results">
                  {activeLineSuggestions.map((suggestion, suggestionIndex) => {
                    const safetyTone = getMedicineSafetyTone(suggestion);
                    const inStock = Number(suggestion.stockQty || 0) > 0;
                    return (
                      <Button
                        key={suggestion._id}
                        className={`pos-search-item medicine-tone-${safetyTone} ${suggestionIndex === activeHighlightedIndex ? 'active' : ''}`}
                        onMouseDown={() => selectSuggestion(activeEditableLine.id, suggestion)}
                      >
                        <strong>{suggestion.name}</strong>
                        <span className="medicine-meta-row">
                          <em className={`medicine-safety-pill ${safetyTone}`}>
                            {safetyTone === 'regulated' ? 'Schedule/Narcotic' : 'Normal Medicine'}
                          </em>
                          <em className={`medicine-stock-pill ${inStock ? 'in' : 'out'}`}>
                            {inStock ? 'In Stock' : 'Out of Stock'}
                          </em>
                        </span>
                        <span>
                          Rack: {suggestion.rackLocation || '-'} | Rs.{Number(suggestion.unitPrice || 0).toLocaleString()}
                        </span>
                      </Button>
                    );
                  })}
                  {activeSearchLoading ? (
                    <div className="pos-search-empty">Searching medicines...</div>
                  ) : null}
                  {!activeSearchLoading && !activeLineSuggestions.length ? (
                    <div className="pos-search-empty">No matches found</div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="form-grid cols-4 gap-bottom mt-8">
              <div className="form-field">
                <label>Batch</label>
                <Input
                  list={`batch-options-${activeEditableLine.id}`}
                  value={activeEditableLine.batchNumber || ''}
                  onChange={(e) => updateLine(activeEditableLine.id, { batchNumber: e.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addActiveLineToCart();
                    }
                  }}
                  placeholder="Batch number"
                />
                <datalist id={`batch-options-${activeEditableLine.id}`}>
                  {Array.isArray(activeEditableLine?.medicine?.batches)
                    ? activeEditableLine.medicine.batches.map((batch) => (
                      <option key={`${batch.batchNumber}_${batch.expiryDate}`} value={batch.batchNumber} />
                    ))
                    : null}
                </datalist>
              </div>
              <div className="form-field">
                <label>Qty</label>
                <InputNumber
                  min="1"
                  step="1"
                  style={{ width: '100%' }}
                  value={activeEditableLine.qtyInput ?? ''}
                  onChange={(value) => updateLine(activeEditableLine.id, { qty: value ?? '' })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addActiveLineToCart();
                    }
                  }}
                />
              </div>
              <div className="form-field">
                <label>Rate</label>
                <InputNumber
                  min="0"
                  step="0.01"
                  style={{ width: '100%' }}
                  value={activeEditableLine.rateInput ?? ''}
                  onChange={(value) => updateLine(activeEditableLine.id, { rate: value ?? '' })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addActiveLineToCart();
                    }
                  }}
                />
              </div>
              <div className="form-field">
                <label>Discount %</label>
                <InputNumber
                  min="0"
                  step="0.01"
                  style={{ width: '100%' }}
                  value={discountPercent}
                  onChange={(value) => setDiscountPercent(value ?? 0)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addActiveLineToCart();
                    }
                  }}
                />
              </div>
            </div>
            <div className="form-grid cols-3 gap-bottom">
              <div className="form-field">
                <label>VAT</label>
                <Select
                  value={vatApplicable ? 'yes' : 'no'}
                  onChange={(value) => setVatApplicable(value === 'yes')}
                  options={[
                    { value: 'yes', label: `Apply VAT (${Number(vatPercent || 0)}%)` },
                    { value: 'no', label: 'No VAT' }
                  ]}
                />
              </div>
              <div className="form-field">
                <label>Stock Available</label>
                <Input value={Number(activeEditableLine.medicine?.stockQty || 0)} readOnly />
              </div>
              <div className="form-field">
                <label>Rack</label>
                <Input value={activeEditableLine.medicine?.rackLocation || '-'} readOnly />
              </div>
            </div>
            {activeEditableLine.medicine ? (
              <div className="billing-safety-cues">
                <Tag color={getMedicineSafetyTone(activeEditableLine.medicine) === 'regulated' ? 'volcano' : 'blue'}>
                  {getMedicineSafetyTone(activeEditableLine.medicine) === 'regulated' ? 'Red/Orange: Prescription Required' : 'Blue: Normal Medicine'}
                </Tag>
                <Tag color={Number(activeEditableLine.medicine?.stockQty || 0) > 0 ? 'green' : 'red'}>
                  {Number(activeEditableLine.medicine?.stockQty || 0) > 0 ? 'Green: In Stock' : 'Out of Stock'}
                </Tag>
              </div>
            ) : null}
            <Space wrap className="billing-input-actions billing-action-row">
              <Button onClick={resetBillForm}>New Bill (F1)</Button>
              <Button onClick={addActiveLineToCart}>Add to Cart</Button>
              <Button onClick={addLine}>Add Line</Button>
              <Button type="primary" onClick={saveBill} loading={saving}>Finalize Bill</Button>
            </Space>
          </>
        ) : (
          <p className="empty-hint">Add a line item to start billing.</p>
        )}
      </Card>

      <Card className="billing-cart-card">
        <div className="section-head-row tight">
          <Title level={4} style={{ margin: 0 }}>Cart</Title>
          <div className="billing-grand-total">Rs.{Math.round(grandTotal).toLocaleString()}</div>
        </div>
        <div className="billing-total-label">GRAND TOTAL</div>
        <Table
          rowKey="id"
          className="billing-cart-table"
          columns={cartColumns}
          dataSource={cartLines}
          pagination={false}
          size="small"
          sticky
          scroll={{ x: 860, y: 360 }}
          locale={{ emptyText: 'Cart is empty. Search medicine on the left and add to cart.' }}
        />
      </Card>
    </section>
  );
};

export default BillingWorkhorse;
