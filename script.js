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
let lsgiLayer;

const lsgiLookup = {};


// =====================================================
// LOAD ALL DATA
// =====================================================

Promise.all([

  fetch('data/kerala_loksabha/kerala_loksabha_mapped.geojson')
    .then(res => res.json()),

  fetch('data/kerala_stateassembly/kerala_stateassembly_2026_mapped.geojson')
    .then(res => res.json()),

  fetch('data/kerala_district.geojson')
    .then(res => res.json()),
  
  fetch('data/kerala_lsgi/kerala_lsgi_boundary_layer.geojson')
    .then(r => r.json()),

  fetch("data/kerala_lsgi/kerala_lsgi_summary_2025.csv").then(r=>r.text())

])

.then(([lsData, acData, districtData, lsgiData, lsgiSummaryCsv]) => {

  // Parse the LSGI summary CSV
const lines = lsgiSummaryCsv.trim().split("\n");

const headers = lines[0].split(",");

lines.slice(1).forEach(line => {

    const values = line.split(",");

    const row = {};

    headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim();
    });

    lsgiLookup[row.sec_kerala_code] = row;

});

console.log(lsgiLookup);

  // =====================================================
  // LOK SABHA LAYER
  // =====================================================

  lsLayer = L.geoJSON(lsData, {

    style: style,

    onEachFeature: function(feature, layer) {

      const p = feature.properties;


      // Standardized search name
      feature.properties.name = p.ls_seat_name;

      feature.properties.search_label =
      `${p.ls_seat_name} (Lok Sabha)`;


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
              ${p.winning_party} (${p.winning_party_full})<br>

              <strong>Front:</strong>
              ${p.winning_front} (${p.fron_full})<br>

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

      feature.properties.search_label =
        `${p.Asmbly_Con} (Assembly)`;


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
              ${p.winning_party} (${p.winning_party_full})<br>

              <strong>Front:</strong>
              ${p.winning_front} (${p.winning_front_full})<br>

              <strong>Election Year:</strong>
              ${p.election_year || "2026"}<br>

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

      feature.properties.search_label =
        `${p.DISTRICT} (District)`;


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
// LSGI LAYER
// =====================================================

lsgiLayer = L.geoJSON(lsgiData, {

  style: {
    color: "#444",
    weight: 1,
    fillColor: "#4CAF50",
    fillOpacity: 0.5
  },

  onEachFeature: function (feature, layer) {

    const p = feature.properties;

    const info = lsgiLookup[p.sec_kerala_code];

    // Tooltip
    layer.bindTooltip(
      info ? info.lsgi_name : p.lsgd_name,
      {
        sticky: true,
        direction: "top",
        className: "constituency-label"
      }
    );

    // Popup
    layer.on("click", function () {

      const info = lsgiLookup[p.sec_kerala_code];

      if (!info) {
        layer.bindPopup("<b>Information not found.</b>").openPopup();
        return;
      }

      layer.bindPopup(`
        <div style="font-size:14px;">

          <strong style="font-size:16px;">
            ${info.lsgd_name}
          </strong>

          <br><br>

          <strong>Type:</strong>
          ${info.lsgd_type}<br>

          <strong>District:</strong>
          ${info.district}<br>

          <strong>Total Wards:</strong>
          ${info.number_of_wards}<br>

          <hr>

          <strong>Majority Front:</strong>
          ${info.majority_front}<br>

          <strong>Largest Front:</strong>
          ${info.largest_front}<br>

          <strong>Majority:</strong>
          ${info.majority_number}<br>

          <hr>

          <strong>LDF:</strong> ${info.LDF}<br>
          <strong>UDF:</strong> ${info.UDF}<br>
          <strong>NDA:</strong> ${info.NDA}<br>
          <strong>OTH:</strong> ${info.OTH}

        </div>
      `).openPopup();

    });

  }

});
// =====================================================
// DEFAULT LAYER
// =====================================================

map.addLayer(lsLayer);

map.fitBounds(lsLayer.getBounds());


// Ensure only LS layer loads initially
map.removeLayer(acLayer);
map.removeLayer(districtLayer);
map.removeLayer(lsgiLayer);

  // =====================================================
  // TOGGLE CONTROL
  // =====================================================

  const baseMaps = {
    "Lok Sabha": lsLayer,
    "State Assembly": acLayer,
    "Districts": districtLayer,
    "Local Bodies": lsgiLayer
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

    propertyName: 'search_label',

    initial: false,

    zoom: 10,

    marker: false,

    moveToLocation: function(latlng, title, map) {

      map.setView(latlng, 10);
    }
  });

  searchControl.on('search:locationfound', function(e) {

    const props = e.layer.feature.properties;
  
  
    // =========================
    // Switch to Lok Sabha Layer
    // =========================
  
    if (props.ls_seat_name) {
  
      if (map.hasLayer(acLayer)) {
        map.removeLayer(acLayer);
      }
  
      if (map.hasLayer(districtLayer)) {
        map.removeLayer(districtLayer);
      }
  
      map.addLayer(lsLayer);
    }
  
  
    // =========================
    // Switch to Assembly Layer
    // =========================
  
    if (props.Asmbly_Con) {
  
      if (map.hasLayer(lsLayer)) {
        map.removeLayer(lsLayer);
      }
  
      if (map.hasLayer(districtLayer)) {
        map.removeLayer(districtLayer);
      }
  
      map.addLayer(acLayer);
    }
  
  
    // =========================
    // Switch to District Layer
    // =========================
  
    if (props.DISTRICT) {
  
      if (map.hasLayer(lsLayer)) {
        map.removeLayer(lsLayer);
      }
  
      if (map.hasLayer(acLayer)) {
        map.removeLayer(acLayer);
      }
  
      map.addLayer(districtLayer);
    }
  
  
    // Highlight searched feature
  
    if (e.layer.setStyle) {
  
      e.layer.setStyle({
        weight: 4,
        color: '#000',
        fillOpacity: 1
      });
    }
  
  
    // Open popup if available
  
    if (e.layer.openPopup) {
      e.layer.openPopup();
    }
  
  });


 map.addControl(searchControl);

})
.catch(err => console.error(err));