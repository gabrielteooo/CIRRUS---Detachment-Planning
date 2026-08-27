import { useEffect, useMemo, useState } from 'react';
import { Empty, Typography } from 'antd';
import type { PlanLine } from '../../types/planLine';
import LineStatusTags from './LineStatusTags';
import ApprovalPackDetailPanel from './ApprovalPackDetailPanel';

export interface ApprovalPackListEntry {
  line: PlanLine;
  showShortfallResolutions: boolean;
  showDeviationReason: boolean;
}

interface ApprovalPackPresenterViewProps {
  shortfalls: PlanLine[];
  deviations: PlanLine[];
  viewOnly: boolean;
  selectedLineIds: Set<string>;
  onSelectLine: (lineId: string, checked: boolean) => void;
  onEditLine: (line: PlanLine) => void;
}

function buildApprovalPackList(
  shortfalls: PlanLine[],
  deviations: PlanLine[],
): ApprovalPackListEntry[] {
  const byId = new Map<string, ApprovalPackListEntry>();

  for (const line of shortfalls) {
    byId.set(line.id, {
      line,
      showShortfallResolutions: true,
      showDeviationReason: false,
    });
  }

  for (const line of deviations) {
    const existing = byId.get(line.id);
    if (existing) {
      existing.showDeviationReason = true;
      continue;
    }
    byId.set(line.id, {
      line,
      showShortfallResolutions: false,
      showDeviationReason: true,
    });
  }

  return [...byId.values()];
}

function PresenterListSection({
  title,
  entries,
  activeLineId,
  onSelect,
}: {
  title: string;
  entries: ApprovalPackListEntry[];
  activeLineId: string | null;
  onSelect: (lineId: string) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <section className="approval-pack-presenter-list-section">
      <Typography.Text type="secondary" className="approval-pack-presenter-list-section-title">
        {title} ({entries.length})
      </Typography.Text>
      {entries.map((entry) => {
        const isActive = entry.line.id === activeLineId;

        return (
          <button
            key={`${title}-${entry.line.id}`}
            type="button"
            className={`approval-pack-list-item${
              isActive ? ' approval-pack-list-item--active' : ''
            }`}
            onClick={() => onSelect(entry.line.id)}
          >
            <Typography.Text
              strong={isActive}
              className="approval-pack-list-item-title"
            >
              {entry.line.description}
            </Typography.Text>
            <Typography.Text type="secondary" className="approval-pack-list-item-nsn">
              NSN: {entry.line.nsn}
            </Typography.Text>
            <LineStatusTags line={entry.line} />
          </button>
        );
      })}
    </section>
  );
}

export default function ApprovalPackPresenterView({
  shortfalls,
  deviations,
  viewOnly,
  selectedLineIds,
  onSelectLine,
  onEditLine,
}: ApprovalPackPresenterViewProps) {
  const listEntries = useMemo(
    () => buildApprovalPackList(shortfalls, deviations),
    [shortfalls, deviations],
  );
  const shortfallEntries = useMemo(
    () => listEntries.filter((entry) => entry.showShortfallResolutions),
    [listEntries],
  );
  const deviationEntries = useMemo(
    () => listEntries.filter((entry) => entry.showDeviationReason),
    [listEntries],
  );
  const [activeLineId, setActiveLineId] = useState<string | null>(null);

  useEffect(() => {
    if (listEntries.length === 0) {
      setActiveLineId(null);
      return;
    }

    if (!activeLineId || !listEntries.some((entry) => entry.line.id === activeLineId)) {
      setActiveLineId(listEntries[0].line.id);
    }
  }, [listEntries, activeLineId]);

  const activeEntry =
    listEntries.find((entry) => entry.line.id === activeLineId) ?? listEntries[0] ?? null;

  if (listEntries.length === 0) {
    return (
      <Empty
        description="No items pending approval."
        style={{ padding: '48px 0' }}
      />
    );
  }

  return (
    <div className="approval-pack-presenter-layout">
      <aside className="approval-pack-presenter-sidebar">
        <Typography.Title level={5} className="approval-pack-presenter-sidebar-title">
          Approval needed
        </Typography.Title>
        <div className="approval-pack-presenter-list">
          <PresenterListSection
            title="Shortfalls"
            entries={shortfallEntries}
            activeLineId={activeEntry?.line.id ?? null}
            onSelect={setActiveLineId}
          />
          <PresenterListSection
            title="Additional requirements"
            entries={deviationEntries}
            activeLineId={activeEntry?.line.id ?? null}
            onSelect={setActiveLineId}
          />
        </div>
      </aside>

      <div className="approval-pack-presenter-detail">
        {activeEntry ? (
          <ApprovalPackDetailPanel
            line={activeEntry.line}
            showShortfallResolutions={activeEntry.showShortfallResolutions}
            showDeviationReason={activeEntry.showDeviationReason}
            viewOnly={viewOnly}
            approvedForSave={selectedLineIds.has(activeEntry.line.id)}
            onApproveToggle={onSelectLine}
            onEdit={onEditLine}
          />
        ) : (
          <Empty description="Select an item to view details" />
        )}
      </div>
    </div>
  );
}
