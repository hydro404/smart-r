import type { Barangay, Coordinates, RoutingGraphData } from "../types";

export interface Depot {
  id: number;
  name: string;
  coordinates: Coordinates;
}

export interface AppData {
  barangays: Barangay[];
  depot: Depot;
  graph: RoutingGraphData;
  roads: GeoJSON.FeatureCollection;
  boundary: GeoJSON.FeatureCollection;
  hazards: GeoJSON.FeatureCollection;
}

export async function loadAppData(): Promise<AppData> {
  const [barangays, depot, graph, roads, boundary, hazards] = await Promise.all([
    fetch("/data/barangays.json").then(assertJson),
    fetch("/data/depot.json").then(assertJson),
    fetch("/data/routing-graph.json").then(assertJson),
    fetch("/data/roads.geojson").then(assertJson),
    fetch("/data/boundary.geojson").then(assertJson),
    fetch("/data/flood-hazards.geojson").then(assertJson),
  ]);
  return {
    barangays: barangays as Barangay[],
    depot: depot as Depot,
    graph: graph as RoutingGraphData,
    roads: roads as GeoJSON.FeatureCollection,
    boundary: boundary as GeoJSON.FeatureCollection,
    hazards: hazards as GeoJSON.FeatureCollection,
  };
}

async function assertJson(response: Response) {
  if (!response.ok) throw new Error(`Data asset failed to load (${response.status})`);
  return response.json();
}
