let selectedRoutes = {};
let analyzedSegments = [];
let blockedSegments = new Set();
let barangayData = []; // for barangay info
let barangayMarkers = []; // ← track markers for clearing
let legendControl;

/* ------------------ Map Setup ------------------ */
const map = L.map("map").setView([13.18669, 123.659158], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OSM",
}).addTo(map);

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
        if (Number.isFinite(id) && Number.isFinite(lat) && Number.isFinite(lng)) {
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
          L.marker([lat, lng], { icon }).addTo(map);
        }
      });

      Papa.parse(tripsFile, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (res2) => {
          trips = res2.data.filter(
            (r) =>
              (r.Zone || r.zone) &&
              (r["Universal Trip"] || r["universal trip"])
          );
          zones = [...new Set(trips.map((t) => t.Zone || t.zone))].filter(Boolean);
          zoneSelect.innerHTML = zones
            .map((z) => `<option>${z.toUpperCase()}</option>`)
            .join("");
          zoneSelect.onchange = () => {
            populateTrips();
            renderBarangayLegend(zoneSelect.value);
          };
          populateTrips();
          renderBarangayLegend(zones[0]);
        },
      });
    },
  });
}

/* ------------------ Barangay Legend ------------------ */
function renderBarangayLegend(zoneValue) {
  barangayMarkers.forEach((m) => map.removeLayer(m));
  barangayMarkers = [];
  const filtered = barangayData.filter(
    (b) => (b.zone || "").toLowerCase() === zoneValue.toLowerCase()
  );
  if (!filtered.length) return;

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

  const tripData = trips.find(
    (t) =>
      (t["Universal Trip"] ?? t["universal trip"])?.trim() === ut.trim()
  );
  const altTrip = tripData?.["Alternate Trip"] ?? tripData?.["alternate trip"] ?? "";

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
          <option value="alt" ${altTrip ? "" : "disabled"}>Alternative (Hardcoded)</option>
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

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const key = `${seg.fromId}-${seg.toId}`;
        let dist = 0,
          duration = 0,
          coords = [],
          seqNodes = [];

        if (i === segments.length - 1) {
          let reversedCoords = [],
            totalDist = 0,
            totalDuration = 0;
          for (let j = results.length - 1; j >= 0; j--) {
            const prev = results[j];
            if (prev && prev.coords.length) {
              reversedCoords.push(...[...prev.coords].reverse());
              totalDist += prev.distance;
              totalDuration += prev.duration;
            }
          }
          coords = reversedCoords.length
            ? reversedCoords
            : [points[seg.fromId], points[seg.toId]];
          dist = totalDist || haversine(...points[seg.fromId], ...points[seg.toId]);
          duration = (dist / 1000 / 30) * 3600;
        } else if (type === "main") {
          const json = await fetchRoutesBetween(points[seg.fromId], points[seg.toId]);
          const route = json.routes[0];
          coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);
          dist = route.distance;
          duration = (dist / 1000 / 30) * 3600;
        } else if (HARD_CODED_SEGMENTS[key]) {
          const hardSeq = HARD_CODED_SEGMENTS[key];
          for (let j = 0; j < hardSeq.length - 1; j++) {
            const p1 = points[hardSeq[j]], p2 = points[hardSeq[j + 1]];
            if (!p1 || !p2) continue;
            dist += haversine(p1[0], p1[1], p2[0], p2[1]);
          }
          coords = hardSeq.map((id) => points[id]);
          duration = (dist / 1000 / 30) * 3600;
        }

        results.push({ from: seg.fromId, to: seg.toId, distance: dist, duration, coords });
      }

      const totalDistance = results.reduce((a, b) => a + b.distance, 0);
      const totalDuration = results.reduce((a, b) => a + b.duration, 0);

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
              <span class="text-muted small">Distance: ${(r.distance / 1000).toFixed(
                2
              )} km • ${(r.duration / 60).toFixed(1)} min</span>
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
        <div><strong>Total Distance:</strong> ${(totalDistance / 1000).toFixed(2)} km</div>
        <div><strong>Total Duration:</strong> ${(totalDuration / 60).toFixed(1)} min</div>
      </div>`;

      document.querySelectorAll(".segment-item").forEach((el, i) => {
        el.addEventListener("click", () => {
          clearDrawn();
          const r = results[i];
          if (!r.coords.length) return;
          const poly = L.polyline(r.coords, { color: "#007bff", weight: 5 }).addTo(map);
          drawn.push(poly);
          map.fitBounds(poly.getBounds());
        });
      });

      drawAllBtn.onclick = () => {
        clearDrawn();
        let allCoords = [];
        results.forEach((r) => {
          if (r.coords && r.coords.length) allCoords.push(...r.coords);
        });
        const poly = L.polyline(allCoords, { color: "#28a745", weight: 4 }).addTo(map);
        drawn.push(poly);
        map.fitBounds(poly.getBounds());
      };
    }

    routeModeSelect.addEventListener("change", (e) =>
      renderRouteList(e.target.value)
    );
    renderRouteList("main");
  } catch (err) {
    segmentsContainer.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    console.error(err);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analyze Routes";
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
