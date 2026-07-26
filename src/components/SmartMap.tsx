import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { Map } from "./ui/map";
import type { AppData } from "../lib/data";
import type { Coordinates, RouteResult } from "../types";

interface SmartMapProps {
  data: AppData;
  route: RouteResult | null;
  floodScenario: boolean;
  blockedEdges: Set<number>;
  closeRoadMode: boolean;
  originPickMode: boolean;
  origin: Coordinates;
  selectedStopIds: number[];
  vehiclePosition: Coordinates | null;
  onCloseRoad: (edgeId: number) => void;
  onPickOrigin: (coordinates: Coordinates) => void;
  onToggleStop: (barangayId: number) => void;
}

export function SmartMap({
  data,
  route,
  floodScenario,
  blockedEdges,
  closeRoadMode,
  originPickMode,
  origin,
  selectedStopIds,
  vehiclePosition,
  onCloseRoad,
  onPickOrigin,
  onToggleStop,
}: SmartMapProps) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const vehicleRef = useRef<maplibregl.Marker | null>(null);
  const originRef = useRef<maplibregl.Marker | null>(null);
  const interactionRef = useRef({ closeRoadMode, originPickMode });
  const callbacksRef = useRef({ onCloseRoad, onPickOrigin });
  interactionRef.current = { closeRoadMode, originPickMode };
  callbacksRef.current = { onCloseRoad, onPickOrigin };

  const selectedSet = useMemo(() => new Set(selectedStopIds), [selectedStopIds]);

  useEffect(() => {
    if (!map) return;
    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = data.barangays.map((barangay) => {
      const element = document.createElement("button");
      const selected = selectedSet.has(barangay.id);
      element.className = `barangay-marker${selected ? " selected" : ""}`;
      element.type = "button";
      element.textContent = String(barangay.id);
      element.setAttribute("aria-label", `${selected ? "Remove" : "Add"} ${barangay.name} mission stop`);
      element.title = `${barangay.name} · ${barangay.population.toLocaleString()} residents`;
      element.onclick = (event) => {
        event.stopPropagation();
        onToggleStop(barangay.id);
      };
      return new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat(barangay.coordinates)
        .setPopup(
          new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(
            `<strong>${barangay.name}</strong><br><span>${barangay.zone.toUpperCase()} · Population ${barangay.population.toLocaleString()}</span>`,
          ),
        )
        .addTo(map);
    });
    return () => markerRefs.current.forEach((marker) => marker.remove());
  }, [data.barangays, map, onToggleStop, selectedSet]);

  useEffect(() => {
    if (!map) return;
    originRef.current?.remove();
    const element = document.createElement("div");
    element.className = "origin-marker";
    element.innerHTML = '<span aria-hidden="true">⌂</span>';
    element.title = "Mission origin";
    originRef.current = new maplibregl.Marker({ element, anchor: "center" }).setLngLat(origin).addTo(map);
  }, [map, origin]);

  useEffect(() => {
    if (!map) return;
    if (!vehiclePosition) {
      vehicleRef.current?.remove();
      vehicleRef.current = null;
      return;
    }
    if (!vehicleRef.current) {
      const element = document.createElement("div");
      element.className = "vehicle-marker";
      element.innerHTML = '<span aria-hidden="true">🚑</span>';
      element.title = "Rescue vehicle";
      vehicleRef.current = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat(vehiclePosition)
        .addTo(map);
    }
    vehicleRef.current.setLngLat(vehiclePosition);
  }, [map, vehiclePosition]);

  useEffect(() => {
    if (!map) return;
    const routeData: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: route
        ? [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: route.coordinates },
            },
          ]
        : [],
    };
    (map.getSource("route") as GeoJSONSource | undefined)?.setData(routeData);
    if (route?.coordinates.length && route.coordinates.length > 1) {
      const bounds = route.coordinates.reduce(
        (value, coordinate) => value.extend(coordinate),
        new maplibregl.LngLatBounds(route.coordinates[0], route.coordinates[0]),
      );
      map.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 700 });
    }
  }, [map, route]);

  useEffect(() => {
    if (!map) return;
    map.setLayoutProperty("flood-low", "visibility", floodScenario ? "visible" : "none");
    map.setLayoutProperty("flood-medium", "visibility", floodScenario ? "visible" : "none");
    map.setLayoutProperty("flood-high", "visibility", floodScenario ? "visible" : "none");
  }, [map, floodScenario]);

  useEffect(() => {
    if (!map) return;
    const blocked = [...blockedEdges];
    map.setPaintProperty("roads", "line-color", [
      "case",
      ["in", ["get", "edgeId"], ["literal", blocked]],
      "#ef4444",
      "#6b827b",
    ]);
    map.setPaintProperty("roads", "line-width", [
      "case",
      ["in", ["get", "edgeId"], ["literal", blocked]],
      4,
      1.4,
    ]);
  }, [map, blockedEdges]);

  function setupMap(readyMap: MapLibreMap) {
    readyMap.addSource("boundary", { type: "geojson", data: data.boundary });
    readyMap.addLayer({
      id: "boundary-fill",
      type: "fill",
      source: "boundary",
      paint: { "fill-color": "#0b5447", "fill-opacity": 0.035 },
    });
    readyMap.addLayer({
      id: "boundary-line",
      type: "line",
      source: "boundary",
      paint: { "line-color": "#087f6e", "line-width": 3, "line-dasharray": [2, 1.5] },
    });
    readyMap.addSource("hazards", { type: "geojson", data: data.hazards });
    const hazardLayers = [
      { id: "flood-low", risk: 1, color: "#3b82f6" },
      { id: "flood-medium", risk: 2, color: "#f5b942" },
      { id: "flood-high", risk: 3, color: "#ef5b54" },
    ];
    for (const layer of hazardLayers) {
      readyMap.addLayer({
        id: layer.id,
        type: "fill",
        source: "hazards",
        filter: ["==", ["get", "Var"], layer.risk],
        layout: { visibility: floodScenario ? "visible" : "none" },
        paint: {
          "fill-color": layer.color,
          "fill-opacity": layer.risk === 3 ? 0.42 : 0.3,
          "fill-outline-color": layer.color,
        },
      });
    }
    readyMap.addSource("roads", { type: "geojson", data: data.roads, promoteId: "edgeId" });
    readyMap.addLayer({
      id: "roads",
      type: "line",
      source: "roads",
      paint: { "line-color": "#6b827b", "line-width": 1.4, "line-opacity": 0.78 },
    });
    readyMap.addSource("route", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    readyMap.addLayer({
      id: "route-halo",
      type: "line",
      source: "route",
      paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": 0.88 },
    });
    readyMap.addLayer({
      id: "route",
      type: "line",
      source: "route",
      paint: { "line-color": "#0f766e", "line-width": 6 },
    });
    readyMap.on("mouseenter", "roads", () => {
      readyMap.getCanvas().style.cursor = interactionRef.current.closeRoadMode ? "crosshair" : "";
    });
    readyMap.on("mouseleave", "roads", () => {
      readyMap.getCanvas().style.cursor = interactionRef.current.originPickMode ? "crosshair" : "";
    });
    readyMap.on("click", (event) => {
      if (interactionRef.current.originPickMode) {
        callbacksRef.current.onPickOrigin([event.lngLat.lng, event.lngLat.lat]);
        return;
      }
      if (!interactionRef.current.closeRoadMode) return;
      const features = readyMap.queryRenderedFeatures(event.point, { layers: ["roads"] });
      const edgeId = Number(features[0]?.properties?.edgeId);
      if (Number.isFinite(edgeId)) callbacksRef.current.onCloseRoad(edgeId);
    });
    setMap(readyMap);
  }

  return (
    <div className={`map-shell${closeRoadMode || originPickMode ? " interaction-active" : ""}`}>
      <Map
        center={[123.629, 13.14]}
        zoom={11.3}
        minZoom={10}
        maxZoom={19}
        maxBounds={[
          [123.54, 13.02],
          [123.72, 13.24],
        ]}
        onMapReady={setupMap}
        className="map-canvas"
      />
      <div className="map-mode-chip" aria-live="polite">
        {originPickMode
          ? "Click the map to set your origin"
          : closeRoadMode
            ? "Click a road segment to close or reopen it"
            : "Click a barangay marker to add a delivery stop"}
      </div>
      {floodScenario && (
        <div className="hazard-legend">
          <strong>NOAH flood susceptibility</strong>
          <span><i className="hazard-dot low" /> Low</span>
          <span><i className="hazard-dot medium" /> Medium</span>
          <span><i className="hazard-dot high" /> High</span>
        </div>
      )}
    </div>
  );
}
