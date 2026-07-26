import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Boxes,
  ChevronDown,
  CircleHelp,
  CloudRain,
  Download,
  Gauge,
  History,
  Home,
  Layers3,
  LocateFixed,
  MapPin,
  Menu,
  Navigation,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Route,
  ShieldCheck,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { SmartMap } from "./components/SmartMap";
import { loadAppData, type AppData } from "./lib/data";
import { formatDistance, formatDuration, interpolateRoute } from "./lib/geo";
import { RoutingEngine } from "./lib/routing";
import { clearMissionHistory, loadMissionHistory, saveMissionHistory } from "./lib/storage";
import { fetchCamaligWeather } from "./lib/weather";
import type {
  Coordinates,
  MissionPlan,
  MissionStop,
  RouteResult,
  SafetyMode,
  SimulationState,
  WeatherObservation,
} from "./types";

const initialSimulation: SimulationState = {
  status: "draft",
  progress: 0,
  elapsedS: 0,
  currentLeg: 0,
  deliveredStopIds: [],
  speedMultiplier: 8,
};

const safetyDetails: Record<SafetyMode, { label: string; description: string }> = {
  fastest: { label: "Fastest safe", description: "Avoids high-risk roads" },
  balanced: { label: "Balanced", description: "Penalizes medium and low risk" },
  safest: { label: "Safest", description: "Avoids high and medium risk" },
};

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [origin, setOrigin] = useState<Coordinates>([123.6591581, 13.1866904]);
  const [originLabel, setOriginLabel] = useState("Camalig Relief Operations Center");
  const [originPickMode, setOriginPickMode] = useState(false);
  const [stops, setStops] = useState<MissionStop[]>([]);
  const [vehicleCapacity, setVehicleCapacity] = useState(1200);
  const [safetyMode, setSafetyMode] = useState<SafetyMode>("balanced");
  const [floodScenario, setFloodScenario] = useState(false);
  const [blockedEdges, setBlockedEdges] = useState<Set<number>>(new Set());
  const [closeRoadMode, setCloseRoadMode] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [comparisons, setComparisons] = useState<Partial<Record<SafetyMode, RouteResult | null>>>({});
  const [routeError, setRouteError] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [weather, setWeather] = useState<WeatherObservation | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [simulation, setSimulation] = useState<SimulationState>(initialSimulation);
  const [history, setHistory] = useState<MissionPlan[]>(() => loadMissionHistory());
  const [activePanel, setActivePanel] = useState<"mission" | "route" | "history">("mission");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  useEffect(() => {
    loadAppData().then(setData).catch((error) => setLoadError(error instanceof Error ? error.message : "Data failed to load"));
    const controller = new AbortController();
    fetchCamaligWeather(controller.signal).then(setWeather).catch(() => setWeatherError(true));
    return () => controller.abort();
  }, []);

  const engine = useMemo(() => (data ? new RoutingEngine(data.graph) : null), [data]);
  const totalGoods = stops.reduce((sum, stop) => sum + stop.goods, 0);
  const overCapacity = totalGoods > vehicleCapacity;
  const rainPrompt = Boolean(weather && (weather.currentPrecipitationMm > 0 || weather.sixHourForecastMm > 0));

  const vehiclePosition = useMemo(
    () => (route && simulation.status !== "draft" ? interpolateRoute(route.coordinates, simulation.progress) : null),
    [route, simulation.progress, simulation.status],
  );

  const planRoute = useCallback(
    (mode = safetyMode, showResult = true) => {
      if (!data || !engine) return null;
      if (!stops.length) {
        setRouteError("Add at least one barangay delivery stop.");
        return null;
      }
      if (overCapacity) {
        setRouteError("Requested goods exceed this vehicle’s capacity.");
        return null;
      }
      setIsPlanning(true);
      const result = engine.planMission(origin, originLabel, stops, data.barangays, mode, floodScenario, blockedEdges);
      if (showResult) {
        setRoute(result);
        setRouteError(result ? "" : "No safe route is available. Try another safety mode or reopen a road.");
        setSimulation({ ...initialSimulation, status: result ? "planned" : "draft" });
        if (result) {
          setActivePanel("route");
          setMobilePanelOpen(true);
        }
      }
      setIsPlanning(false);
      return result;
    },
    [blockedEdges, data, engine, floodScenario, origin, originLabel, overCapacity, safetyMode, stops],
  );

  useEffect(() => {
    if (route && simulation.status !== "running") planRoute();
    // Flood and risk changes intentionally re-plan an existing mission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floodScenario, safetyMode]);

  useEffect(() => {
    if (simulation.status !== "running" || !route) return;
    const timer = window.setInterval(() => {
      setSimulation((current) => {
        const elapsedIncrement = 0.25 * current.speedMultiplier;
        const elapsedS = Math.min(route.durationS, current.elapsedS + elapsedIncrement);
        const progress = route.durationS > 0 ? elapsedS / route.durationS : 1;
        let cumulative = 0;
        let currentLeg = 0;
        const delivered: number[] = [];
        route.legs.forEach((leg, index) => {
          cumulative += leg.durationS;
          if (elapsedS >= cumulative) delivered.push(route.orderedStopIds[index]);
          if (elapsedS < cumulative && currentLeg === 0) currentLeg = index;
        });
        if (progress >= 1) {
          return { ...current, status: "completed", progress: 1, elapsedS, currentLeg: route.legs.length - 1, deliveredStopIds: delivered };
        }
        return { ...current, progress, elapsedS, currentLeg, deliveredStopIds: delivered };
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [route, simulation.status]);

  useEffect(() => {
    if (simulation.status !== "completed" || !route) return;
    setHistory((current) => {
      if (current[0]?.route?.distanceM === route.distanceM && current[0]?.status === "completed") return current;
      const completed: MissionPlan = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        origin,
        originLabel,
        stops,
        vehicleCapacity,
        safetyMode,
        floodScenario,
        status: "completed",
        route,
      };
      const next = [completed, ...current].slice(0, 20);
      saveMissionHistory(next);
      return next;
    });
  }, [floodScenario, origin, originLabel, route, safetyMode, simulation.status, stops, vehicleCapacity]);

  function toggleStop(barangayId: number) {
    setStops((current) => {
      const exists = current.some((stop) => stop.barangayId === barangayId);
      return exists ? current.filter((stop) => stop.barangayId !== barangayId) : [...current, { barangayId, goods: 100 }];
    });
    setRoute(null);
    setSimulation(initialSimulation);
  }

  function updateGoods(barangayId: number, goods: number) {
    setStops((current) => current.map((stop) => (stop.barangayId === barangayId ? { ...stop, goods: Math.max(0, goods) } : stop)));
    setRoute(null);
  }

  function toggleBlockedRoad(edgeId: number) {
    setBlockedEdges((current) => {
      const next = new Set(current);
      if (next.has(edgeId)) next.delete(edgeId);
      else next.add(edgeId);
      return next;
    });
    if (route?.edgeIds.includes(edgeId)) {
      setSimulation((current) => ({ ...current, status: "paused" }));
      setRoute(null);
      setRouteError("The remaining route was closed. Re-plan before resuming the mission.");
      setActivePanel("route");
    }
  }

  function compareRoutes() {
    if (!engine || !data || !stops.length || overCapacity) {
      planRoute();
      return;
    }
    setIsPlanning(true);
    const results: Partial<Record<SafetyMode, RouteResult | null>> = {};
    (["fastest", "balanced", "safest"] as SafetyMode[]).forEach((mode) => {
      results[mode] = engine.planMission(origin, originLabel, stops, data.barangays, mode, floodScenario, blockedEdges);
    });
    setComparisons(results);
    setActivePanel("route");
    setMobilePanelOpen(true);
    setIsPlanning(false);
  }

  function activateComparison(mode: SafetyMode) {
    const result = comparisons[mode];
    if (!result) return;
    setSafetyMode(mode);
    setRoute(result);
    setRouteError("");
    setSimulation({ ...initialSimulation, status: "planned" });
  }

  function resetMission() {
    setSimulation(route ? { ...initialSimulation, status: "planned" } : initialSimulation);
  }

  function reopenMission(mission: MissionPlan) {
    setOrigin(mission.origin);
    setOriginLabel(mission.originLabel);
    setStops(mission.stops);
    setVehicleCapacity(mission.vehicleCapacity);
    setSafetyMode(mission.safetyMode);
    setFloodScenario(mission.floodScenario);
    setRoute(mission.route ?? null);
    setSimulation(mission.route ? { ...initialSimulation, status: "planned" } : initialSimulation);
    setActivePanel("route");
  }

  if (loadError) {
    return (
      <main className="fatal-state">
        <AlertTriangle size={34} />
        <h1>SMART-R could not load its map data</h1>
        <p>{loadError}</p>
        <button className="button primary" onClick={() => location.reload()}><RefreshCw size={16} /> Retry</button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="loading-state">
        <div className="loading-radar"><Navigation size={30} /></div>
        <strong>Preparing Camalig rescue network</strong>
        <span>Loading roads, barangays, and NOAH hazard layers…</span>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="command-header">
        <div className="brand-lockup">
          <div className="brand-mark"><Route size={22} /></div>
          <div>
            <strong>SMART-R</strong>
            <span>Rescue Routing Command · Camalig</span>
          </div>
        </div>
        <div className="header-status">
          <div className={`weather-status ${rainPrompt ? "weather-alert" : ""}`}>
            <CloudRain size={17} />
            <div>
              <span>{weatherError && !weather ? "Live conditions unavailable" : rainPrompt ? "Rainfall watch" : "No rainfall detected"}</span>
              <small>
                {weather
                  ? `${weather.currentPrecipitationMm.toFixed(1)} mm now · ${weather.sixHourForecastMm.toFixed(1)} mm next 6h${weather.source === "cache" ? " · cached" : ""}`
                  : "Scenario tools remain available"}
              </small>
            </div>
          </div>
          <button className="icon-button" onClick={() => setMethodologyOpen(true)} aria-label="Open methodology"><CircleHelp size={19} /></button>
          <a className="icon-button" href="/smart-r-result.pdf" download aria-label="Download research PDF"><Download size={19} /></a>
          <button className="mobile-menu" onClick={() => setMobilePanelOpen(true)} aria-label="Open mission controls"><Menu size={21} /></button>
        </div>
      </header>

      <main className="workspace">
        <aside className={`side-panel${mobilePanelOpen ? " mobile-open" : ""}`}>
          <div className="mobile-panel-head">
            <strong>Mission controls</strong>
            <div>
              <button className="icon-button" onClick={() => setMethodologyOpen(true)} aria-label="Open methodology"><CircleHelp size={18} /></button>
              <a className="icon-button" href="/smart-r-result.pdf" target="_blank" rel="noreferrer" aria-label="Open research PDF"><Download size={18} /></a>
              <button className="icon-button" onClick={() => setMobilePanelOpen(false)} aria-label="Close controls"><X size={19} /></button>
            </div>
          </div>
          <nav className="panel-tabs" aria-label="Mission panels">
            <button className={activePanel === "mission" ? "active" : ""} onClick={() => setActivePanel("mission")}><Navigation size={16} /> Mission</button>
            <button className={activePanel === "route" ? "active" : ""} onClick={() => setActivePanel("route")}><Route size={16} /> Route</button>
            <button className={activePanel === "history" ? "active" : ""} onClick={() => setActivePanel("history")}><History size={16} /> History</button>
          </nav>

          {activePanel === "mission" && (
            <div className="panel-content">
              <section className="panel-section">
                <div className="section-heading">
                  <span className="step-number">1</span>
                  <div><strong>Set mission origin</strong><small>Depot or a location inside Camalig</small></div>
                </div>
                <div className="origin-card">
                  <Home size={18} />
                  <div><strong>{originLabel}</strong><span>{origin[1].toFixed(5)}, {origin[0].toFixed(5)}</span></div>
                </div>
                <div className="button-row">
                  <button className={`button secondary ${originPickMode ? "active" : ""}`} onClick={() => { setOriginPickMode(!originPickMode); setCloseRoadMode(false); }}>
                    <MapPin size={16} /> {originPickMode ? "Picking…" : "Pick on map"}
                  </button>
                  <button className="button ghost" onClick={() => { setOrigin(data.depot.coordinates); setOriginLabel(data.depot.name); setOriginPickMode(false); }}>
                    <LocateFixed size={16} /> Use depot
                  </button>
                </div>
              </section>

              <section className="panel-section">
                <div className="section-heading">
                  <span className="step-number">2</span>
                  <div><strong>Add barangay deliveries</strong><small>Select below or click map markers</small></div>
                </div>
                <label className="field-label" htmlFor="barangay-select">Barangay</label>
                <div className="select-add">
                  <select id="barangay-select" defaultValue="">
                    <option value="" disabled>Choose a destination</option>
                    {data.barangays.filter((barangay) => !stops.some((stop) => stop.barangayId === barangay.id)).map((barangay) => (
                      <option key={barangay.id} value={barangay.id}>{barangay.name} · {barangay.zone}</option>
                    ))}
                  </select>
                  <button
                    className="button square"
                    aria-label="Add selected barangay"
                    onClick={(event) => {
                      const select = event.currentTarget.previousElementSibling as HTMLSelectElement;
                      const id = Number(select.value);
                      if (id) toggleStop(id);
                      select.value = "";
                    }}
                  ><Plus size={18} /></button>
                </div>
                <div className="stop-list">
                  {!stops.length && <div className="empty-inline"><MapPin size={17} /> No delivery stops yet</div>}
                  {stops.map((stop, index) => {
                    const barangay = data.barangays.find((item) => item.id === stop.barangayId)!;
                    return (
                      <div className="stop-card" key={stop.barangayId}>
                        <span className="stop-order">{index + 1}</span>
                        <div className="stop-name"><strong>{barangay.name}</strong><span>{barangay.population.toLocaleString()} residents</span></div>
                        <label><span className="sr-only">Goods for {barangay.name}</span><input type="number" min="0" step="10" value={stop.goods} onChange={(event) => updateGoods(stop.barangayId, Number(event.target.value))} /><small>units</small></label>
                        <button className="remove-button" onClick={() => toggleStop(stop.barangayId)} aria-label={`Remove ${barangay.name}`}><X size={15} /></button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="panel-section">
                <div className="section-heading">
                  <span className="step-number">3</span>
                  <div><strong>Configure vehicle</strong><small>One rescue vehicle per mission</small></div>
                </div>
                <div className="capacity-row">
                  <label><span>Vehicle capacity</span><input type="number" min="1" step="100" value={vehicleCapacity} onChange={(event) => setVehicleCapacity(Math.max(1, Number(event.target.value)))} /></label>
                  <div className={`load-meter ${overCapacity ? "over" : ""}`}>
                    <div><span>Loaded</span><strong>{totalGoods.toLocaleString()} / {vehicleCapacity.toLocaleString()}</strong></div>
                    <progress max={vehicleCapacity} value={totalGoods} />
                  </div>
                </div>
                {overCapacity && <div className="inline-alert"><AlertTriangle size={15} /> Remove {(totalGoods - vehicleCapacity).toLocaleString()} units before planning.</div>}
              </section>

              <section className="panel-section compact">
                <div className="section-heading">
                  <span className="step-number">4</span>
                  <div><strong>Choose routing policy</strong><small>Flood-aware cost profile</small></div>
                </div>
                <div className="segmented">
                  {(Object.keys(safetyDetails) as SafetyMode[]).map((mode) => (
                    <button key={mode} className={safetyMode === mode ? "active" : ""} onClick={() => setSafetyMode(mode)}>
                      <span>{safetyDetails[mode].label}</span><small>{safetyDetails[mode].description}</small>
                    </button>
                  ))}
                </div>
              </section>

              <div className="mission-actions">
                <button className="button primary large" disabled={isPlanning || !stops.length || overCapacity} onClick={() => planRoute()}>
                  <Navigation size={18} /> {isPlanning ? "Calculating…" : "Plan route"}
                </button>
                <button className="button secondary large" disabled={!stops.length || overCapacity} onClick={compareRoutes}><Layers3 size={18} /> Compare</button>
              </div>
            </div>
          )}

          {activePanel === "route" && (
            <div className="panel-content">
              {routeError && <div className="route-error"><AlertTriangle size={19} /><div><strong>Route needs attention</strong><p>{routeError}</p></div></div>}
              {!route && !routeError && <div className="empty-state"><Route size={32} /><strong>No route planned</strong><p>Build a delivery mission first, then calculate the safest available route.</p><button className="button secondary" onClick={() => setActivePanel("mission")}>Build mission</button></div>}
              {Object.keys(comparisons).length > 0 && (
                <section className="comparison-grid">
                  <div className="section-title"><span>Route comparison</span><small>Choose a policy to activate</small></div>
                  {(Object.keys(safetyDetails) as SafetyMode[]).map((mode) => {
                    const result = comparisons[mode];
                    return (
                      <button key={mode} disabled={!result} className={`comparison-card ${safetyMode === mode && route ? "active" : ""}`} onClick={() => activateComparison(mode)}>
                        <span>{safetyDetails[mode].label}</span>
                        {result ? <><strong>{formatDuration(result.durationS)}</strong><small>{formatDistance(result.distanceM)} · {formatDistance(result.exposedM)} exposed</small></> : <small>No safe route</small>}
                      </button>
                    );
                  })}
                </section>
              )}
              {route && (
                <>
                  <section className="route-hero">
                    <div className="route-hero-title"><span><ShieldCheck size={18} /> {safetyDetails[safetyMode].label}</span><small>Estimated operation</small></div>
                    <div className="route-metrics">
                      <div><span>ETA</span><strong>{formatDuration(Math.max(0, route.durationS - simulation.elapsedS))}</strong></div>
                      <div><span>Distance</span><strong>{formatDistance(route.distanceM)}</strong></div>
                      <div><span>Exposure</span><strong>{formatDistance(route.exposedM)}</strong></div>
                    </div>
                    <div className="route-progress"><span style={{ width: `${simulation.progress * 100}%` }} /></div>
                  </section>

                  <section className="mission-live">
                    <div className="section-title"><span>Mission simulation</span><small>{simulation.status === "completed" ? "All deliveries complete" : simulation.status === "running" ? "Vehicle en route" : "Ready for dispatch"}</small></div>
                    <div className="live-stats">
                      <div><Truck size={18} /><span>Current leg</span><strong>{Math.min(simulation.currentLeg + 1, route.legs.length)} / {route.legs.length}</strong></div>
                      <div><Boxes size={18} /><span>Cargo left</span><strong>{Math.max(0, totalGoods - stops.filter((stop) => simulation.deliveredStopIds.includes(stop.barangayId)).reduce((sum, stop) => sum + stop.goods, 0)).toLocaleString()}</strong></div>
                      <div><Gauge size={18} /><span>Speed</span><select value={simulation.speedMultiplier} onChange={(event) => setSimulation((current) => ({ ...current, speedMultiplier: Number(event.target.value) }))}><option value="4">4×</option><option value="8">8×</option><option value="16">16×</option><option value="32">32×</option></select></div>
                    </div>
                    <div className="simulation-buttons">
                      {simulation.status !== "running" && simulation.status !== "completed" ? (
                        <button className="button primary" onClick={() => setSimulation((current) => ({ ...current, status: "running" }))}><Play size={17} /> {simulation.status === "paused" ? "Resume" : "Start mission"}</button>
                      ) : simulation.status === "running" ? (
                        <button className="button warning" onClick={() => setSimulation((current) => ({ ...current, status: "paused" }))}><Pause size={17} /> Pause</button>
                      ) : (
                        <button className="button success" disabled><ShieldCheck size={17} /> Mission complete</button>
                      )}
                      <button className="button ghost" onClick={resetMission}><RefreshCw size={17} /> Reset</button>
                    </div>
                  </section>

                  <section className="route-itinerary">
                    <div className="section-title"><span>Delivery itinerary</span><small>Automatically ordered</small></div>
                    {route.legs.map((leg, index) => {
                      const stopId = route.orderedStopIds[index];
                      const delivered = simulation.deliveredStopIds.includes(stopId);
                      return (
                        <div className={`itinerary-leg ${delivered ? "delivered" : simulation.currentLeg === index && simulation.status === "running" ? "current" : ""}`} key={`${stopId}-${index}`}>
                          <span className="leg-node">{delivered ? "✓" : index + 1}</span>
                          <div><strong>{leg.toLabel}</strong><small>{formatDistance(leg.distanceM)} · {formatDuration(leg.durationS)}</small></div>
                          <span>{delivered ? "Delivered" : `${stops.find((stop) => stop.barangayId === stopId)?.goods ?? 0} units`}</span>
                        </div>
                      );
                    })}
                  </section>
                </>
              )}
            </div>
          )}

          {activePanel === "history" && (
            <div className="panel-content">
              <div className="history-head"><div><strong>Mission history</strong><small>Saved on this device</small></div>{history.length > 0 && <button className="button ghost danger" onClick={() => { clearMissionHistory(); setHistory([]); }}><Trash2 size={15} /> Clear</button>}</div>
              {!history.length ? <div className="empty-state"><Archive size={31} /><strong>No completed missions</strong><p>Completed simulation summaries will appear here.</p></div> : (
                <div className="history-list">
                  {history.map((mission) => (
                    <button key={mission.id} className="history-card" onClick={() => reopenMission(mission)}>
                      <div><strong>{mission.stops.length} barangay{mission.stops.length === 1 ? "" : "s"}</strong><span>{new Date(mission.createdAt).toLocaleString()}</span></div>
                      <div><strong>{mission.route ? formatDistance(mission.route.distanceM) : "Draft"}</strong><span>{mission.floodScenario ? "NOAH scenario" : "Clear scenario"}</span></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        <section className="map-workspace">
          <SmartMap
            data={data}
            route={route}
            floodScenario={floodScenario}
            blockedEdges={blockedEdges}
            closeRoadMode={closeRoadMode}
            originPickMode={originPickMode}
            origin={origin}
            selectedStopIds={stops.map((stop) => stop.barangayId)}
            vehiclePosition={vehiclePosition}
            onToggleStop={toggleStop}
            onCloseRoad={toggleBlockedRoad}
            onPickOrigin={(coordinates) => {
              const snapped = engine?.snap(coordinates);
              setOrigin(snapped?.coordinates ?? coordinates);
              setOriginLabel("Map-selected response point");
              setOriginPickMode(false);
              setRoute(null);
            }}
          />
          <div className="map-tool-stack">
            <button className={`map-tool ${floodScenario ? "active danger" : ""}`} onClick={() => setFloodScenario(!floodScenario)}>
              <CloudRain size={19} /><span>{floodScenario ? "NOAH scenario active" : "Activate flood scenario"}</span>
            </button>
            <button className={`map-tool ${closeRoadMode ? "active" : ""}`} onClick={() => { setCloseRoadMode(!closeRoadMode); setOriginPickMode(false); }}>
              <AlertTriangle size={19} /><span>{closeRoadMode ? "Closing roads…" : "Close road"}</span>
            </button>
            {blockedEdges.size > 0 && <button className="map-tool compact" onClick={() => { setBlockedEdges(new Set()); setRoute(null); }}><X size={17} /><span>Clear {blockedEdges.size} closure{blockedEdges.size === 1 ? "" : "s"}</span></button>}
          </div>
          <div className="map-overview">
            <span><strong>50</strong> barangays</span>
            <span><strong>{data.graph.edges.length.toLocaleString()}</strong> road segments</span>
            <span><strong>{blockedEdges.size}</strong> closures</span>
          </div>
        </section>
      </main>

      {methodologyOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setMethodologyOpen(false)}>
          <article className="methodology-modal" role="dialog" aria-modal="true" aria-labelledby="methodology-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setMethodologyOpen(false)} aria-label="Close methodology"><X size={20} /></button>
            <div className="modal-kicker"><ShieldCheck size={17} /> Research methodology</div>
            <h2 id="methodology-title">What this simulation can—and cannot—tell you</h2>
            <p>SMART-R is an academic planning tool for comparing relief routes in Camalig. It is not certified navigation and it does not confirm that a road is currently passable.</p>
            <div className="method-grid">
              <section><CloudRain size={20} /><strong>Project NOAH</strong><p>The blue, amber, and red polygons are stored 100-year rain-return flood susceptibility classes. They change routing costs only after you activate the planning scenario.</p></section>
              <section><RefreshCw size={20} /><strong>Live weather context</strong><p>Open-Meteo precipitation is shown as context. Rainfall prompts a review, but never automatically claims inundation or closes a road.</p></section>
              <section><Navigation size={20} /><strong>Route model</strong><p>A* searches the local Camalig road graph. Roads are treated as bidirectional because one-way and turn-restriction attributes are not present in the source export.</p></section>
              <section><AlertTriangle size={20} /><strong>Field verification</strong><p>Manual closures override every model. Rescuers should verify roads with LGU, MDRRMO, and on-ground reports before deployment.</p></section>
            </div>
            <div className="source-links">
              <a href="https://noah.up.edu.ph/know-your-hazards" target="_blank" rel="noreferrer">Project NOAH methodology ↗</a>
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo source ↗</a>
              <a href="/smart-r-result.pdf" target="_blank" rel="noreferrer">SMART-R research result ↗</a>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
