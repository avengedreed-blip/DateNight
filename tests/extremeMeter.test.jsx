import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import useExtremeMeter, {
  EXTREME_PHASES,
  getExtremePhaseForRound,
} from "../src/hooks/useExtremeMeter";

describe("extreme meter progression", () => {
  it("transitions through phases based on round count", () => {
    expect(getExtremePhaseForRound(0)).toBe(EXTREME_PHASES.EARLY);
    expect(getExtremePhaseForRound(6)).toBe(EXTREME_PHASES.MID);
    expect(getExtremePhaseForRound(20)).toBe(EXTREME_PHASES.LATE);
  });

  it("increments gradually until a forced extreme is triggered", () => {
    const { result } = renderHook(() => useExtremeMeter());

    act(() => {
      result.current.completeRound();
    });
    const afterFirst = result.current.value;
    expect(afterFirst).toBeGreaterThan(0);
    expect(result.current.isForced).toBe(false);

    act(() => {
      result.current.setMeterValue(1);
    });
    expect(result.current.isForced).toBe(true);

    act(() => {
      result.current.completeRound({ triggeredByMeter: true });
    });

    expect(result.current.value).toBe(0);
    expect(result.current.isForced).toBe(false);
  });

  it("resets random extreme rounds without clearing the meter progress", () => {
    const { result } = renderHook(() => useExtremeMeter({ initialValue: 0.6 }));

    act(() => {
      result.current.completeRound({ triggeredByMeter: false });
    });

    expect(result.current.value).toBeGreaterThan(0.6);
    expect(result.current.isForced).toBe(false);

    act(() => {
      result.current.consumeForcedExtreme();
    });

    expect(result.current.value).toBe(0);
    expect(result.current.isForced).toBe(false);
  });
});
