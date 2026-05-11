var map = L.map('map');


// =====================================================
// BASE MAP
// =====================================================

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


// =====================================================
// ALLIANCE COLORS
// =====================================================

function getColor(winning_front) {

  if (winning_front === "LDF") return "#e53935";
  if (winning_front === "UDF") return "#1e88e5";
  if (winning_front === "NDA") return "#fb8c00";

  return "#9e9e9e";
}


// =====================================================
// CONSTITUENCY STYLE
// =====================================================

function style(feature) {

  return {
    fillColor: getColor(feature.properties.winning_front),
    weight: 1,
    opacity: 1,
    color: "white",
    fillOpacity: 0.75
  };
}


// =====================================================
// HOVER HIGHLIGHT
// =====================================================

function highlightFeature(e) {

  const layer = e.target;

  layer.setStyle({
    weight: 3,
    color: "#222",
    fillOpacity: 1
  });

  layer.bringToFront();
}


// =====================================================
// LAYER VARIABLES
// =====================================================

let lsLayer;
let acLayer;
let districtLayer;


// =====================================================
// LOAD ALL DATA
// =====================================================

Promise.all([

  fetch('data/loksabha_kerala_mapped.geojson')
    .then(res => res.json()),

  fetch('data/stateassembly_2026_mapped.geojson')
    .then(res => res.json()),

  fetch('data/district.geojson')
    .then(res => res.json())

])

.then(([lsData, acData, districtData]) => {



  // =====================================================
  // LOK SABHA LAYER
  // =====================================================

  lsLayer = L.geoJSON(lsData, {

    style: style,

    onEachFeature: function(feature, layer) {

      const p = feature.properties;


      // Standardized search name
      feature.properties.name = p.ls_seat_name;


      // Tooltip
      layer.bindTooltip(
        p.ls_seat_name,
        {
          sticky: true,
          direction: "top",
          className: "constituency-label"
        }
      );


      // Events
      layer.on({

        mouseover: highlightFeature,

        mouseout: function(e) {
          lsLayer.resetStyle(e.target);
        },

        click: function() {

          layer.bindPopup(`

            <div style="font-size:14px;">

              <strong style="font-size:16px;">
                ${p.ls_seat_name}
              </strong>

              <br><br>

              <strong>MP:</strong>
              ${p.elected_representative}<br>

              <strong>Party:</strong>
              ${p.winning_party}<br>

              <strong>Front:</strong>
              ${p.winning_front}<br>

              <strong>Election Year:</strong>
              ${2024}<br>

              <strong>Margin:</strong>
              ${p.margin}<br>

              <strong>Turnout:</strong>
              ${p.turnout_percentage}

            </div>

          `).openPopup();
        }
      });
    }
  });



  // =====================================================
  // ASSEMBLY LAYER
  // =====================================================

  acLayer = L.geoJSON(acData, {

    style: style,

    onEachFeature: function(feature, layer) {

      const p = feature.properties;


      // Standardized search name
      feature.properties.name = p.Asmbly_Con;


      // Tooltip
      layer.bindTooltip(
        p.Asmbly_Con,
        {
          sticky: true,
          direction: "top",
          className: "constituency-label"
        }
      );


      // Events
      layer.on({

        mouseover: highlightFeature,

        mouseout: function(e) {
          acLayer.resetStyle(e.target);
        },

        click: function() {

          layer.bindPopup(`

            <div style="font-size:14px;">

              <strong style="font-size:16px;">
                ${p.Asmbly_Con}
              </strong>

              <br><br>

              <strong>District:</strong>
              ${p.District || "N/A"}<br>

              <strong>MLA:</strong>
              ${p.elected_representative}<br>

              <strong>Party:</strong>
              ${p.winning_party}<br>

              <strong>Front:</strong>
              ${p.winning_front}<br>

              <strong>Election Year:</strong>
              ${p.election_year || "2021"}<br>

            </div>

          `).openPopup();
        }
      });
    }
  });



  // =====================================================
  // DISTRICT LAYER
  // =====================================================

  districtLayer = L.geoJSON(districtData, {

    style: function(feature) {

      return {
        color: "#222",
        weight: 2,
        fillColor: "#eeeeee",
        fillOpacity: 0.5
      };
    },

    onEachFeature: function(feature, layer) {

      const p = feature.properties;


      // Standardized search name
      feature.properties.name = p.DISTRICT;


      layer.bindTooltip(
        p.DISTRICT,
        {
          sticky: true,
          direction: "top",
          className: "constituency-label"
        }
      );


      layer.on({

        mouseover: function(e) {

          e.target.setStyle({
            weight: 3,
            fillOpacity: 0.7
          });
        },

        mouseout: function(e) {
          districtLayer.resetStyle(e.target);
        }
      });
    }
  });



  // =====================================================
  // DEFAULT LAYER
  // =====================================================

  lsLayer.addTo(map);

  map.fitBounds(lsLayer.getBounds());



  // =====================================================
  // TOGGLE CONTROL
  // =====================================================

  const baseMaps = {
    "Lok Sabha": lsLayer,
    "State Assembly": acLayer,
    "Districts": districtLayer
  };


  L.control.layers(baseMaps, null, {
    collapsed: false
  }).addTo(map);



  // =====================================================
  // LEGEND
  // =====================================================

  const legend = L.control({
    position: "bottomright"
  });

  legend.onAdd = function () {

    const div = L.DomUtil.create("div", "info legend");

    div.innerHTML = `

      <h4>Legend</h4>

      <div>
        <span class="legend-color" style="background:#e53935;"></span>
        LDF
      </div>

      <div>
        <span class="legend-color" style="background:#1e88e5;"></span>
        UDF
      </div>

      <div>
        <span class="legend-color" style="background:#fb8c00;"></span>
        NDA
      </div>

      <hr>

      <div>
        <span class="district-line"></span>
        District Boundary
      </div>
    `;

    return div;
  };

  legend.addTo(map);



  // =====================================================
  // SEARCH CONTROL
  // =====================================================

  const searchableLayers = L.layerGroup([
    lsLayer,
    acLayer,
    districtLayer
  ]);


  const searchControl = new L.Control.Search({

    layer: searchableLayers,

    propertyName: 'name',

    initial: false,

    zoom: 10,

    marker: false,

    moveToLocation: function(latlng, title, map) {

      map.setView(latlng, 10);
    }
  });


  searchControl.on('search:locationfound', function(e) {

    if (e.layer.setStyle) {

      e.layer.setStyle({
        weight: 4,
        color: '#000',
        fillOpacity: 1
      });
    }


    if (e.layer.openPopup) {
      e.layer.openPopup();
    }
  });


  map.addControl(searchControl);

})

.catch(err => console.error(err));