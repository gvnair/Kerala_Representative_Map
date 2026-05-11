var map = L.map('map');


// ----------------------------
// Base Map
// ----------------------------

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);



// ----------------------------
// Alliance Colors
// ----------------------------

function getColor(winning_front) {

  if (winning_front === "LDF") return "#e53935";
  if (winning_front === "UDF") return "#1e88e5";
  if (winning_front === "NDA") return "#fb8c00";

  return "#9e9e9e";
}



// ----------------------------
// Constituency Style
// ----------------------------

function style(feature) {

  return {
    fillColor: getColor(feature.properties.winning_front),
    weight: 1,
    opacity: 1,
    color: "white",
    fillOpacity: 0.75
  };

}



// ----------------------------
// Hover Highlight
// ----------------------------

function highlightFeature(e) {

  const layer = e.target;

  layer.setStyle({
    weight: 3,
    color: "#222",
    fillOpacity: 1
  });

  layer.bringToFront();
}



// ----------------------------
// Layer Variables
// ----------------------------

let lsLayer;
let acLayer;
let districtLayer;



// ----------------------------
// Load ALL GeoJSON Files
// ----------------------------

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

      layer.bindTooltip(
        p.ls_seat_name,
        {
          sticky: true,
          direction: "top",
          className: "constituency-label"
        }
      );

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
              ${p.election_year || "2024"}<br>

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

      layer.bindTooltip(
        p.Asmbly_Con,
        {
          sticky: true,
          direction: "top",
          className: "constituency-label"
        }
      );

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
              ${2026}<br>

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
  // DISTRICT LAYER
  // =====================================================

  districtLayer = L.geoJSON(districtData, {

    style: function(feature) {

      return {
        color: "#222",
        weight: 2,
        fillColor: "#eeeeee",
        fillOpacity: 0.0
      };

    },

    onEachFeature: function(feature, layer) {

      const p = feature.properties;

      layer.bindTooltip(
        p.DISTRICT || p.name,
        {
          sticky: true,
          direction: "top",
          className: "constituency-label"
        }
      );

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

})

.catch(err => console.error(err));