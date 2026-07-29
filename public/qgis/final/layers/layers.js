var wms_layers = [];

var format_camalig_boundary_0 = new ol.format.GeoJSON();
var features_camalig_boundary_0 = format_camalig_boundary_0.readFeatures(json_camalig_boundary_0, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_camalig_boundary_0 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_camalig_boundary_0.addFeatures(features_camalig_boundary_0);
var lyr_camalig_boundary_0 = new ol.layer.Vector({
                declutter: false,
                source:jsonSource_camalig_boundary_0, 
                style: style_camalig_boundary_0,
                popuplayertitle: 'camalig_boundary',
                interactive: true,
                title: '<img src="./qgis/final/styles/legend/camalig_boundary_0.png" /> camalig_boundary'
            });
var format_FloodDatafromProjectNoah_1 = new ol.format.GeoJSON();
var features_FloodDatafromProjectNoah_1 = format_FloodDatafromProjectNoah_1.readFeatures(json_FloodDatafromProjectNoah_1, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_FloodDatafromProjectNoah_1 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_FloodDatafromProjectNoah_1.addFeatures(features_FloodDatafromProjectNoah_1);
var lyr_FloodDatafromProjectNoah_1 = new ol.layer.Vector({
                declutter: false,
                source:jsonSource_FloodDatafromProjectNoah_1, 
                style: style_FloodDatafromProjectNoah_1,
                popuplayertitle: 'Flood Data from Project Noah',
                interactive: true,
    title: 'Flood Data from Project Noah<br />\
    <img src="./qgis/final/styles/legend/FloodDatafromProjectNoah_1_0.png" /> Low Risk<br />\
    <img src="./qgis/final/styles/legend/FloodDatafromProjectNoah_1_1.png" /> Medium Risk<br />\
    <img src="./qgis/final/styles/legend/FloodDatafromProjectNoah_1_2.png" /> High Risk<br />' });
var format_CamaligRoadNetwork_2 = new ol.format.GeoJSON();
var features_CamaligRoadNetwork_2 = format_CamaligRoadNetwork_2.readFeatures(json_CamaligRoadNetwork_2, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_CamaligRoadNetwork_2 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_CamaligRoadNetwork_2.addFeatures(features_CamaligRoadNetwork_2);
var lyr_CamaligRoadNetwork_2 = new ol.layer.Vector({
                declutter: false,
                source:jsonSource_CamaligRoadNetwork_2, 
                style: style_CamaligRoadNetwork_2,
                popuplayertitle: 'Camalig Road Network',
                interactive: true,
                title: '<img src="./qgis/final/styles/legend/CamaligRoadNetwork_2.png" /> Camalig Road Network'
            });
var format_BarangayPoints_3 = new ol.format.GeoJSON();
var features_BarangayPoints_3 = format_BarangayPoints_3.readFeatures(json_BarangayPoints_3, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_BarangayPoints_3 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_BarangayPoints_3.addFeatures(features_BarangayPoints_3);
var lyr_BarangayPoints_3 = new ol.layer.Vector({
                declutter: false,
                source:jsonSource_BarangayPoints_3, 
                style: style_BarangayPoints_3,
                popuplayertitle: 'Barangay Points',
                interactive: true,
                title: '<img src="./qgis/final/styles/legend/BarangayPoints_3.png" /> Barangay Points'
            });

lyr_camalig_boundary_0.setVisible(true);lyr_FloodDatafromProjectNoah_1.setVisible(true);lyr_CamaligRoadNetwork_2.setVisible(true);lyr_BarangayPoints_3.setVisible(true);
var layersList = [lyr_camalig_boundary_0,lyr_FloodDatafromProjectNoah_1,lyr_CamaligRoadNetwork_2,lyr_BarangayPoints_3];
lyr_camalig_boundary_0.set('fieldAliases', {'fid': 'fid', 'id': 'id', });
lyr_FloodDatafromProjectNoah_1.set('fieldAliases', {'fid': 'fid', 'Var': 'Var', });
lyr_CamaligRoadNetwork_2.set('fieldAliases', {'fid': 'fid', 'full_id': 'full_id', 'osm_id': 'osm_id', 'osm_type': 'osm_type', 'highway': 'highway', 'name': 'name', 'surface': 'surface', 'ref': 'ref', 'tunnel': 'tunnel', 'bridge': 'bridge', 'level': 'level', });
lyr_BarangayPoints_3.set('fieldAliases', {'fid': 'fid', 'full_id': 'full_id', 'osm_id': 'osm_id', 'osm_type': 'osm_type', 'is_in:barangay': 'is_in:barangay', 'way': 'way', 'name:etymology:wikipedia': 'name:etymology:wikipedia', 'name:etymology:wikidata': 'name:etymology:wikidata', 'name:etymology': 'name:etymology', 'noexit': 'noexit', 'is_in:island': 'is_in:island', 'sanitary_dump_station': 'sanitary_dump_station', 'internet_access': 'internet_access', 'description': 'description', 'addr:street': 'addr:street', 'not:name': 'not:name', 'is_in:village': 'is_in:village', 'source:name': 'source:name', 'operator': 'operator', 'is_in:municipality': 'is_in:municipality', 'tourism': 'tourism', 'designation': 'designation', 'addr:postcode': 'addr:postcode', 'addr:city': 'addr:city', 'town': 'town', 'population:2015': 'population:2015', 'public_transport': 'public_transport', 'ref_num': 'ref_num', 'cargo': 'cargo', 'waterway': 'waterway', 'official_name': 'official_name', 'name:eo': 'name:eo', 'is_in:region': 'is_in:region', 'is_in:archipelago': 'is_in:archipelago', 'int_ref': 'int_ref', 'ISO3166-2': 'ISO3166-2', 'is_in:city': 'is_in:city', 'gns_uni': 'gns_uni', 'gns_classification': 'gns_classification', 'mooring': 'mooring', 'ferry': 'ferry', 'old_name': 'old_name', 'name:abbr': 'name:abbr', 'amenity': 'amenity', 'is_in': 'is_in', 'place:PH': 'place:PH', 'is_in:town': 'is_in:town', 'is_in:quarter': 'is_in:quarter', 'is_in:province': 'is_in:province', 'is_in:state': 'is_in:state', 'source:population': 'source:population', 'official_name:tl': 'official_name:tl', 'official_name:en': 'official_name:en', 'official_name:bcl': 'official_name:bcl', 'name:zh': 'name:zh', 'name:uk': 'name:uk', 'name:tl': 'name:tl', 'name:ru': 'name:ru', 'name:ja': 'name:ja', 'name:en': 'name:en', 'name:bcl': 'name:bcl', 'capital': 'capital', 'alt_name:tl': 'alt_name:tl', 'alt_name:en': 'alt_name:en', 'alt_name:bcl': 'alt_name:bcl', 'alt_name': 'alt_name', 'wikipedia': 'wikipedia', 'wikimedia_commons': 'wikimedia_commons', 'wikidata': 'wikidata', 'ref': 'ref', 'postal_code': 'postal_code', 'population:date': 'population:date', 'population': 'population', 'place': 'place', 'old_ref': 'old_ref', 'admin_type:PH': 'admin_type:PH', 'admin_level': 'admin_level', 'natural': 'natural', 'name': 'name', });
lyr_camalig_boundary_0.set('fieldImages', {'fid': 'TextEdit', 'id': 'TextEdit', });
lyr_FloodDatafromProjectNoah_1.set('fieldImages', {'fid': 'TextEdit', 'Var': 'TextEdit', });
lyr_CamaligRoadNetwork_2.set('fieldImages', {'fid': '', 'full_id': '', 'osm_id': '', 'osm_type': '', 'highway': '', 'name': '', 'surface': '', 'ref': '', 'tunnel': '', 'bridge': '', 'level': '', });
lyr_BarangayPoints_3.set('fieldImages', {'fid': 'TextEdit', 'full_id': 'TextEdit', 'osm_id': 'TextEdit', 'osm_type': 'TextEdit', 'is_in:barangay': 'TextEdit', 'way': 'TextEdit', 'name:etymology:wikipedia': 'TextEdit', 'name:etymology:wikidata': 'TextEdit', 'name:etymology': 'TextEdit', 'noexit': 'TextEdit', 'is_in:island': 'TextEdit', 'sanitary_dump_station': 'TextEdit', 'internet_access': 'TextEdit', 'description': 'TextEdit', 'addr:street': 'TextEdit', 'not:name': 'TextEdit', 'is_in:village': 'TextEdit', 'source:name': 'TextEdit', 'operator': 'TextEdit', 'is_in:municipality': 'TextEdit', 'tourism': 'TextEdit', 'designation': 'TextEdit', 'addr:postcode': 'TextEdit', 'addr:city': 'TextEdit', 'town': 'TextEdit', 'population:2015': 'TextEdit', 'public_transport': 'TextEdit', 'ref_num': 'TextEdit', 'cargo': 'TextEdit', 'waterway': 'TextEdit', 'official_name': 'TextEdit', 'name:eo': 'TextEdit', 'is_in:region': 'TextEdit', 'is_in:archipelago': 'TextEdit', 'int_ref': 'TextEdit', 'ISO3166-2': 'TextEdit', 'is_in:city': 'TextEdit', 'gns_uni': 'TextEdit', 'gns_classification': 'TextEdit', 'mooring': 'TextEdit', 'ferry': 'TextEdit', 'old_name': 'TextEdit', 'name:abbr': 'TextEdit', 'amenity': 'TextEdit', 'is_in': 'TextEdit', 'place:PH': 'TextEdit', 'is_in:town': 'TextEdit', 'is_in:quarter': 'TextEdit', 'is_in:province': 'TextEdit', 'is_in:state': 'TextEdit', 'source:population': 'TextEdit', 'official_name:tl': 'TextEdit', 'official_name:en': 'TextEdit', 'official_name:bcl': 'TextEdit', 'name:zh': 'TextEdit', 'name:uk': 'TextEdit', 'name:tl': 'TextEdit', 'name:ru': 'TextEdit', 'name:ja': 'TextEdit', 'name:en': 'TextEdit', 'name:bcl': 'TextEdit', 'capital': 'TextEdit', 'alt_name:tl': 'TextEdit', 'alt_name:en': 'TextEdit', 'alt_name:bcl': 'TextEdit', 'alt_name': 'TextEdit', 'wikipedia': 'TextEdit', 'wikimedia_commons': 'TextEdit', 'wikidata': 'TextEdit', 'ref': 'TextEdit', 'postal_code': 'TextEdit', 'population:date': 'TextEdit', 'population': 'TextEdit', 'place': 'TextEdit', 'old_ref': 'TextEdit', 'admin_type:PH': 'TextEdit', 'admin_level': 'TextEdit', 'natural': 'TextEdit', 'name': 'TextEdit', });
lyr_camalig_boundary_0.set('fieldLabels', {'fid': 'no label', 'id': 'no label', });
lyr_FloodDatafromProjectNoah_1.set('fieldLabels', {'fid': 'no label', 'Var': 'no label', });
lyr_CamaligRoadNetwork_2.set('fieldLabels', {'fid': 'no label', 'full_id': 'no label', 'osm_id': 'no label', 'osm_type': 'no label', 'highway': 'no label', 'name': 'no label', 'surface': 'no label', 'ref': 'no label', 'tunnel': 'no label', 'bridge': 'no label', 'level': 'no label', });
lyr_BarangayPoints_3.set('fieldLabels', {'fid': 'no label', 'full_id': 'no label', 'osm_id': 'no label', 'osm_type': 'no label', 'is_in:barangay': 'no label', 'way': 'no label', 'name:etymology:wikipedia': 'no label', 'name:etymology:wikidata': 'no label', 'name:etymology': 'no label', 'noexit': 'no label', 'is_in:island': 'no label', 'sanitary_dump_station': 'no label', 'internet_access': 'no label', 'description': 'no label', 'addr:street': 'no label', 'not:name': 'no label', 'is_in:village': 'no label', 'source:name': 'no label', 'operator': 'no label', 'is_in:municipality': 'no label', 'tourism': 'no label', 'designation': 'no label', 'addr:postcode': 'no label', 'addr:city': 'no label', 'town': 'no label', 'population:2015': 'no label', 'public_transport': 'no label', 'ref_num': 'no label', 'cargo': 'no label', 'waterway': 'no label', 'official_name': 'no label', 'name:eo': 'no label', 'is_in:region': 'no label', 'is_in:archipelago': 'no label', 'int_ref': 'no label', 'ISO3166-2': 'no label', 'is_in:city': 'no label', 'gns_uni': 'no label', 'gns_classification': 'no label', 'mooring': 'no label', 'ferry': 'no label', 'old_name': 'no label', 'name:abbr': 'no label', 'amenity': 'no label', 'is_in': 'no label', 'place:PH': 'no label', 'is_in:town': 'no label', 'is_in:quarter': 'no label', 'is_in:province': 'no label', 'is_in:state': 'no label', 'source:population': 'no label', 'official_name:tl': 'no label', 'official_name:en': 'no label', 'official_name:bcl': 'no label', 'name:zh': 'no label', 'name:uk': 'no label', 'name:tl': 'no label', 'name:ru': 'no label', 'name:ja': 'no label', 'name:en': 'no label', 'name:bcl': 'no label', 'capital': 'no label', 'alt_name:tl': 'no label', 'alt_name:en': 'no label', 'alt_name:bcl': 'no label', 'alt_name': 'no label', 'wikipedia': 'no label', 'wikimedia_commons': 'no label', 'wikidata': 'no label', 'ref': 'no label', 'postal_code': 'no label', 'population:date': 'no label', 'population': 'no label', 'place': 'no label', 'old_ref': 'no label', 'admin_type:PH': 'no label', 'admin_level': 'no label', 'natural': 'no label', 'name': 'no label', });
lyr_BarangayPoints_3.on('precompose', function(evt) {
    evt.context.globalCompositeOperation = 'normal';
});