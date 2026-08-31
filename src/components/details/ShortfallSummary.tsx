import { useMemo } from 'react';
import { Badge, Collapse, Table, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import {
  formatShortfallActions,
  getLineActionLabel,
  hasShortfallCondition,
  sortShortfallLinesByApproval,
} from '../../types/planLine';
import type { Platform } from '../../types/detachment';
import {
  getNsnMpnDescriptionColumns,
  getPlatformVariantColumn,
  getRequiredColumn,
  getAvailableColumn,
  getAvailableColumnLinkRenderer,
  getSummaryEditColumn,
  getSummaryShortfallDeltaColumn,
  DETACHMENT_TABLE_LAYOUT,
  FLEX_TEXT_COLUMN_MIN_WIDTH,
  SHORTFALL_SUMMARY_SCROLL_X,
} from './nsnTableColumns';

interface ShortfallSummaryProps {
  lines: PlanLine[];
  platform: Platform;
  variant: string;
  viewOnly: boolean;
  onEditLine: (line: PlanLine) => void;
  onViewInventory: (line: PlanLine) => void;
}

function ShortfallHeader({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Typography.Text strong style={{ fontSize: 16, color: 'rgba(0,0,0,0.88)' }}>
        Shortfall summary
      </Typography.Text>
      <Badge
        count={count}
        overflowCount={999}
        style={{ backgroundColor: '#cf1322', fontWeight: 600 }}
      />
    </div>
  );
}

export default function ShortfallSummary({
  lines,
  platform,
  variant,
  viewOnly,
  onEditLine,
  onViewInventory,
}: ShortfallSummaryProps) {
  const shortfallLines = useMemo(
    () => sortShortfallLinesByApproval(lines.filter((l) => hasShortfallCondition(l))),
    [lines],
  );

  if (shortfallLines.length === 0) return null;

  const columns = [
    ...getNsnMpnDescriptionColumns<PlanLine>(),
    getPlatformVariantColumn<PlanLine>(platform, variant),
    getRequiredColumn<PlanLine>(shortfallLines),
    getAvailableColumn<PlanLine>(getAvailableColumnLinkRenderer(onViewInventory), {
      lines: shortfallLines,
    }),
    getSummaryShortfallDeltaColumn<PlanLine>(),
    {
      title: 'Resolution',
      key: 'actions',
      width: FLEX_TEXT_COLUMN_MIN_WIDTH,
      ellipsis: true,
      render: (_: unknown, record: PlanLine) => formatShortfallActions(record.shortfallActions),
    },
    getSummaryEditColumn<PlanLine>(viewOnly, onEditLine, getLineActionLabel),
  ];

  return (
    <Collapse
      className="summary-collapse-shortfall"
      defaultActiveKey={['shortfall']}
      items={[
        {
          key: 'shortfall',
          label: <ShortfallHeader count={shortfallLines.length} />,
          children: (
            <div className="detachment-table-container">
              <Table
                dataSource={shortfallLines}
                columns={columns}
                rowKey="id"
                pagination={false}
                size="small"
                tableLayout={DETACHMENT_TABLE_LAYOUT}
                scroll={{ x: SHORTFALL_SUMMARY_SCROLL_X }}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
