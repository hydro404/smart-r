import { haversine } from "./geo";
import type {
  Barangay,
  Coordinates,
  MissionStop,
  RoadEdge,
  RouteLeg,
  RouteResult,
  RoutingGraphData,
  SafetyMode,
} from "../types";

interface AdjacentEdge {
  node: number;
  edge: RoadEdge;
}

interface QueueItem {
  node: number;
  priority: number;
}

class MinHeap {
  private values: QueueItem[] = [];

  get size() {
    return this.values.length;
  }

  push(item: QueueItem) {
    this.values.push(item);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.values[parent].priority <= item.priority) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = item;
  }

  pop() {
    const first = this.values[0];
    const last = this.values.pop();
    if (!this.values.length || !last) return first;
    this.values[0] = last;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < this.values.length && this.values[left].priority < this.values[smallest].priority) smallest = left;
      if (right < this.values.length && this.values[right].priority < this.values[smallest].priority) smallest = right;
      if (smallest === index) break;
      [this.values[index], this.values[smallest]] = [this.values[smallest], this.values[index]];
      index = smallest;
    }
    return first;
  }
}

export function riskMultiplier(mode: SafetyMode, hazard: number, floodScenario: boolean) {
  if (!floodScenario || hazard === 0) return 1;
  if (hazard === 3) return Infinity;
  if (mode === "fastest") return 1;
  if (mode === "balanced") return hazard === 2 ? 4 : 1.5;
  if (hazard === 2) return Infinity;
  return 5;
}

export class RoutingEngine {
  private readonly adjacency: AdjacentEdge[][];
  private readonly connectedNodes: number[];

  constructor(private readonly graph: RoutingGraphData) {
    this.adjacency = Array.from({ length: graph.nodes.length }, () => []);
    for (const edge of graph.edges) {
      this.adjacency[edge.from].push({ node: edge.to, edge });
      this.adjacency[edge.to].push({ node: edge.from, edge });
    }
    this.connectedNodes = this.findLargestComponent();
  }

  private findLargestComponent() {
    const seen = new Uint8Array(this.graph.nodes.length);
    let largest: number[] = [];
    for (let start = 0; start < this.graph.nodes.length; start += 1) {
      if (seen[start]) continue;
      const component: number[] = [];
      const stack = [start];
      seen[start] = 1;
      while (stack.length) {
        const node = stack.pop()!;
        component.push(node);
        for (const next of this.adjacency[node]) {
          if (!seen[next.node]) {
            seen[next.node] = 1;
            stack.push(next.node);
          }
        }
      }
      if (component.length > largest.length) largest = component;
    }
    return largest;
  }

  snap(point: Coordinates) {
    let bestNode = this.connectedNodes[0] ?? 0;
    let bestDistance = Infinity;
    for (const node of this.connectedNodes) {
      const distance = haversine(point, this.graph.nodes[node]);
      if (distance < bestDistance) {
        bestNode = node;
        bestDistance = distance;
      }
    }
    return { node: bestNode, coordinates: this.graph.nodes[bestNode], distanceM: bestDistance };
  }

  findPath(
    origin: Coordinates,
    destination: Coordinates,
    mode: SafetyMode,
    floodScenario: boolean,
    blockedEdges: Set<number>,
  ) {
    const start = this.snap(origin).node;
    const target = this.snap(destination).node;
    if (start === target) {
      return { coordinates: [this.graph.nodes[start]], edgeIds: [], distanceM: 0, durationS: 0, exposedM: 0 };
    }

    const costs = new Float64Array(this.graph.nodes.length);
    costs.fill(Infinity);
    costs[start] = 0;
    const previousNode = new Int32Array(this.graph.nodes.length);
    const previousEdge = new Int32Array(this.graph.nodes.length);
    previousNode.fill(-1);
    previousEdge.fill(-1);
    const queue = new MinHeap();
    queue.push({ node: start, priority: 0 });

    while (queue.size) {
      const current = queue.pop()!;
      if (current.node === target) break;
      const heuristicAtCurrent = haversine(this.graph.nodes[current.node], this.graph.nodes[target]) / 16.67;
      if (current.priority > costs[current.node] + heuristicAtCurrent + 0.001) continue;

      for (const adjacent of this.adjacency[current.node]) {
        if (blockedEdges.has(adjacent.edge.id)) continue;
        const multiplier = riskMultiplier(mode, adjacent.edge.hazard, floodScenario);
        if (!Number.isFinite(multiplier)) continue;
        const travelSeconds = adjacent.edge.distanceM / (adjacent.edge.speedKph / 3.6);
        const nextCost = costs[current.node] + travelSeconds * multiplier;
        if (nextCost >= costs[adjacent.node]) continue;
        costs[adjacent.node] = nextCost;
        previousNode[adjacent.node] = current.node;
        previousEdge[adjacent.node] = adjacent.edge.id;
        const heuristic = haversine(this.graph.nodes[adjacent.node], this.graph.nodes[target]) / 16.67;
        queue.push({ node: adjacent.node, priority: nextCost + heuristic });
      }
    }

    if (previousNode[target] === -1) return null;
    const nodes = [];
    const edgeIds = [];
    let cursor = target;
    while (cursor !== start) {
      nodes.push(cursor);
      edgeIds.push(previousEdge[cursor]);
      cursor = previousNode[cursor];
    }
    nodes.push(start);
    nodes.reverse();
    edgeIds.reverse();
    const edges = edgeIds.map((id) => this.graph.edges[id]);
    return {
      coordinates: nodes.map((node) => this.graph.nodes[node]),
      edgeIds,
      distanceM: edges.reduce((sum, edge) => sum + edge.distanceM, 0),
      durationS: edges.reduce((sum, edge) => sum + edge.distanceM / (edge.speedKph / 3.6), 0),
      exposedM: edges.reduce((sum, edge) => sum + (edge.hazard > 0 ? edge.distanceM : 0), 0),
    };
  }

  planMission(
    origin: Coordinates,
    originLabel: string,
    stops: MissionStop[],
    barangays: Barangay[],
    mode: SafetyMode,
    floodScenario: boolean,
    blockedEdges: Set<number>,
  ): RouteResult | null {
    const stopBarangays = stops
      .map((stop) => barangays.find((barangay) => barangay.id === stop.barangayId))
      .filter((barangay): barangay is Barangay => Boolean(barangay));
    if (!stopBarangays.length) return null;
    const ordered = optimizeStopOrder(origin, stopBarangays);
    const legs: RouteLeg[] = [];
    let from = origin;
    let fromLabel = originLabel;
    for (const stop of ordered) {
      const path = this.findPath(from, stop.coordinates, mode, floodScenario, blockedEdges);
      if (!path) return null;
      legs.push({ ...path, fromLabel, toLabel: stop.name });
      from = stop.coordinates;
      fromLabel = stop.name;
    }
    return {
      coordinates: legs.flatMap((leg, index) => (index ? leg.coordinates.slice(1) : leg.coordinates)),
      edgeIds: legs.flatMap((leg) => leg.edgeIds),
      legs,
      orderedStopIds: ordered.map((stop) => stop.id),
      distanceM: legs.reduce((sum, leg) => sum + leg.distanceM, 0),
      durationS: legs.reduce((sum, leg) => sum + leg.durationS, 0),
      exposedM: legs.reduce((sum, leg) => sum + leg.exposedM, 0),
    };
  }
}

export function optimizeStopOrder(origin: Coordinates, stops: Barangay[]) {
  if (stops.length <= 1) return [...stops];
  const remaining = [...stops];
  const route: Barangay[] = [];
  let current = origin;
  while (remaining.length) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const distance = haversine(current, remaining[index].coordinates);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    const [next] = remaining.splice(bestIndex, 1);
    route.push(next);
    current = next.coordinates;
  }

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i += 1) {
      for (let j = i + 1; j < route.length; j += 1) {
        const candidate = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
        if (orderDistance(origin, candidate) + 0.1 < orderDistance(origin, route)) {
          route.splice(0, route.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return route;
}

function orderDistance(origin: Coordinates, stops: Barangay[]) {
  let total = 0;
  let current = origin;
  for (const stop of stops) {
    total += haversine(current, stop.coordinates);
    current = stop.coordinates;
  }
  return total;
}
