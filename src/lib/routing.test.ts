import { describe, expect, it } from "vitest";
import { optimizeStopOrder, riskMultiplier, RoutingEngine } from "./routing";
import type { Barangay, RoutingGraphData } from "../types";

const graph: RoutingGraphData = {
  nodes: [
    [123.6, 13.1],
    [123.61, 13.1],
    [123.62, 13.1],
    [123.61, 13.11],
  ],
  edges: [
    { id: 0, from: 0, to: 1, distanceM: 1000, speedKph: 30, hazard: 0, roadClass: "residential", name: null },
    { id: 1, from: 1, to: 2, distanceM: 1000, speedKph: 30, hazard: 3, roadClass: "residential", name: null },
    { id: 2, from: 0, to: 3, distanceM: 1400, speedKph: 30, hazard: 1, roadClass: "residential", name: null },
    { id: 3, from: 3, to: 2, distanceM: 1400, speedKph: 30, hazard: 1, roadClass: "residential", name: null },
  ],
};

describe("risk profiles", () => {
  it("blocks high-risk roads for every safety mode", () => {
    expect(riskMultiplier("fastest", 3, true)).toBe(Infinity);
    expect(riskMultiplier("balanced", 3, true)).toBe(Infinity);
    expect(riskMultiplier("safest", 3, true)).toBe(Infinity);
  });

  it("applies balanced and safest penalties exactly", () => {
    expect(riskMultiplier("balanced", 1, true)).toBe(1.5);
    expect(riskMultiplier("balanced", 2, true)).toBe(4);
    expect(riskMultiplier("safest", 1, true)).toBe(5);
    expect(riskMultiplier("safest", 2, true)).toBe(Infinity);
    expect(riskMultiplier("safest", 3, false)).toBe(1);
  });
});

describe("RoutingEngine", () => {
  it("uses the shortest path when the flood scenario is off", () => {
    const result = new RoutingEngine(graph).findPath(graph.nodes[0], graph.nodes[2], "fastest", false, new Set());
    expect(result?.edgeIds).toEqual([0, 1]);
    expect(result?.distanceM).toBe(2000);
  });

  it("routes around high-risk and manually blocked roads", () => {
    const engine = new RoutingEngine(graph);
    const floodRoute = engine.findPath(graph.nodes[0], graph.nodes[2], "fastest", true, new Set());
    expect(floodRoute?.edgeIds).toEqual([2, 3]);
    const noRoute = engine.findPath(graph.nodes[0], graph.nodes[2], "fastest", true, new Set([2]));
    expect(noRoute).toBeNull();
  });

  it("returns a zero-length path when start and end snap to the same node", () => {
    const result = new RoutingEngine(graph).findPath(graph.nodes[0], graph.nodes[0], "balanced", true, new Set());
    expect(result?.distanceM).toBe(0);
    expect(result?.edgeIds).toEqual([]);
  });
});

describe("multi-stop ordering", () => {
  it("orders nearby stops before distant stops", () => {
    const stops: Barangay[] = [
      { id: 2, name: "Far", zone: "east", cluster: 1, population: 1, coordinates: [123.62, 13.1] },
      { id: 1, name: "Near", zone: "east", cluster: 1, population: 1, coordinates: [123.605, 13.1] },
    ];
    expect(optimizeStopOrder([123.6, 13.1], stops).map((stop) => stop.id)).toEqual([1, 2]);
  });
});
