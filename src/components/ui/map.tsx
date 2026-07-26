import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapLibreMap, type MapOptions } from "maplibre-gl";

const smartRStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "openstreetmap": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [{ id: "openstreetmap", type: "raster", source: "openstreetmap" }],
};

interface MapProps extends Omit<MapOptions, "container" | "style"> {
  className?: string;
  onMapReady?: (map: MapLibreMap) => void;
}

export function Map({ className, onMapReady, ...options }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const readyRef = useRef(onMapReady);
  readyRef.current = onMapReady;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: smartRStyle,
      attributionControl: false,
      ...options,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.once("load", () => readyRef.current?.(map));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Map construction intentionally happens once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} aria-label="Interactive rescue routing map" />;
}
