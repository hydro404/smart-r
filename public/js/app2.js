let selectedRoutes = {};
let analyzedSegments = [];
let blockedSegments = new Set();
let barangayData = []; // for barangay info
let barangayMarkers = []; // ← track markers for clearing
let legendControl;
let roadNetworkMarkers = [];
let barangayPointMarkers = [];

/* ------------------ Map Setup ------------------ */
const map = L.map("map").setView([13.18669, 123.659158], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OSM",
}).addTo(map);

const homeButton = L.control({ position: "bottomleft" });

homeButton.onAdd = function (map) {
  const div = L.DomUtil.create(
    "div",
    "leaflet-bar leaflet-control leaflet-control-custom"
  );

  div.innerHTML = `
    <a href="/" title="Go Home" 
      style="
        background:#1b5e20;
        color:#fff;
        cursor:pointer;
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:16px;
        line-height:1;
        text-decoration:none;
        border-radius:4px;
      " class="p-2 btn btn-primary">
      Go Home
    </a>
  `;

  // Prevent map drag when clicking
  L.DomEvent.disableClickPropagation(div);
  return div;
};

// Add home button to the map
homeButton.addTo(map);

/* ------------------ Flood Heatmap Layer ------------------ */
const FLOOD_COORDS = {
  HIGH: [
    [13.1663752, 123.6390575],
    [13.1633786, 123.62531],
    [13.1778072, 123.6548366],
    [13.1833199, 123.6609898],
    [13.1911754, 123.6550448],
    [13.1800698, 123.6711842],
    [13.1958818, 123.6404964],
    [13.1575537, 123.6215714],
    [13.157542, 123.621614],
  ],
  MEDIUM: [
    [13.16943082, 123.64861903],
    [13.1879272, 123.6630409],
    [13.1946542, 123.6452255],
    [13.160699, 123.6323987],
    [13.1768422, 123.6508674],
  ],
  LOW: [
    [13.1779755, 123.6433904],
    [13.1796393, 123.6540673],
    [13.181276, 123.6541214],
    [13.1785292, 123.6528645],
    [13.1831296, 123.6590014],
    [13.187379, 123.6605608],
    [13.187042, 123.653694],
  ],
};

const floodPoints = [];
// Lower the LOW intensity further to emphasize blue
FLOOD_COORDS.HIGH.forEach((coord) => floodPoints.push([...coord, 1.0]));
FLOOD_COORDS.MEDIUM.forEach((coord) => floodPoints.push([...coord, 0.6]));
FLOOD_COORDS.LOW.forEach((coord) => floodPoints.push([...coord, 0.1])); // changed from 0.3 to 0.1

const floodHeat = L.heatLayer(floodPoints, {
  radius: 45,
  blur: 15,
  minOpacity: 0.4,
  maxZoom: 17,
  max: 1.0,
  // Adjust gradient so blue shows clearly for low values
  gradient: {
    0.0: "blue", // deep blue for lowest
    0.3: "cyan", // transition tone
    0.5: "yellow", // medium
    0.8: "orange", // high-medium
    1.0: "red", // highest
  },
}).addTo(map);

// ✅ Flood Risk Legend
const floodLegend = L.control({ position: "topright" });

floodLegend.onAdd = function (map) {
  const div = L.DomUtil.create(
    "div",
    "info legend bg-white p-2 rounded shadow-sm"
  );

  div.innerHTML = `
    <strong>Flood Risk Legend</strong><br>
    <i style="background: blue; width: 18px; height: 18px; display: inline-block; margin-right: 6px;"></i> Low Risk<br>
    <i style="background: yellow; width: 18px; height: 18px; display: inline-block; margin-right: 6px;"></i> Medium Risk<br>
    <i style="background: red; width: 18px; height: 18px; display: inline-block; margin-right: 6px;"></i> High Risk
    <hr class="my-2">
    <div style="font-size: 0.9rem;">
      <strong>Marker Legend</strong><br>
      <div style="display: flex; align-items: center; margin-bottom: 4px;">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #007bff; border: 1px solid #999; margin-right: 6px;"></div>
        Blue circles — Barangay centroids
      </div>
      <div style="display: flex; align-items: center;">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #d9534f; border: 1px solid #999; margin-right: 6px;"></div>
        Red circles — Road network points
      </div>
    </div>
  `;

  return div;
};

floodLegend.addTo(map);

// ✅ Toggle Flood Heatmap visibility
document
  .getElementById("toggleFloodPoints")
  .addEventListener("change", function () {
    if (this.checked) {
      map.addLayer(floodHeat);
    } else {
      map.removeLayer(floodHeat);
    }
  });

window.addEventListener("resize", () => map.invalidateSize());

// 🧭 Barangay legend toggle handler
document.getElementById("toggleLegend").addEventListener("change", (e) => {
  const isChecked = e.target.checked;

  if (!isChecked) {
    // ❌ Only remove legend control (keep markers)
    if (legendControl) map.removeControl(legendControl);
  } else {
    // ✅ Re-render the legend (without touching markers)
    const currentZone = zoneSelect.value || zones[0];
    renderBarangayLegend(currentZone, true);
  }
});
document
  .getElementById("toggleFloodRiskLegend")
  .addEventListener("change", (e) => {
    const isChecked = e.target.checked;

    if (!isChecked) {
      // ❌ Remove legend from map (but keep layers visible)
      if (floodLegend) map.removeControl(floodLegend);
    } else {
      // ✅ Re-add the legend to the map
      floodLegend.addTo(map);
    }
  });

const toggleBarangayCheckbox = document.getElementById("toggleBarangayPoints");
const toggleRoadCheckbox = document.getElementById("toggleRoadNetwork");

toggleBarangayCheckbox.addEventListener("change", (e) => {
  const show = e.target.checked;
  barangayPointMarkers.forEach((m) => {
    if (show) m.addTo(map);
    else map.removeLayer(m);
  });
});

toggleRoadCheckbox.addEventListener("change", (e) => {
  const show = e.target.checked;
  roadNetworkMarkers.forEach((m) => {
    if (show) m.addTo(map);
    else map.removeLayer(m);
  });
});

/* ------------------ Data Holders ------------------ */
let points = {},
  trips = [],
  zones = [];

/* ------------------ UI Refs ------------------ */
const zoneSelect = document.getElementById("zoneSelect");
const tripSelect = document.getElementById("tripSelect");
const analyzeBtn = document.getElementById("analyzeBtn");
const segmentsContainer = document.getElementById("segmentsContainer");

/* ------------------ CSV Files ------------------ */
const pointsFile = "for_dm.csv";
const tripsFile = "trip_order.csv";
const barangayFile = "barangay_clustering_labels.csv";

/* ------------------ Hardcoded per-segment Alternative ------------------ */
const HARD_CODED_SEGMENTS = {};

/* ------------------ Haversine ------------------ */
function haversine(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ------------------ OSRM Fetch ------------------ */
async function fetchRoutesBetween(aLatLng, bLatLng) {
  const url = `https://router.project-osrm.org/route/v1/driving/${aLatLng[1]},${aLatLng[0]};${bLatLng[1]},${bLatLng[0]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  return res.json();
}

/* ------------------ CSV Loader ------------------ */
function loadCSVs() {
  // Load barangay clustering labels
  Papa.parse(barangayFile, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (r) => {
      barangayData = r.data;
    },
  });

  // Load map points & trip data
  Papa.parse(pointsFile, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      res.data.forEach((row) => {
        const id = Number(row.label);
        const lat = parseFloat(row.lat);
        const lng = parseFloat(row.long ?? row.lng);
        if (
          Number.isFinite(id) &&
          Number.isFinite(lat) &&
          Number.isFinite(lng)
        ) {
          points[id] = [lat, lng];
          const icon = L.divIcon({
            className: "",
            html: `<div style="width:26px;height:26px;border-radius:50%;
              background:${id <= 50 ? "#007bff" : "#d9534f"};
              color:#fff;display:flex;align-items:center;justify-content:center;
              font-size:11px;border:2px solid #fff">${id}</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });
          const marker = L.marker([lat, lng], { icon }).addTo(map);
          if (id > 50) {
            roadNetworkMarkers.push(marker);
          } else {
            barangayPointMarkers.push(marker);
          }
        }
      });

      Papa.parse(tripsFile, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (res2) => {
          trips = res2.data.filter(
            (r) =>
              (r.Zone || r.zone) && (r["Universal Trip"] || r["universal trip"])
          );
          zones = [...new Set(trips.map((t) => t.Zone || t.zone))].filter(
            Boolean
          );
          zoneSelect.innerHTML = zones
            .map((z) => `<option>${z.toUpperCase()}</option>`)
            .join("");
          zoneSelect.onchange = () => {
            populateTrips();
            if (document.getElementById("toggleLegend").checked) {
              renderBarangayLegend(zoneSelect.value, true);
            }
          };
          populateTrips();
          renderBarangayLegend(zones[0], true);
        },
      });
    },
  });
}

/* ------------------ Barangay Legend ------------------ */
function renderBarangayLegend(zoneValue, skipMarkers = false) {
  if (!skipMarkers) {
    barangayMarkers.forEach((m) => map.removeLayer(m));
    barangayMarkers = [];
  }

  const filtered = barangayData.filter(
    (b) => (b.zone || "").toLowerCase() === zoneValue.toLowerCase()
  );
  if (!filtered.length) return;

  if (!skipMarkers) {
    filtered.forEach((row) => {
      const lat = parseFloat(row.lat);
      const lng = parseFloat(row.long);
      if (!isFinite(lat) || !isFinite(lng)) return;

      const div = L.divIcon({
        className: "",
        html: `<div style="width:26px;height:26px;border-radius:50%;
          background:#007bff;
          color:#fff;display:flex;align-items:center;justify-content:center;
          font-size:11px;border:2px solid #fff">${row.label}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([lat, lng], { icon: div })
        .bindPopup(
          `<strong>${row.barangay}</strong><br>Zone: ${row.zone}<br>Cluster: ${row.clustering_label}<br>Population: ${row.population}`
        )
        .addTo(map);
      barangayMarkers.push(marker);
    });
  }

  if (legendControl) map.removeControl(legendControl);
  legendControl = L.control({ position: "bottomright" });
  legendControl.onAdd = function () {
    const div = L.DomUtil.create(
      "div",
      "info legend bg-white p-2 border rounded shadow-sm"
    );
    div.innerHTML = `<strong>${zoneValue.toUpperCase()} — Barangay Labels</strong><br>`;
    filtered
      .sort((a, b) => Number(a.label) - Number(b.label))
      .forEach((b) => {
        div.innerHTML += `<div>${b.label} — ${b.barangay}</div>`;
      });
    div.innerHTML += `<hr class="my-1"><small>Total Barangays: ${filtered.length}</small>`;
    return div;
  };
  legendControl.addTo(map);
}

/* ------------------ Get Barangay Name ------------------ */
function getBarangayName(id) {
  if (id === 0) return "Depot";
  const b = barangayData.find((x) => Number(x.label) === id);
  return b ? b.barangay : `Node ${id}`;
}

/* ------------------ Populate Trips ------------------ */
function populateTrips() {
  const z = zoneSelect.value;
  const filtered = trips.filter((t) => (t.Zone || t.zone) == z.toLowerCase());
  tripSelect.innerHTML = filtered
    .map((t) => {
      const ut = t["Universal Trip"] ?? t["universal trip"];
      return `<option value="${ut}">${t.Trip ?? "Trip"} — ${ut}</option>`;
    })
    .join("");
  analyzeBtn.disabled = !tripSelect.options.length;
}

/* ------------------ Analyze ------------------ */
analyzeBtn.addEventListener("click", async () => {
  const ut = tripSelect.value;
  if (!ut) return;

  // 🌀 Add spinner element if not exists
  document.getElementById("analyzeSpinner").classList.remove("d-none");

  const tripData = trips.find(
    (t) => (t["Universal Trip"] ?? t["universal trip"])?.trim() === ut.trim()
  );
  const altTrip =
    tripData?.["Alternate Trip"] ?? tripData?.["alternate trip"] ?? "";

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing...";
  clearSegmentsUI();

  try {
    let seq = ut
      .split("-")
      .map((n) => Number(n.trim()))
      .filter(Number.isFinite);
    if (!seq.length) throw new Error("Invalid trip sequence");

    if (seq[seq.length - 1] !== 0) seq.push(0);

    const segments = [];
    for (let i = 0; i < seq.length - 1; i++)
      segments.push({ fromId: seq[i], toId: seq[i + 1] });

    segmentsContainer.innerHTML = `
      <div>
        <label class="form-label fw-bold">Select Route Type:</label>
        <select id="routeMode" class="form-select w-100">
          <option value="main" selected>Main (OSRM)</option>
          <option value="alt" ${
            altTrip ? "" : "disabled"
          }>Alternative (Manually Selected)</option>
        </select>
      </div>
      <button id="drawAllBtn" class="btn btn-primary btn-block w-100 my-3">Draw Pathway</button>
      <div id="routeOutput"></div>
    `;

    const routeModeSelect = document.getElementById("routeMode");
    const drawAllBtn = document.getElementById("drawAllBtn");
    const routeOutput = document.getElementById("routeOutput");

    async function renderRouteList(type) {
      clearDrawn();
      routeOutput.innerHTML = "";
      const results = [];

      // Parse Nodes Served
      const nodesServedRaw =
        tripData?.["Nodes Served"] ?? tripData?.["nodes served"] ?? "";
      const nodesServedMap = {};
      if (nodesServedRaw) {
        nodesServedRaw.split(";").forEach((pair) => {
          const match = pair.trim().match(/^(\d+)\s*\((.*?)\)$/);
          if (match) {
            const id = Number(match[1]);
            const [delivered, demand] = match[2]
              .split(",")
              .map((v) => v.trim());
            nodesServedMap[id] = {
              delivered: parseFloat(delivered) || 0,
              demand: parseFloat(demand) || 0,
            };
          }
        });
      }

      // 🟧 Handle Alternative Trip directly
      if (type === "alt" && altTrip) {
        const altSeq = altTrip
          .split("-")
          .map((n) => Number(n.trim()))
          .filter(Number.isFinite);

        const validCoords = altSeq
          .map((id) => points[id])
          .filter((p) => Array.isArray(p) && p.length === 2);

        if (!validCoords.length) {
          routeOutput.innerHTML = `<div class="alert alert-warning">⚠️ No valid coordinates found for Alternative Trip.</div>`;
          return;
        }

        // Compute distance + duration
        let totalDist = 0;
        for (let i = 0; i < validCoords.length - 1; i++) {
          totalDist += haversine(
            validCoords[i][0],
            validCoords[i][1],
            validCoords[i + 1][0],
            validCoords[i + 1][1]
          );
        }
        const totalDuration = (totalDist / 1000 / 30) * 3600;

        // Draw orange dashed line
        const poly = L.polyline(validCoords, {
          color: "#ff8c00",
          weight: 4,
          dashArray: "10,6",
        }).addTo(map);
        drawn.push(poly);

        // Add arrowheads (optional)
        if (L.Symbol?.arrowHead) {
          const arrows = L.polylineDecorator(poly, {
            patterns: [
              {
                offset: "5%",
                repeat: "10%",
                symbol: L.Symbol.arrowHead({
                  pixelSize: 10,
                  polygon: true,
                  pathOptions: {
                    color: "#e65100",
                    fillOpacity: 0.9,
                    weight: 1,
                  },
                }),
              },
            ],
          }).addTo(map);
          drawn.push(arrows);
        }

        map.fitBounds(poly.getBounds());

        // Display summary
        routeOutput.innerHTML = `
      <div class="border rounded p-3 bg-light">
        <h6 class="fw-bold text-warning mb-2">Alternative Trip Path</h6>
        <div class="small mb-2">
          <strong>Route:</strong> ${altSeq.join(" → ")}
        </div>
        <div><strong>Total Distance:</strong> ${(totalDist / 1000).toFixed(
          2
        )} km</div>
        <div><strong>Estimated Duration:</strong> ${(
          totalDuration / 60
        ).toFixed(1)} min</div>
        <hr>
        <h6 class="fw-bold">Barangays Served:</h6>
        ${Object.keys(nodesServedMap)
          .map((id) => {
            const b = getBarangayName(Number(id));
            const d = nodesServedMap[id];
            return `<div>${b} : ${d.delivered.toLocaleString()} / ${d.demand.toLocaleString()}</div>`;
          })
          .join("")}
      </div>`;
        return;
      }

      // 🟩 Main route logic (unchanged)
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const key = `${seg.fromId}-${seg.toId}`;
        let dist = 0,
          duration = 0,
          coords = [];

        if (type === "main") {
          const json = await fetchRoutesBetween(
            points[seg.fromId],
            points[seg.toId]
          );
          const route = json.routes[0];
          coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);
          dist = route.distance;
          duration = (dist / 1000 / 30) * 3600;
        } else if (HARD_CODED_SEGMENTS[key]) {
          const hardSeq = HARD_CODED_SEGMENTS[key];
          for (let j = 0; j < hardSeq.length - 1; j++) {
            const p1 = points[hardSeq[j]],
              p2 = points[hardSeq[j + 1]];
            if (!p1 || !p2) continue;
            dist += haversine(p1[0], p1[1], p2[0], p2[1]);
          }
          coords = hardSeq.map((id) => points[id]);
          duration = (dist / 1000 / 30) * 3600;
        }

        results.push({
          from: seg.fromId,
          to: seg.toId,
          distance: dist,
          duration,
          coords,
        });
      }

      // Calculate totals
      const totalDistance = results.reduce((a, b) => a + b.distance, 0);
      const totalDuration = results.reduce((a, b) => a + b.duration, 0);

      // Display result list (same as before)
      routeOutput.innerHTML =
        results
          .map((r, i) => {
            const fromName = getBarangayName(r.from);
            const toName = getBarangayName(r.to);
            const deliveryInfo = nodesServedMap[r.to]
              ? `<div class="small text-success mt-1">Delivered: <strong>${nodesServedMap[
                  r.to
                ].delivered.toLocaleString()}</strong> | Demand: <strong>${nodesServedMap[
                  r.to
                ].demand.toLocaleString()}</strong></div>`
              : "";
            return `
        <div class="border rounded p-2 mb-2 segment-item" data-idx="${i}">
          <strong>Segment ${i + 1}:</strong> ${r.from} (${fromName}) → ${
              r.to
            } (${toName})<br>
          <span class="text-muted small">Distance: ${(
            r.distance / 1000
          ).toFixed(2)} km • ${(r.duration / 60).toFixed(1)} min</span>
          ${deliveryInfo}
        </div>`;
          })
          .join("") +
        `
    <hr>
    <div class="p-2 bg-light border rounded mt-3">
      <h6 class="fw-bold mb-2">Barangays Served:</h6>
      ${Object.keys(nodesServedMap)
        .map((id) => {
          const b = getBarangayName(Number(id));
          const d = nodesServedMap[id];
          return `<div>${b} : ${d.delivered.toLocaleString()} / ${d.demand.toLocaleString()}</div>`;
        })
        .join("")}
      <hr class="my-2">
      <div><strong>Total Distance:</strong> ${(totalDistance / 1000).toFixed(
        2
      )} km</div>
      <div><strong>Total Duration:</strong> ${(totalDuration / 60).toFixed(
        1
      )} min</div>
    </div>`;

      // Segment click (draw blue segment + arrows)
      document.querySelectorAll(".segment-item").forEach((el, i) => {
        el.addEventListener("click", () => {
          clearDrawn();
          const r = results[i];
          if (!r.coords.length) return;

          const poly = L.polyline(r.coords, {
            color: "#007bff",
            weight: 5,
          }).addTo(map);
          drawn.push(poly);

          if (L.Symbol?.arrowHead) {
            const arrowHead = L.polylineDecorator(poly, {
              patterns: [
                {
                  offset: "5%",
                  repeat: "20%",
                  symbol: L.Symbol.arrowHead({
                    pixelSize: 10,
                    polygon: true,
                    pathOptions: {
                      color: "#004085",
                      fillOpacity: 0.8,
                      weight: 1,
                    },
                  }),
                },
              ],
            }).addTo(map);
            drawn.push(arrowHead);
          }

          map.fitBounds(poly.getBounds());
        });
      });

      // Draw all (main)
      drawAllBtn.onclick = () => {
        clearDrawn();
        let allCoords = [];
        results.forEach((r) => {
          if (r.coords && r.coords.length) allCoords.push(...r.coords);
        });

        const poly = L.polyline(allCoords, {
          color: "#28a745",
          weight: 4,
        }).addTo(map);
        drawn.push(poly);

        if (L.Symbol?.arrowHead) {
          const arrowHead = L.polylineDecorator(poly, {
            patterns: [
              {
                offset: "5%",
                repeat: "10%",
                symbol: L.Symbol.arrowHead({
                  pixelSize: 10,
                  polygon: true,
                  pathOptions: {
                    color: "#155724",
                    fillOpacity: 0.8,
                    weight: 1,
                  },
                }),
              },
            ],
          }).addTo(map);
          drawn.push(arrowHead);
        }

        map.fitBounds(poly.getBounds());
      };
    }

    routeModeSelect.addEventListener("change", (e) =>
      renderRouteList(e.target.value)
    );
    await renderRouteList("main");
  } catch (err) {
    segmentsContainer.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    console.error(err);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analyze Routes";
    // 🌀 Hide spinner after done
    document.getElementById("analyzeSpinner").classList.add("d-none");
  }
});

/* ------------------ Helpers ------------------ */
let drawn = [];
function clearDrawn() {
  drawn.forEach((d) => map.removeLayer(d));
  drawn = [];
}
function clearSegmentsUI() {
  segmentsContainer.innerHTML = "";
  clearDrawn();
}

/* ------------------ Init ------------------ */
loadCSVs();
