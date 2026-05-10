var map = L.map('map');


// Base map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);



// Alliance colors
function getColor(front) {

  if (winning_front === "LDF") return "#e53935";
  if (winning_front === "UDF") return "#1e88e5";
  if (winning_front === "NDA") return "#fb8c00";

  return "#9e9e9e";
}



// Polygon style
function style(feature) {

  return {
    fillColor: getColor(feature.properties.front),
    weight: 1,
    opacity: 1,
    color: "white",
    fillOpacity: 0.75
  };

}



// Hover effect
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
// Lok Sabha Layer
// ----------------------------

let lsLayer;
let acLayer;



fetch('data/loksabha_kerala_mapped.geojson')

  .then(res => res.json())

  .then(lsData => {

    lsLayer = L.geoJSON(lsData, {

      style: style,

      onEachFeature: function(feature, layer) {

        const p = feature.properties;



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



    // Add default layer
    lsLayer.addTo(map);

    map.fitBounds(lsLayer.getBounds());



    // ----------------------------
    // Assembly Layer
    // ----------------------------

    fetch('data/stateassembly_2026_mapped.geojson')

      .then(res => res.json())

      .then(acData => {

        acLayer = L.geoJSON(acData, {

          style: style,

          onEachFeature: function(feature, layer) {

            const p = feature.properties;



            layer.bindTooltip(
              p.ac_name,
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

                    <strong>MLA:</strong>
                    ${p.elected_representative}<br>

                    <strong>Party:</strong>
                    ${p.winning_party}<br>

                    <strong>Front:</strong>
                    ${p.winning_front}<br>

                  
                  </div>
                `).openPopup();

              }

            });

          }

        });



        // Layer control
        const overlays = {
          "Lok Sabha": lsLayer,
          "State Assembly": acLayer
        };



        L.control.layers(null, overlays, {
          collapsed: false
        }).addTo(map);

      });

  })

  .catch(err => console.error(err));