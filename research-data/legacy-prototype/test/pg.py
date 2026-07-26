import os
import osmnx as ox
import pandas as pd
from shapely.geometry import Polygon

# ================= Boundary Coordinates =================
coords = [
    (13.253168,123.683541),(13.208173,123.677063),(13.191876,123.680074),
    (13.181739,123.674461),(13.179453,123.674614),(13.176223,123.672878),
    (13.170658,123.665887),(13.165115,123.665413),(13.161537,123.668322),
    (13.140049,123.672155),(13.134708,123.671794),(13.131598,123.672311),
    (13.128923,123.671195),(13.127586,123.671968),(13.107858,123.669049),
    (13.078826,123.667629),(13.072066,123.67212),(13.068685,123.679469),
    (13.062918,123.674774),(13.056157,123.659055),(13.063714,123.65436),
    (13.066498,123.648236),(13.089564,123.589443),(13.084792,123.556781),
    (13.101096,123.563313),(13.126147,123.584544),(13.12734,123.593118),
    (13.161532,123.614348),(13.223941,123.644153),(13.249816,123.67644),
    (13.253168,123.683541)
]

polygon = Polygon([(lon, lat) for lat, lon in coords])

# ================= Download Road Network =================
save_path = "camalig_roads.graphml"
if os.path.exists(save_path):
    G = ox.load_graphml(save_path)
else:
    G = ox.graph_from_polygon(polygon, network_type="drive")
    ox.save_graphml(G, save_path)

# ================= Assign Labels =================
nodes = list(G.nodes(data=True))
nodes_sorted = sorted(nodes, key=lambda x: x[0])
node_data = []

for i, (nid, data) in enumerate(nodes_sorted, start=1):
    node_data.append({
        "id": str(nid),
        "label": i,
        "lat": data['y'],
        "lon": data['x']
    })

# ================= Save JSON =================
import json
with open("camalig_nodes.json", "w") as f:
    json.dump(node_data, f, indent=2)

print(f"✅ {len(node_data)} nodes saved to camalig_nodes.json")
