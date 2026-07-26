import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "research-data", "qgis-source");
const csvDir = path.join(root, "research-data", "csv-source");
const outputDir = path.join(root, "public", "data");
fs.mkdirSync(outputDir, { recursive: true });

function readQgis(name) {
  const raw = fs.readFileSync(path.join(sourceDir, `${name}.js`), "utf8");
  return JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
}

function parseCsv(file) {
  const rows = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = rows[0].split(",");
  return rows.slice(1).map((line) => {
    const values = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) {
        values.push(value);
        value = "";
      } else value += char;
    }
    values.push(value);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function haversine([lngA, latA], [lngB, latB]) {
  const radius = 6371000;
  const lat1 = (latA * Math.PI) / 180;
  const lat2 = (latB * Math.PI) / 180;
  const dLat = ((latB - latA) * Math.PI) / 180;
  const dLng = ((lngB - lngA) * Math.PI) / 180;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, polygon) {
  if (!pointInRing(point, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
}

function bboxForPolygon(polygon) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ring of polygon) {
    for (const [x, y] of ring) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return [minX, minY, maxX, maxY];
}

const boundary = readQgis("camalig_boundary_0");
const flood = readQgis("FloodDatafromProjectNoah_1");
const roads = readQgis("CamaligRoadNetwork_2");
const barangayRows = parseCsv(path.join(csvDir, "barangay_clustering_labels.csv"));
const pointRows = parseCsv(path.join(csvDir, "for_dm.csv"));

const hazardPolygons = [];
for (const feature of flood.features) {
  const risk = Number(feature.properties.Var);
  for (const polygon of feature.geometry.coordinates) {
    hazardPolygons.push({ risk, polygon, bbox: bboxForPolygon(polygon) });
  }
}

function hazardAt(point) {
  let risk = 0;
  for (const item of hazardPolygons) {
    if (item.risk <= risk) continue;
    const [minX, minY, maxX, maxY] = item.bbox;
    if (point[0] < minX || point[0] > maxX || point[1] < minY || point[1] > maxY) continue;
    if (pointInPolygon(point, item.polygon)) risk = item.risk;
  }
  return risk;
}

const allowed = new Set([
  "trunk",
  "primary",
  "secondary",
  "tertiary",
  "residential",
  "unclassified",
  "service",
  "track",
]);
const speedByClass = {
  trunk: 60,
  primary: 50,
  secondary: 45,
  tertiary: 40,
  residential: 25,
  unclassified: 25,
  service: 15,
  track: 12,
};
const nodeIndex = new Map();
const nodes = [];
const graphEdges = [];
const edgeFeatures = [];

function getNode(coord) {
  const key = `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`;
  if (!nodeIndex.has(key)) {
    nodeIndex.set(key, nodes.length);
    nodes.push([Number(coord[0].toFixed(6)), Number(coord[1].toFixed(6))]);
  }
  return nodeIndex.get(key);
}

for (const feature of roads.features) {
  const roadClass = feature.properties.highway;
  if (!allowed.has(roadClass)) continue;
  for (const line of feature.geometry.coordinates) {
    for (let i = 0; i < line.length - 1; i += 1) {
      const fromCoord = line[i];
      const toCoord = line[i + 1];
      const distanceM = haversine(fromCoord, toCoord);
      if (!Number.isFinite(distanceM) || distanceM < 0.2) continue;
      const samples = Math.max(1, Math.ceil(distanceM / 20));
      let hazard = 0;
      for (let sample = 0; sample <= samples; sample += 1) {
        const ratio = sample / samples;
        const point = [
          fromCoord[0] + (toCoord[0] - fromCoord[0]) * ratio,
          fromCoord[1] + (toCoord[1] - fromCoord[1]) * ratio,
        ];
        hazard = Math.max(hazard, hazardAt(point));
      }
      const edge = {
        id: graphEdges.length,
        from: getNode(fromCoord),
        to: getNode(toCoord),
        distanceM: Math.round(distanceM * 10) / 10,
        speedKph: speedByClass[roadClass],
        hazard,
        roadClass,
        name: feature.properties.name || null,
      };
      graphEdges.push(edge);
      edgeFeatures.push({
        type: "Feature",
        id: edge.id,
        properties: {
          edgeId: edge.id,
          hazard,
          roadClass,
          name: edge.name,
        },
        geometry: { type: "LineString", coordinates: [nodes[edge.from], nodes[edge.to]] },
      });
    }
  }
}

const depotRow = pointRows.find((row) => Number(row.label) === 0);
const barangays = barangayRows.map((row) => ({
  id: Number(row.label),
  name: row.barangay,
  zone: row.zone,
  cluster: Number(row.clustering_label),
  population: Number(row.population),
  coordinates: [Number(row.long), Number(row.lat)],
}));

const writeJson = (name, value) =>
  fs.writeFileSync(path.join(outputDir, name), JSON.stringify(value));

writeJson("boundary.geojson", boundary);
writeJson("flood-hazards.geojson", flood);
writeJson("roads.geojson", { type: "FeatureCollection", features: edgeFeatures });
writeJson("routing-graph.json", { nodes, edges: graphEdges });
writeJson("barangays.json", barangays);
writeJson("depot.json", {
  id: 0,
  name: "Camalig Relief Operations Center",
  coordinates: [Number(depotRow.long), Number(depotRow.lat)],
});

console.log(
  `Prepared ${barangays.length} barangays, ${nodes.length} graph nodes, and ${graphEdges.length} road edges.`,
);
