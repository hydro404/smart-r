var wms_layers = [];


        var lyr_OpenStreetMap_0 = new ol.layer.Tile({
            'title': 'OpenStreetMap',
            'opacity': 1.000000,
            
            
            source: new ol.source.XYZ({
            attributions: ' ',
                url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            })
        });
var format_PH050500000_FH_25yr_1 = new ol.format.GeoJSON();
var features_PH050500000_FH_25yr_1 = format_PH050500000_FH_25yr_1.readFeatures(json_PH050500000_FH_25yr_1, 
            {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
var jsonSource_PH050500000_FH_25yr_1 = new ol.source.Vector({
    attributions: ' ',
});
jsonSource_PH050500000_FH_25yr_1.addFeatures(features_PH050500000_FH_25yr_1);
var lyr_PH050500000_FH_25yr_1 = new ol.layer.Vector({
                declutter: false,
                source:jsonSource_PH050500000_FH_25yr_1, 
                style: style_PH050500000_FH_25yr_1,
                popuplayertitle: 'PH050500000_FH_25yr',
                interactive: true,
    title: 'PROJECT NOAH 25-YEAR RAIN RETURN SCENARIO FLOOD HAZARD MAPS IN ALBAY<br />\
    <img src="./qgis/whole/styles/legend/PH050500000_FH_25yr_1_0.png" /> Low Risk<br />\
    <img src="./qgis/whole/styles/legend/PH050500000_FH_25yr_1_1.png" /> Medium Risk<br />\
    <img src="./qgis/whole/styles/legend/PH050500000_FH_25yr_1_2.png" /> High Risk<br />' });

lyr_OpenStreetMap_0.setVisible(true);lyr_PH050500000_FH_25yr_1.setVisible(true);
var layersList = [lyr_OpenStreetMap_0,lyr_PH050500000_FH_25yr_1];
lyr_PH050500000_FH_25yr_1.set('fieldAliases', {'Var': 'Var', });
lyr_PH050500000_FH_25yr_1.set('fieldImages', {'Var': 'TextEdit', });
lyr_PH050500000_FH_25yr_1.set('fieldLabels', {'Var': 'no label', });
lyr_PH050500000_FH_25yr_1.on('precompose', function(evt) {
    evt.context.globalCompositeOperation = 'normal';
});