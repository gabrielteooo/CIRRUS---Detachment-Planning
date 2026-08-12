function parseMpns(mpn: string): string[] {
  return mpn
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export { parseMpns };

interface MpnCellProps {
  mpn: string;
}

export default function MpnCell({ mpn }: MpnCellProps) {
  const mpns = parseMpns(mpn);

  if (mpns.length === 0) {
    return <span>—</span>;
  }

  if (mpns.length === 1) {
    return <span>{mpns[0]}</span>;
  }

  return (
    <div className="lseries-mpn-cell lseries-mpn-cell--stacked">
      {mpns.map((value) => (
        <span key={value} className="lseries-mpn-cell-line">
          {value}
        </span>
      ))}
    </div>
  );
}
