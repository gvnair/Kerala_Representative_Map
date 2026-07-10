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

function getAllianceColor(front) {

  if (front === "LDF") return "#e53935";
  if (front === "UDF") return "#1e88e5";
  if (front === "NDA") return "#fb8c00";

  return "#9e9e9e";
}


// =====================================================
// CONSTITUENCY STYLE
// =====================================================

function style(feature) {

  return {
    fillColor: getAllianceColor(feature.properties.winning_front),
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
let localBodyLayer = null;

const localBodyCache = {};
function getDistrictFile(district) {
    return district.toLowerCase().replace(/\s+/g, "_") + ".geojson";
}
let wardLayer = null;

const wardCache = {};

let lsgiLookup = {};

function switchToLayer(targetLayer) {

    [
        districtLayer,
        acLayer,
        lsLayer,
        localBodyLayer,
        wardLayer
    ].forEach(layer => {

        if (layer && map.hasLayer(layer)) {
            map.removeLayer(layer);
        }

    });

    if (targetLayer) {
        map.addLayer(targetLayer);
    }

}

// =====================================================
// LOCAL BODY LOADER
// =====================================================

async function loadLocalBodies(district) {

    // Hide district layer
    if (map.hasLayer(districtLayer)) {
        map.removeLayer(districtLayer);
    }

    // Remove previous local body layer
    if (localBodyLayer && map.hasLayer(localBodyLayer)) {
        map.removeLayer(localBodyLayer);
    }

    const filename = getDistrictFile(district);

    localBodyLayer = L.geoJSON(geojson, {

    style: function(feature) {

        const info = lsgiLookup[feature.properties.sec_kerala_code];

        return {
            color: "#444",
            weight: 1,
            fillColor: info
                ? getAllianceColor(info.majority_front)
                : "#9e9e9e",
            fillOpacity: 0.65
        };

    },

    onEachFeature: function(feature, layer) {

    layer.on("click", function() {

        const info = lsgiLookup[feature.properties.sec_kerala_code];

        if (!info) {
            alert("Lookup not found");
            return;
        }

        loadWardLayer(
            info.district,
            info.sec_kerala_code
        );

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

    localBodyCache[district] = localBodyLayer;

    map.addLayer(localBodyLayer);

}

// =====================================================
// WARD LOADER
// =====================================================

async function loadWardLayer(district, secKeralaCode) {

    // Remove the currently displayed ward layer
    if (wardLayer) {
        map.removeLayer(wardLayer);
    }

    const filename = getDistrictFile(district);

    let wardData;

    // ---------- CACHE ----------
    if (wardCache[district]) {

        const response = await fetch(
            `data/kerala_lsgi/wards/${filename}`
        );

        wardData = await response.json();

        wardCache[district] = wardData;

    }

    // ---------- DRAW LAYER ----------
    wardLayer = L.geoJSON(wardData, {
      filter: function(feature) {

          return feature.properties.sec_kerala_code === secKeralaCode;

        },
        style: {
            color: "#666",
            weight: 1,
            fillColor: "#cccccc",
            fillOpacity: 0.25
        }

    });

    wardLayer.addTo(map);
    if (wardLayer.getBounds().isValid()) {
    map.fitBounds(wardLayer.getBounds(), {
        padding: [30, 30]
    });
}

}
// =====================================================
// LOAD ALL DATA
// =====================================================

Promise.all([

  fetch('data/kerala_loksabha/kerala_loksabha_mapped.geojson')
    .then(res => res.json()),

  fetch('data/kerala_stateassembly/kerala_stateassembly_2026_mapped.geojson')
    .then(res => res.json()),

  fetch('data/districts.geojson')
    .then(res => res.json()),

  fetch("data/kerala_lsgi/kerala_lsgi_summary_2025_lookup.json")
    .then(r => r.json())

])

.then(([lsData, acData, districtData, lookup]) => {

  lsgiLookup = lookup;

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

      feature.properties.layer_type = "loksabha";


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

        feature.properties.layer_type = "assembly";


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
      feature.properties.name = p.district;

      feature.properties.search_label =
        `${p.district} (District)`;

        feature.properties.layer_type = "district";


      layer.bindTooltip(
        p.district,
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
        },

        click: async function () {

    await loadLocalBodies(p.district);

}
}
        
      );
    }
  });

  /*
  // =====================================================
// LSGI LAYER
// =====================================================

lsgiLayer = L.geoJSON(lsgiData, {

  style: function(feature) {

    const info = lsgiLookup[feature.properties.sec_kerala_code];

    return {
        color: "#444",
        weight: 1,
        fillColor: info
            ? getAllianceColor(info.majority_front)
            : "#9e9e9e",
        fillOpacity: 0.6
    };

},

  onEachFeature: function (feature, layer) {

    const p = feature.properties;

    const info = lsgiLookup[p.sec_kerala_code];

    if (info) {

    feature.properties.name = info.lsgd_name;

    feature.properties.search_label =
        `${info.lsgd_name} (${info.lsgd_type})`;

    feature.properties.layer_type = "lsgd";

}
    // Tooltip
    layer.bindTooltip(
      info ? info.lsgd_name : p.lsgd_name,
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

    console.log(info);

    loadWardLayer(
        info.district,
        info.sec_kerala_code
    );

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

  }   // closes onEachFeature

});    // closes L.geoJSON
*/
// =====================================================
// DEFAULT LAYER
// =====================================================

map.addLayer(districtLayer);

if (districtLayer.getBounds().isValid()) {
    map.fitBounds(districtLayer.getBounds());
}

if (lsLayer) map.removeLayer(lsLayer);
if (acLayer) map.removeLayer(acLayer);

  // =====================================================
  // TOGGLE CONTROL
  // =====================================================

  const baseMaps = {
    "Districts": districtLayer,
    "State Assembly": acLayer,
    "Lok Sabha": lsLayer
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
  
  
    if (props.layer_type === "loksabha") {
    switchToLayer(lsLayer);
}

if (props.layer_type === "assembly") {
    switchToLayer(acLayer);
}

if (props.layer_type === "district") {
    switchToLayer(districtLayer);
}

if (props.layer_type === "lsgi") {
    // Dynamic local body loading will be added later.
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