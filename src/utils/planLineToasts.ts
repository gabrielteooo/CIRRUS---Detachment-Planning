import { message as staticMessage } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  hasResolutionRecorded,
  hasShortfallCondition,
  hasDeviationCondition,
  isAwaitingSparesOnlyShortfallResolution,
  lineNeedsShortfallApproval,
  type PlanLine,
} from '../types/planLine';

const DARK_MESSAGE_CLASS = 'fms-dark-message';

function showDarkSuccess(messageApi: MessageInstance, content: string) {
  // Defer so the toast renders above drawers/modals after they close.
  window.setTimeout(() => {
    messageApi.success({
      content,
      className: DARK_MESSAGE_CLASS,
    });
  }, 0);
}

export function showAwaitingSparesToast(messageApi: MessageInstance, nsn: string) {
  showDarkSuccess(
    messageApi,
    `Awaiting spares recorded. ${nsn} is fulfilled — monitor progress in Awaiting spares`,
  );
}

export function showShortfallResolutionToast(messageApi: MessageInstance, nsn: string) {
  showDarkSuccess(
    messageApi,
    `Resolution(s) recorded successfully. ${nsn} has been moved to Approval pack`,
  );
}

export function showDeviationRecordedToast(messageApi: MessageInstance, nsn: string) {
  showDarkSuccess(
    messageApi,
    `Deviation(s) recorded successfully. ${nsn} has been moved to Approval pack`,
  );
}

export function showAddedNsnToast(messageApi: MessageInstance) {
  showDarkSuccess(messageApi, 'NSN(s) has been added successfully');
}

export function showLSeriesSubmittedToast(
  messageApi: MessageInstance,
  name: string,
  isReplace: boolean,
) {
  showDarkSuccess(
    messageApi,
    isReplace ? `${name} has been updated successfully` : `${name} has been added successfully`,
  );
}

export function showPlanLineSaveToast(
  messageApi: MessageInstance,
  before: PlanLine | undefined,
  after: PlanLine,
) {
  if (!before) return;

  if (
    hasShortfallCondition(after) &&
    after.shortfallActions.length > 0 &&
    before.shortfallActions.length === 0
  ) {
    if (isAwaitingSparesOnlyShortfallResolution(after)) {
      showAwaitingSparesToast(messageApi, after.nsn);
    } else if (lineNeedsShortfallApproval(after)) {
      showShortfallResolutionToast(messageApi, after.nsn);
    }
    return;
  }

  if (
    hasShortfallCondition(after) &&
    lineNeedsShortfallApproval(after) &&
    isAwaitingSparesOnlyShortfallResolution(before) &&
    !isAwaitingSparesOnlyShortfallResolution(after)
  ) {
    showShortfallResolutionToast(messageApi, after.nsn);
    return;
  }

  if (
    hasShortfallCondition(after) &&
    isAwaitingSparesOnlyShortfallResolution(after) &&
    before.shortfallActions.length > 0 &&
    lineNeedsShortfallApproval(before) &&
    !lineNeedsShortfallApproval(after)
  ) {
    showAwaitingSparesToast(messageApi, after.nsn);
    return;
  }

  if (
    hasDeviationCondition(after) &&
    hasResolutionRecorded(after) &&
    !hasResolutionRecorded(before)
  ) {
    showDeviationRecordedToast(messageApi, after.nsn);
  }
}

/** Fallback for call sites that still use the static message API. */
export const planLineMessage = staticMessage;
