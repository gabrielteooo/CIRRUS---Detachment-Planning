import { useMemo, useState } from 'react';
import { Badge, Space, Table, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ComponentCategory, LSComponent, LSPlatformTemplate } from '../../data/lSeriesTemplate';
import { COMPONENT_CATEGORIES } from '../../data/lSeriesTemplate';
import MpnCell from './MpnCell';

interface LSeriesComponentsTableProps {
  template: LSPlatformTemplate;
  scrollY?: number;
  withCategoryTabs?: boolean;
}

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  LRU: 'LRU',
  Consumable: 'Consumables',
  POL: 'POL',
};

function hasColumnData(components: LSComponent[], getValue: (component: LSComponent) => unknown): boolean {
  return components.some((component) => {
    const value = getValue(component);
    return value != null && String(value).trim() !== '';
  });
}

function hasTierData(components: LSComponent[], tier: number): boolean {
  return components.some((component) => (component.qtyByTier[String(tier)] ?? 0) > 0);
}

export default function LSeriesComponentsTable({
  template,
  scrollY = 480,
  withCategoryTabs = false,
}: LSeriesComponentsTableProps) {
  const [activeCategory, setActiveCategory] = useState<ComponentCategory>('LRU');

  const filteredComponents = useMemo(() => {
    if (!withCategoryTabs) return template.components;
    return template.components.filter((component) => component.category === activeCategory);
  }, [template.components, withCategoryTabs, activeCategory]);

  const columns = useMemo(() => {
    const tierColumns = template.tiers
      .filter((tier) => !withCategoryTabs || hasTierData(filteredComponents, tier))
      .map((tier: number) => ({
        title: String(tier),
        key: `tier-${tier}`,
        width: 80,
        align: 'center' as const,
        render: (_: unknown, record: LSComponent) => record.qtyByTier[String(tier)] ?? 0,
      }));

    const cols: ColumnsType<LSComponent> = [
      { title: 'NSN', dataIndex: 'nsn', width: 130, fixed: 'left' },
      {
        title: 'MPN',
        dataIndex: 'mpn',
        width: 140,
        render: (value: string) => (withCategoryTabs ? <MpnCell mpn={value} /> : value),
      },
      { title: 'Description', dataIndex: 'description', width: 220, ellipsis: true },
    ];

    if (!withCategoryTabs || hasColumnData(filteredComponents, (component) => component.trade)) {
      cols.push({
        title: 'Trade',
        dataIndex: 'trade',
        width: 90,
        render: (value) => value ?? '—',
      });
    }

    if (!withCategoryTabs || hasColumnData(filteredComponents, (component) => component.system)) {
      cols.push({
        title: 'System',
        dataIndex: 'system',
        width: 120,
        render: (value) => value ?? '—',
      });
    }

    if (!withCategoryTabs || hasColumnData(filteredComponents, (component) => component.variants)) {
      cols.push({
        title: 'Variants',
        dataIndex: 'variants',
        width: 120,
        render: (value) => value ?? '—',
      });
    }

    if (tierColumns.length > 0) {
      cols.push({
        title: template.paramLabel,
        children: tierColumns,
      });
    }

    if (!withCategoryTabs || hasColumnData(filteredComponents, (component) => component.uom)) {
      cols.push({
        title: 'UOM',
        dataIndex: 'uom',
        width: 70,
        render: (value) => value ?? '—',
      });
    }

    return cols;
  }, [template, filteredComponents, withCategoryTabs]);

  const categoryCounts = useMemo(
    () =>
      COMPONENT_CATEGORIES.reduce(
        (counts, category) => {
          counts[category] = template.components.filter((c) => c.category === category).length;
          return counts;
        },
        {} as Record<ComponentCategory, number>,
      ),
    [template.components],
  );

  const table = (
    <div className={withCategoryTabs ? 'lseries-preview-table-wrap' : undefined}>
      <Table
        rowKey={(record, index) => `${record.nsn}-${index}`}
        size="small"
        columns={columns}
        dataSource={filteredComponents}
        pagination={false}
        scroll={{ x: 1400, y: scrollY }}
        bordered
      />
    </div>
  );

  if (!withCategoryTabs) return table;

  const categoryTabs = COMPONENT_CATEGORIES.map((category) => ({
    key: category,
    label: (
      <Space size={8}>
        {CATEGORY_LABELS[category]}
        <Badge count={categoryCounts[category]} style={{ backgroundColor: '#00636a' }} />
      </Space>
    ),
  }));

  return (
    <div className="lseries-preview-table-section">
      <Tabs
        className="lseries-category-tabs"
        activeKey={activeCategory}
        onChange={(key) => setActiveCategory(key as ComponentCategory)}
        items={categoryTabs}
      />
      {table}
    </div>
  );
}
