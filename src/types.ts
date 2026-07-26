export type Coordinates = [number, number];
export type HazardLevel = 0 | 1 | 2 | 3;
export type SafetyMode = "fastest" | "balanced" | "safest";
export type MissionStatus = "draft" | "planned" | "running" | "paused" | "completed";

export interface Barangay {
  id: number;
  name: string;
  zone: string;
  cluster: number;
  population: number;
  coordinates: Coordinates;
}

export interface RoadEdge {
  id: number;
  from: number;
  to: number;
  distanceM: number;
  speedKph: number;
  hazard: HazardLevel;
  roadClass: string;
  name: string | null;
}

export interface RoutingGraphData {
  nodes: Coordinates[];
  edges: RoadEdge[];
}

export interface MissionStop {
  barangayId: number;
  goods: number;
}

export interface MissionPlan {
  id: string;
  createdAt: string;
  origin: Coordinates;
  originLabel: string;
  stops: MissionStop[];
  vehicleCapacity: number;
  safetyMode: SafetyMode;
  floodScenario: boolean;
  status: MissionStatus;
  route?: RouteResult;
}

export interface RouteLeg {
  fromLabel: string;
  toLabel: string;
  coordinates: Coordinates[];
  edgeIds: number[];
  distanceM: number;
  durationS: number;
  exposedM: number;
}

export interface RouteResult {
  coordinates: Coordinates[];
  edgeIds: number[];
  legs: RouteLeg[];
  orderedStopIds: number[];
  distanceM: number;
  durationS: number;
  exposedM: number;
}

export interface WeatherObservation {
  currentPrecipitationMm: number;
  sixHourForecastMm: number;
  observedAt: string;
  fetchedAt: string;
  source: "live" | "cache";
}

export interface SimulationState {
  status: MissionStatus;
  progress: number;
  elapsedS: number;
  currentLeg: number;
  deliveredStopIds: number[];
  speedMultiplier: number;
}
