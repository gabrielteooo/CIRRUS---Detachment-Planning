import { getCannibaliseTailOptions } from '../../data/nsnDrilldownMock';
import type {
  CannibaliseShortfallAction,
  PlanLine,
  WaitShortfallAction,
} from '../../types/planLine';

export interface AwaitingSupplyResolutionRow {
  key: string;
  qty: number;
  poNumber: string;
  edd: string;
  serialNo: string;
  remarks: string;
}

export interface CannibalisedResolutionRow {
  key: string;
  qty: number;
  tailNumber: string;
  etr: string;
  qpa: number;
  remarks: string;
}

export interface AcceptShortfallResolution {
  qty: number;
  remarks: string;
}

export interface ApprovalPackResolutionSections {
  awaitingSupply: AwaitingSupplyResolutionRow[];
  cannibalised: CannibalisedResolutionRow[];
  accept?: AcceptShortfallResolution;
}

export function getApprovalPackResolutionSections(line: PlanLine): ApprovalPackResolutionSections {
  const awaitingSupply: AwaitingSupplyResolutionRow[] = [];
  const cannibalised: CannibalisedResolutionRow[] = [];
  let accept: AcceptShortfallResolution | undefined;
  const tailOptions = getCannibaliseTailOptions(line);

  for (const [index, action] of line.shortfallActions.entries()) {
    if (action.type === 'accept') {
      accept = {
        qty: action.qty,
        remarks: action.remarks.trim() || '—',
      };
      continue;
    }

    if (action.type === 'wait') {
      const waitAction = action as WaitShortfallAction;
      if (waitAction.supplyOrders?.length) {
        for (const [orderIndex, order] of waitAction.supplyOrders.entries()) {
          awaitingSupply.push({
            key: `${index}-${orderIndex}`,
            qty: order.qty,
            poNumber: order.poNumber,
            edd: order.edd,
            serialNo: order.serialNo?.trim() || '—',
            remarks: waitAction.remarks.trim() || 'Await supply',
          });
        }
      } else {
        awaitingSupply.push({
          key: String(index),
          qty: waitAction.qty,
          poNumber: '—',
          edd: waitAction.needByDate,
          serialNo: '—',
          remarks: waitAction.remarks.trim() || 'Await supply',
        });
      }
      continue;
    }

    if (action.type === 'cannibalise') {
      const cannAction = action as CannibaliseShortfallAction;
      const tailOption = tailOptions.find((option) => option.tailNo === cannAction.tailNumber);
      cannibalised.push({
        key: String(index),
        qty: cannAction.qty,
        tailNumber: cannAction.tailNumber.trim() || '—',
        etr: tailOption?.etr ?? '—',
        qpa: tailOption?.qpa ?? cannAction.qty,
        remarks: cannAction.workCentreComments.trim() || '—',
      });
    }
  }

  return { awaitingSupply, cannibalised, accept };
}
