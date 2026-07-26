# SMART-R

**Spatial Modeling and Analysis for Risk-based Transport Routing**

SMART-R is an interactive rescue-routing simulator for disaster risk and evacuation planning in Camalig, Albay. It calculates local A-to-B and multi-stop relief routes, applies Project NOAH flood-susceptibility costs, accepts field-reported road closures, and simulates a rescue vehicle delivering goods to selected barangays.

## Capabilities

- A* routing across a locally prepared Camalig road graph
- Optional multi-stop ordering with nearest insertion and 2-opt refinement
- Fastest, Balanced, and Safest flood-aware routing profiles
- Project NOAH low, medium, and high susceptibility overlays
- Manual road closures that override all routing profiles
- Live and cached Open-Meteo precipitation context
- Vehicle capacity validation and animated mission simulation
- Device-local completed mission history
- Responsive desktop, tablet, and mobile command interface

## Local development

```bash
npm install
npm run dev
```

The pre-development script converts the preserved QGIS and CSV source material under `research-data/` into compact runtime assets under `public/data/`.

## Validation

```bash
npm run test
npm run build
```

## Research limitations

SMART-R is an academic planning tool, not certified navigation. Project NOAH polygons represent flood susceptibility rather than confirmed live inundation. Open-Meteo rainfall is context only. The exported road network lacks complete one-way and turn-restriction attributes, so roads are modeled as bidirectional. Field verification by the LGU, MDRRMO, and responders remains necessary.

The original Express/EJS prototype and unused QGIS web export were removed from the production tree after validation. They remain recoverable from repository history.
