import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import "./Wheel.css";

export const SLICE_LABELS = ["Truth", "Dare", "Trivia"];
export const POINTER_ANGLE = 270;

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 28;
const MIN_EXTRA_SPINS = 3;
const MAX_EXTRA_SPINS = 6;
const MIN_SPIN_DURATION = 3000;
const MAX_SPIN_DURATION = 5000;
const MIN_SWIPE_FACTOR = 0.2;
const VELOCITY_SCALE = 0.35;
const EASE_OUT_CUBIC = "cubic-bezier(0.215, 0.61, 0.355, 1)";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const normalizeAngle = (angle) => ((angle % 360) + 360) % 360;
const toDegrees = (radians) => (radians * 180) / Math.PI;
const normalizeRadians = (radians) => {
  let value = radians;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
};

const normalizeSlices = (input) => {
  const source = Array.isArray(input) ? input : [];
  const limited = source.slice(0, 3);
  if (limited.length === 0) {
    return SLICE_LABELS.map((label) => ({ label, value: label }));
  }
  return limited.map((slice, index) => {
    if (typeof slice === "string") {
      return { label: slice, value: slice, index };
    }
    if (typeof slice === "object" && slice !== null) {
      const label =
        typeof slice.label === "string"
          ? slice.label
          : typeof slice.name === "string"
          ? slice.name
          : typeof slice.title === "string"
          ? slice.title
          : String(slice.value ?? `Slice ${index + 1}`);
      return { ...slice, label };
    }
    return { label: String(slice), value: slice, index };
  });
};

const WheelComponent = forwardRef(
  (
    {
      slices = SLICE_LABELS,
      pointerAngle = POINTER_ANGLE,
      minSpinDuration = MIN_SPIN_DURATION,
      maxSpinDuration = MAX_SPIN_DURATION,
      minExtraSpins = MIN_EXTRA_SPINS,
      maxExtraSpins = MAX_EXTRA_SPINS,
      enableSwipe = true,
      onSpinStart,
      onSpinEnd,
      initialRotation = 0,
    },
    ref
  ) => {
    const wheelRef = useRef(null);
    const rotationRef = useRef(initialRotation);
    const pendingIndexRef = useRef(null);
    const lockRef = useRef(false);
    const endHandlerRef = useRef(onSpinEnd ?? null);
    const pointerStateRef = useRef(null);
    const bounceTimeoutRef = useRef(null);

    const [rotation, setRotation] = useState(initialRotation);
    const [transitionMs, setTransitionMs] = useState(minSpinDuration);
    const [isSpinning, setIsSpinning] = useState(false);
    const [bounce, setBounce] = useState(false);

    const normalizedSlices = useMemo(() => normalizeSlices(slices), [slices]);

    const sliceCenters = useMemo(() => {
      const count = normalizedSlices.length || 1;
      const sliceSize = 360 / count;
      return normalizedSlices.map(
        (_, index) => -90 + sliceSize * index + sliceSize / 2
      );
    }, [normalizedSlices]);

    useEffect(() => {
      endHandlerRef.current = onSpinEnd ?? null;
    }, [onSpinEnd]);

    useEffect(() => () => {
      if (bounceTimeoutRef.current) {
        clearTimeout(bounceTimeoutRef.current);
      }
    }, []);

    const computeFontSize = useCallback((label) => {
      if (!label) return MIN_FONT_SIZE;
      const lengthAdjustment = Math.max(label.length - 8, 0);
      const dynamic = MAX_FONT_SIZE - lengthAdjustment * 1.4;
      return clamp(dynamic, MIN_FONT_SIZE, MAX_FONT_SIZE);
    }, []);

    const finishSpin = useCallback(
      (index) => {
        if (typeof index !== "number") return;
        const slice = normalizedSlices[index];
        const result = {
          index,
          label: slice?.label ?? "",
          slice,
          category: slice?.category,
          isExtreme:
            typeof slice?.category === "string"
              ? slice.category.toLowerCase() === "extreme"
              : /extreme/i.test(slice?.label ?? ""),
        };

        lockRef.current = false;
        setIsSpinning(false);
        setBounce(true);
        if (bounceTimeoutRef.current) {
          clearTimeout(bounceTimeoutRef.current);
        }
        bounceTimeoutRef.current = setTimeout(() => setBounce(false), 500);

        const externalHandler = endHandlerRef.current;
        if (typeof externalHandler === "function") {
          externalHandler(result);
        }
        if (typeof onSpinEnd === "function" && externalHandler !== onSpinEnd) {
          onSpinEnd(result);
        }
      },
      [normalizedSlices, onSpinEnd]
    );

    useEffect(() => {
      const element = wheelRef.current;
      if (!element) return undefined;

      const handleTransitionEnd = (event) => {
        if (event.propertyName !== "transform") return;
        const index = pendingIndexRef.current;
        pendingIndexRef.current = null;
        finishSpin(index);
      };

      element.addEventListener("transitionend", handleTransitionEnd);
      return () => element.removeEventListener("transitionend", handleTransitionEnd);
    }, [finishSpin]);

    const planSpin = useCallback(
      ({ targetIndex, direction, speedFactor }) => {
        const count = normalizedSlices.length;
        if (count === 0) return null;

        const selectedIndex =
          typeof targetIndex === "number" &&
          targetIndex >= 0 &&
          targetIndex < count
            ? Math.floor(targetIndex)
            : Math.floor(Math.random() * count);

        const safeDirection = direction === "ccw" ? "ccw" : "cw";
        const factor = clamp(speedFactor ?? Math.random(), 0, 1);

        const extraBase =
          minExtraSpins + factor * (maxExtraSpins - minExtraSpins);
        const extraSpins = clamp(
          Math.round(extraBase),
          minExtraSpins,
          maxExtraSpins
        );

        const durationBase =
          minSpinDuration + factor * (maxSpinDuration - minSpinDuration);
        const duration = clamp(
          Math.round(durationBase),
          minSpinDuration,
          maxSpinDuration
        );

        const center = sliceCenters[selectedIndex];
        const pointerTarget = normalizeAngle(pointerAngle - center);
        const baseMod = normalizeAngle(rotationRef.current);

        let delta = pointerTarget - baseMod;
        if (safeDirection === "ccw") {
          if (delta > 0) {
            delta -= 360;
          }
          delta -= extraSpins * 360;
        } else {
          if (delta < 0) {
            delta += 360;
          }
          delta += extraSpins * 360;
        }

        const nextRotation = rotationRef.current + delta;
        return {
          index: selectedIndex,
          rotation: nextRotation,
          duration,
        };
      },
      [
        normalizedSlices,
        sliceCenters,
        pointerAngle,
        minExtraSpins,
        maxExtraSpins,
        minSpinDuration,
        maxSpinDuration,
      ]
    );

    const executeSpinPlan = useCallback(
      (plan) => {
        if (!plan) return null;
        lockRef.current = true;
        pendingIndexRef.current = plan.index;
        rotationRef.current = plan.rotation;
        setTransitionMs(plan.duration);
        setIsSpinning(true);
        if (typeof onSpinStart === "function") {
          const slice = normalizedSlices[plan.index];
          onSpinStart({ index: plan.index, slice });
        }
        requestAnimationFrame(() => {
          setRotation(plan.rotation);
        });
        return plan;
      },
      [normalizedSlices, onSpinStart]
    );

    const spinWheel = useCallback(
      (options = {}) => {
        if (lockRef.current) return null;
        const plan = planSpin({
          targetIndex: options.targetIndex,
          direction: options.direction,
          speedFactor:
            typeof options.speedFactor === "number"
              ? options.speedFactor
              : options.velocityFactor,
        });
        return executeSpinPlan(plan);
      },
      [executeSpinPlan, planSpin]
    );

    const handleSwipeInternal = useCallback(
      (event) => {
        if (!event || lockRef.current) return null;
        const rawVelocity =
          typeof event.velocity === "number" ? Math.abs(event.velocity) : 0;
        const normalizedVelocity = clamp(
          rawVelocity / VELOCITY_SCALE,
          MIN_SWIPE_FACTOR,
          1
        );
        const plan = planSpin({
          targetIndex: event.targetIndex,
          direction: event.direction,
          speedFactor: normalizedVelocity,
        });
        return executeSpinPlan(plan);
      },
      [executeSpinPlan, planSpin]
    );

    useImperativeHandle(
      ref,
      () => ({
        spinWheel,
        handleSwipe: handleSwipeInternal,
        onSpinEnd: (handler) => {
          endHandlerRef.current =
            typeof handler === "function" ? handler : null;
        },
        isLocked: () => lockRef.current,
      }),
      [handleSwipeInternal, spinWheel]
    );

    useEffect(() => {
      const element = wheelRef.current;
      if (!element || !enableSwipe) return undefined;

      const handlePointerDown = (event) => {
        if (lockRef.current) return;
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const startAngle = Math.atan2(
          event.clientY - centerY,
          event.clientX - centerX
        );
        pointerStateRef.current = {
          pointerId: event.pointerId,
          centerX,
          centerY,
          startAngle,
          lastAngle: startAngle,
          startTime: performance.now(),
          lastTime: performance.now(),
        };
        element.setPointerCapture?.(event.pointerId);
      };

      const handlePointerMove = (event) => {
        const state = pointerStateRef.current;
        if (!state || state.pointerId !== event.pointerId) return;
        const now = performance.now();
        state.lastAngle = Math.atan2(
          event.clientY - state.centerY,
          event.clientX - state.centerX
        );
        state.lastTime = now;
      };

      const finalizeSwipe = (event) => {
        const state = pointerStateRef.current;
        if (!state || state.pointerId !== event.pointerId) return;
        pointerStateRef.current = null;
        element.releasePointerCapture?.(event.pointerId);
        const endAngle = state.lastAngle ?? state.startAngle;
        const endTime = state.lastTime ?? performance.now();
        const deltaRadians = normalizeRadians(endAngle - state.startAngle);
        const deltaDegrees = toDegrees(deltaRadians);
        const elapsed = Math.max(endTime - state.startTime, 16);
        const magnitude = Math.abs(deltaDegrees);

        if (magnitude < 6) {
          spinWheel({ direction: "cw", speedFactor: MIN_SWIPE_FACTOR });
          return;
        }

        const velocity = magnitude / elapsed;
        const direction = deltaDegrees >= 0 ? "ccw" : "cw";
        handleSwipeInternal({ velocity, direction });
      };

      element.addEventListener("pointerdown", handlePointerDown);
      element.addEventListener("pointermove", handlePointerMove);
      element.addEventListener("pointerup", finalizeSwipe);
      element.addEventListener("pointercancel", finalizeSwipe);

      return () => {
        element.removeEventListener("pointerdown", handlePointerDown);
        element.removeEventListener("pointermove", handlePointerMove);
        element.removeEventListener("pointerup", finalizeSwipe);
        element.removeEventListener("pointercancel", finalizeSwipe);
      };
    }, [enableSwipe, handleSwipeInternal, spinWheel]);

    const wheelStyle = useMemo(
      () => ({
        transform: `rotate(${rotation}deg)`,
        transitionDuration: `${transitionMs}ms`,
        transitionTimingFunction: EASE_OUT_CUBIC,
      }),
      [rotation, transitionMs]
    );

    const sliceCount = normalizedSlices.length;
    const separatorAngles = useMemo(
      () =>
        Array.from({ length: sliceCount }, (_, index) =>
          (index * 360) / sliceCount
        ),
      [sliceCount]
    );

    return (
      <div className="wheel-container wheel-wrap">
        <div className="wheel-pointer" />
        <div
          ref={wheelRef}
          className={`wheel ${isSpinning ? "spinning" : ""} ${
            bounce ? "wheel-bounce" : ""
          }`}
          style={wheelStyle}
          role="presentation"
        >
          {separatorAngles.map((deg, index) => (
            <div
              key={`separator-${index}`}
              className="wheel-separator separator"
              style={{ transform: `rotate(${deg}deg)` }}
            />
          ))}
          {normalizedSlices.map((slice, index) => {
            const center = sliceCenters[index];
            const fontSize = computeFontSize(slice.label);
            return (
              <div
                key={slice.id ?? slice.label ?? index}
                className="label"
                style={{
                  transform: `rotate(${center}deg) translateY(calc(-1 * var(--labelRadius))) rotate(${-center}deg)`,
                  fontSize: `${fontSize}px`,
                  fontWeight: 700,
                  color: "#ffffff",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  maxWidth: "calc(var(--labelRadius) * 1.45)",
                  width: "calc(var(--labelRadius) * 1.45)",
                  lineHeight: 1.2,
                  padding: "0 4px",
                  whiteSpace: "normal",
                }}
              >
                <span style={{ display: "block", width: "100%" }}>
                  {slice.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

WheelComponent.displayName = "Wheel";

export default memo(WheelComponent);
