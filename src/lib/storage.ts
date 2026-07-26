import type { MissionPlan } from "../types";

export const MISSION_STORAGE_KEY = "smart-r:missions:v1";

export function loadMissionHistory(): MissionPlan[] {
  try {
    const value = localStorage.getItem(MISSION_STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMissionHistory(missions: MissionPlan[]) {
  localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(missions.slice(0, 20)));
}

export function clearMissionHistory() {
  localStorage.removeItem(MISSION_STORAGE_KEY);
}
