import { beforeEach, describe, expect, it } from "vitest";
import { clearMissionHistory, loadMissionHistory, MISSION_STORAGE_KEY, saveMissionHistory } from "./storage";
import type { MissionPlan } from "../types";

const mission: MissionPlan = {
  id: "mission-1",
  createdAt: "2026-07-26T00:00:00.000Z",
  origin: [123.65, 13.18],
  originLabel: "Depot",
  stops: [{ barangayId: 1, goods: 100 }],
  vehicleCapacity: 200,
  safetyMode: "balanced",
  floodScenario: true,
  status: "completed",
};

describe("mission history", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips versioned local history", () => {
    saveMissionHistory([mission]);
    expect(loadMissionHistory()).toEqual([mission]);
    expect(localStorage.getItem(MISSION_STORAGE_KEY)).toContain("mission-1");
  });

  it("recovers safely from malformed storage", () => {
    localStorage.setItem(MISSION_STORAGE_KEY, "{broken");
    expect(loadMissionHistory()).toEqual([]);
  });

  it("clears saved history", () => {
    saveMissionHistory([mission]);
    clearMissionHistory();
    expect(loadMissionHistory()).toEqual([]);
  });
});
