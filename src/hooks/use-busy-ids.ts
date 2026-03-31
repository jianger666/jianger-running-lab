import { useState, useCallback } from "react";

const useBusyIds = () => {
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  const isBusy = useCallback(
    ({ id }: { id: number }) => busyIds.has(id),
    [busyIds],
  );

  const markBusy = useCallback(
    ({ id }: { id: number }) =>
      setBusyIds((prev) => new Set(prev).add(id)),
    [],
  );

  const unmarkBusy = useCallback(
    ({ id }: { id: number }) =>
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
    [],
  );

  return { isBusy, markBusy, unmarkBusy };
};

export { useBusyIds };
