import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const EXTREME_PHASES = Object.freeze({
  EARLY: "early",
  MID: "mid",
  LATE: "late",
});

export const EARLY_PHASE_ROUND_LIMIT = 5;
export const MID_PHASE_ROUND_LIMIT = 12;

export const EXTREME_PHASE_INCREMENTS = Object.freeze({
  [EXTREME_PHASES.EARLY]: 0.08,
  [EXTREME_PHASES.MID]: 0.12,
  [EXTREME_PHASES.LATE]: 0.18,
});

const DEFAULT_STATE = Object.freeze({
  value: 0,
  roundNumber: 0,
  isForced: false,
});

const clamp01 = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
};

export const normalizeRoundNumber = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_STATE.roundNumber;
  }
  return Math.max(0, Math.floor(value));
};

export const getExtremePhaseForRound = (roundNumber) => {
  const sanitized = normalizeRoundNumber(roundNumber);
  if (sanitized <= EARLY_PHASE_ROUND_LIMIT) {
    return EXTREME_PHASES.EARLY;
  }
  if (sanitized <= MID_PHASE_ROUND_LIMIT) {
    return EXTREME_PHASES.MID;
  }
  return EXTREME_PHASES.LATE;
};

const sanitizeMeterState = (snapshot = {}) => {
  const roundNumber = normalizeRoundNumber(
    snapshot.roundNumber ?? DEFAULT_STATE.roundNumber
  );
  const value = clamp01(snapshot.value ?? DEFAULT_STATE.value);
  const isForced = Boolean(snapshot.isForced || value >= 1);

  return {
    value: isForced ? 1 : value,
    roundNumber,
    isForced,
  };
};

const useExtremeMeter = ({
  initialValue = DEFAULT_STATE.value,
  initialRoundNumber = DEFAULT_STATE.roundNumber,
  initialIsForced = DEFAULT_STATE.isForced,
  onChange,
} = {}) => {
  const changeHandlerRef = useRef(
    typeof onChange === "function" ? onChange : null
  );

  useEffect(() => {
    changeHandlerRef.current = typeof onChange === "function" ? onChange : null;
  }, [onChange]);

  const [state, setState] = useState(() =>
    sanitizeMeterState({
      value: initialValue,
      roundNumber: initialRoundNumber,
      isForced: initialIsForced,
    })
  );

  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const updateState = useCallback((updater) => {
    setState((current) => {
      const resolved =
        typeof updater === "function" ? updater(current) : updater ?? current;
      const sanitized = sanitizeMeterState(resolved);
      stateRef.current = sanitized;
      if (changeHandlerRef.current) {
        changeHandlerRef.current(sanitized);
      }
      return sanitized;
    });
  }, []);

  const setRoundNumber = useCallback(
    (nextRound) => {
      updateState((current) => ({
        ...current,
        roundNumber: normalizeRoundNumber(nextRound),
      }));
    },
    [updateState]
  );

  const setMeterValue = useCallback(
    (nextValue, options = {}) => {
      const { isForced } = options;
      updateState((current) => ({
        ...current,
        value: nextValue,
        isForced:
          typeof isForced === "boolean" ? isForced : current.isForced || nextValue >= 1,
      }));
    },
    [updateState]
  );

  const hydrate = useCallback(
    (snapshot = {}) => {
      updateState((current) => ({
        ...current,
        ...snapshot,
      }));
    },
    [updateState]
  );

  const completeRound = useCallback(
    ({ triggeredByMeter = false, incrementOverride } = {}) => {
      updateState((current) => {
        const nextRoundNumber = normalizeRoundNumber(current.roundNumber + 1);

        if (triggeredByMeter || current.isForced) {
          return {
            value: 0,
            roundNumber: nextRoundNumber,
            isForced: false,
          };
        }

        const phase = getExtremePhaseForRound(current.roundNumber);
        const requestedIncrement =
          typeof incrementOverride === "number" && Number.isFinite(incrementOverride)
            ? Math.max(0, incrementOverride)
            : null;
        const increment =
          requestedIncrement ?? EXTREME_PHASE_INCREMENTS[phase] ?? 0;
        const nextValue = clamp01(current.value + increment);
        const reachedCap = nextValue >= 1;

        return {
          value: reachedCap ? 1 : nextValue,
          roundNumber: nextRoundNumber,
          isForced: reachedCap,
        };
      });
    },
    [updateState]
  );

  const consumeForcedExtreme = useCallback(() => {
    updateState((current) => ({
      ...current,
      value: 0,
      isForced: false,
    }));
  }, [updateState]);

  const phase = useMemo(
    () => getExtremePhaseForRound(state.roundNumber),
    [state.roundNumber]
  );

  const getSnapshot = useCallback(() => stateRef.current, []);

  return useMemo(
    () => ({
      value: state.value,
      roundNumber: state.roundNumber,
      isForced: state.isForced,
      phase,
      completeRound,
      setMeterValue,
      setRoundNumber,
      hydrate,
      consumeForcedExtreme,
      getSnapshot,
    }),
    [
      completeRound,
      consumeForcedExtreme,
      hydrate,
      phase,
      setMeterValue,
      setRoundNumber,
      state.isForced,
      state.roundNumber,
      state.value,
      getSnapshot,
    ]
  );
};

export default useExtremeMeter;
