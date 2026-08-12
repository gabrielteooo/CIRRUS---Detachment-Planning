import { useMemo, useState } from 'react';
import { Button, Dropdown, Input, Select, Space, Typography } from 'antd';
import { DownloadOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import LSeriesCard from '../components/lseries/LSeriesCard';
import UploadLSeriesModal, {
  type UploadLSeriesMode,
} from '../components/lseries/UploadLSeriesModal';
import { useApp } from '../context/AppContext';
import type { Platform } from '../types/detachment';
import type { LSeriesRecord } from '../types/lSeries';
import { downloadBlankLSeriesTemplate, downloadLSeriesWorkbook } from '../utils/lSeriesExcel';

const PLATFORM_OPTIONS = [
  { label: 'All platforms', value: 'all' },
  { label: 'F-16', value: 'F-16' },
  { label: 'CH-47', value: 'CH-47' },
];

const PLATFORMS: Platform[] = ['F-16', 'CH-47'];

interface UploadModalState {
  open: boolean;
  mode: UploadLSeriesMode;
  initialPlatform?: Platform;
  replaceRecord?: LSeriesRecord;
}

export default function LSeriesListPage() {
  const navigate = useNavigate();
  const { lSeriesRecords } = useApp();
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [uploadState, setUploadState] = useState<UploadModalState>({
    open: false,
    mode: 'new',
  });

  const filteredRecords = useMemo(() => {
    let result = [...lSeriesRecords];
    if (platformFilter !== 'all') {
      result = result.filter((record) => record.platform === platformFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (record) =>
          record.name.toLowerCase().includes(q) ||
          record.platform.toLowerCase().includes(q) ||
          record.missionType.toLowerCase().includes(q),
      );
    }
    return result.sort((a, b) => {
      if (a.platform !== b.platform) return a.platform.localeCompare(b.platform);
      return a.missionType.localeCompare(b.missionType);
    });
  }, [lSeriesRecords, platformFilter, search]);

  const activePlatforms = useMemo(
    (): Platform[] => (platformFilter === 'all' ? PLATFORMS : [platformFilter as Platform]),
    [platformFilter],
  );

  const platformRecords = useMemo(
    () =>
      platformFilter === 'all'
        ? lSeriesRecords
        : lSeriesRecords.filter((record) => record.platform === platformFilter),
    [lSeriesRecords, platformFilter],
  );

  const downloadMenuItems = useMemo((): MenuProps['items'] => {
    const blankItems = activePlatforms.map((platform) => ({
      key: `blank-${platform}`,
      label: `Blank template — ${platform}`,
      onClick: () => downloadBlankLSeriesTemplate(platform),
    }));

    const existingItems = platformRecords.map((record) => ({
      key: record.id,
      label: `${record.name} (${record.platform} · ${record.missionType})`,
      onClick: () =>
        downloadLSeriesWorkbook(
          `${record.name}-v${record.version}.xlsx`,
          record.template,
          record.platform,
        ),
    }));

    if (existingItems.length === 0) return blankItems;

    return [...blankItems, { type: 'divider' as const }, ...existingItems];
  }, [activePlatforms, platformRecords]);

  const uploadMenuItems = useMemo((): MenuProps['items'] => {
    const newItems = activePlatforms.map((platform) => ({
      key: `new-${platform}`,
      label: `New ${platform} Template`,
      onClick: () =>
        setUploadState({
          open: true,
          mode: 'new' as const,
          initialPlatform: platform,
        }),
    }));

    const replaceItems = platformRecords.map((record) => ({
      key: `replace-${record.id}`,
      label: `Replace ${record.name}`,
      onClick: () =>
        setUploadState({
          open: true,
          mode: 'replace' as const,
          replaceRecord: record,
        }),
    }));

    if (replaceItems.length === 0) return newItems;

    return [...newItems, { type: 'divider' as const }, ...replaceItems];
  }, [activePlatforms, platformRecords]);

  const closeUploadModal = () => {
    setUploadState((prev) => ({ ...prev, open: false }));
  };

  return (
    <div>
      <div className="lseries-mgmt-toolbar">
        <Space wrap size={12}>
          <Select
            value={platformFilter}
            onChange={setPlatformFilter}
            options={PLATFORM_OPTIONS}
            style={{ width: 160 }}
            aria-label="Platform filter"
          />
          <Input
            placeholder="Search L-series"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: 260 }}
            allowClear
          />
        </Space>

        <Space wrap size={12}>
          <Dropdown menu={{ items: downloadMenuItems }} trigger={['click']}>
            <Button icon={<DownloadOutlined />}>Download template</Button>
          </Dropdown>
          <Dropdown menu={{ items: uploadMenuItems }} trigger={['click']}>
            <Button type="primary" icon={<UploadOutlined />}>
              Upload L-series
            </Button>
          </Dropdown>
        </Space>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="lseries-mgmt-empty">
          <Typography.Text type="secondary">
            No L-series records match your filters.
          </Typography.Text>
        </div>
      ) : (
        <div className="lseries-mgmt-grid">
          {filteredRecords.map((record) => (
            <LSeriesCard
              key={record.id}
              record={record}
              onClick={() => navigate(`/system-configurations/l-series/${record.id}`)}
            />
          ))}
        </div>
      )}

      <UploadLSeriesModal
        open={uploadState.open}
        onClose={closeUploadModal}
        mode={uploadState.mode}
        initialPlatform={uploadState.initialPlatform}
        replaceRecord={uploadState.replaceRecord}
      />
    </div>
  );
}
