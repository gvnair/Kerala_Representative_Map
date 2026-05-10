var map = L.map('map').setView([10.8505, 76.2711], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


function getColor(front) {

  if (front === "LDF") return "red";
  if (front === "UDF") return "green";
  if (front === "NDA") return "orange";

  return "gray";
}


fetch('data/loksabha_kerala_mapped.geojson')

  .then(res => res.json())

  .then(data => {

    const layer = L.geoJSON(data, {

      style: function(feature) {

        return {
          fillColor: getColor(feature.properties.front),
          weight: 1,
          color: "white",
          fillOpacity: 0.7
        };

      },

      onEachFeature: function(feature, layer) {

        const p = feature.properties;

        layer.on({

          mouseover: function(e) {

            e.target.setStyle({
              weight: 2,
              fillOpacity: 0.9
            });

          },

          mouseout: function(e) {

            layer.setStyle({
              weight: 1,
              fillOpacity: 0.7
            });

          },

          click: function() {

            layer.bindPopup(`
              <strong>${p.ls_seat_name}</strong><br>
              MP: ${p.elected_representative}<br>
              Party: ${p.winning_party}<br>
              Front: ${p.front}<br>
              Margin: ${p.margin}<br>
              Turnout: ${p.turnout_percentage}
            `).openPopup();

          }

        });

      }

    }).addTo(map);

    map.fitBounds(layer.getBounds());

  })

  .catch(err => console.error(err));