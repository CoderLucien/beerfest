import { createRng } from "../seed-random";
import type { BusinessEvent, EventType } from "@beerfest/domain";
import { PRESET_EVENTS } from "./data/events";

export interface EventStreamConfig {
  durationMs: number;
  seed?: number;
  startTime?: number;
}

export function createEventStream(config: EventStreamConfig) {
  const rng = createRng(config.seed);
  const startTime = config.startTime ?? Date.now();
  const events: BusinessEvent[] = [];
  let paused = false;
  let currentTime = startTime;
  let timerHandle: ReturnType<typeof setInterval> | null = null;

  const traceCounter = { value: 0 };

  function generateTraceId(): string {
    return `trace_${Date.now()}_${traceCounter.value++}`;
  }

  function emit(
    eventType: EventType,
    payload: Record<string, unknown>,
    overrideTime?: number
  ): BusinessEvent {
    const event: BusinessEvent = {
      eventId: `evt_${events.length}_${Date.now()}`,
      eventType,
      payload,
      timestamp: overrideTime ?? currentTime,
      traceId: generateTraceId(),
    };
    events.push(event);
    return event;
  }

  const presets = PRESET_EVENTS.map((e) => ({
    ...e,
    triggerTime: startTime + e.offsetMs,
    fired: false,
  }));

  function start(onEvent?: (event: BusinessEvent) => void): () => void {
    const tickMs = 200;
    const speedMultiplier = (config.durationMs || 360000) / (presets[presets.length - 1]?.offsetMs || 360000);

    timerHandle = setInterval(() => {
      if (paused) return;
      currentTime += tickMs * speedMultiplier;

      for (const preset of presets) {
        if (!preset.fired && currentTime >= preset.triggerTime) {
          preset.fired = true;
          const event = emit(preset.type, preset.payload, preset.triggerTime);
          onEvent?.(event);
        }
      }
    }, tickMs);

    return stop;
  }

  function stop() {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  function pause() {
    paused = true;
  }

  function resume() {
    paused = false;
  }

  function getEvents(since?: number): BusinessEvent[] {
    if (since === undefined) return [...events];
    return events.filter((e) => e.timestamp > since);
  }

  function reset() {
    events.length = 0;
    traceCounter.value = 0;
    currentTime = startTime;
    presets.forEach((p) => (p.fired = false));
  }

  return { start, stop, pause, resume, getEvents, reset, emit, rng };
}
