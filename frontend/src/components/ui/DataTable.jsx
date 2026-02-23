import React, { useMemo, useState } from 'react';
import { Input, Pagination, Space, Table } from 'antd';
import EmptyState from './EmptyState';

const DataTable = ({
  columns,
  data,
  rowKey = '_id',
  searchable = false,
  searchPlaceholder = 'Search...',
  filterKeys = [],
  initialSort = null,
  pageSize = 8,
  loading = false,
  emptyTitle,
  emptyDescription
}) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    if (!searchable || !query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter((row) => {
      const keys = filterKeys.length ? filterKeys : columns.map((c) => c.key);
      return keys.some((key) => String(row?.[key] ?? '').toLowerCase().includes(q));
    });
  }, [columns, data, filterKeys, query, searchable]);

  const sorted = useMemo(() => {
    if (!initialSort?.key) return filtered;
    const next = [...filtered];
    next.sort((a, b) => {
      const av = a?.[initialSort.key];
      const bv = b?.[initialSort.key];
      if (typeof av === 'number' && typeof bv === 'number') {
        return initialSort.dir === 'asc' ? av - bv : bv - av;
      }
      return initialSort.dir === 'asc'
        ? String(av ?? '').localeCompare(String(bv ?? ''))
        : String(bv ?? '').localeCompare(String(av ?? ''));
    });
    return next;
  }, [filtered, initialSort?.dir, initialSort?.key]);

  const totalPages = Math.max(Math.ceil(sorted.length / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const antColumns = useMemo(
    () =>
      columns.map((col) => ({
        title: col.label,
        dataIndex: col.key,
        key: col.key,
        render: (_, row) => (col.render ? col.render(row) : row[col.key]),
        sorter: col.sortable
          ? (a, b) => {
              const av = a?.[col.key];
              const bv = b?.[col.key];
              if (typeof av === 'number' && typeof bv === 'number') return av - bv;
              return String(av ?? '').localeCompare(String(bv ?? ''));
            }
          : false
      })),
    [columns]
  );

  return (
    <div className="data-table-wrap">
      {searchable ? (
        <div className="data-table-head">
          <Input
            value={query}
            placeholder={searchPlaceholder}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
          />
        </div>
      ) : null}

      <Table
        rowKey={rowKey}
        loading={loading}
        columns={antColumns}
        dataSource={paged}
        pagination={false}
        locale={{
          emptyText: <EmptyState title={emptyTitle} description={emptyDescription} />
        }}
        size="middle"
      />

      <Space style={{ marginTop: 12, width: '100%', justifyContent: 'flex-end' }}>
        <Pagination current={safePage} total={sorted.length} pageSize={pageSize} onChange={(next) => setPage(next)} />
      </Space>
    </div>
  );
};

export default DataTable;
