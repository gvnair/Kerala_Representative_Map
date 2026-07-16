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

  const normalizedFront = String(front || "").trim().toUpperCase();

  if (normalizedFront === "LDF") return "#e53935";
  if (normalizedFront === "UDF") return "#1e88e5";
  if (normalizedFront === "NDA") return "#fb8c00";

  return "#9e9e9e";
}

function getNeutralStyle(overrides = {}) {
  return {
    fillColor: "#f5f5f5",
    weight: 1.2,
    opacity: 1,
    color: "#555",
    fillOpacity: 0.14,
    ...overrides
  };
}

function getSelectedStyle(front, overrides = {}) {
  if (front && ["LDF", "UDF", "NDA"].includes(front)) {
    return {
      fillColor: getAllianceColor(front),
      color: "#000",
      weight: 2.5,
      fillOpacity: 0.9,
      ...overrides
    };
  }

  return getNeutralStyle({
    color: "#000",
    weight: 2.8,
    fillOpacity: 0.28,
    ...overrides
  });
}

function applySelectionStyle(layer, front, overrides = {}) {
  layer.setStyle(getSelectedStyle(front, overrides));
}

// =====================================================
// CONSTITUENCY STYLE
// =====================================================

function style(feature) {
  return getNeutralStyle();
}

// =====================================================
// HOVER HIGHLIGHT
// =====================================================

function highlightFeature(e) {

  const layer = e.target;

  if (
    (selectedLS && selectedLS === layer) ||
    (selectedAC && selectedAC === layer) ||
    (selectedDistrict && selectedDistrict === layer) ||
    (selectedLocalBody && selectedLocalBody === layer) ||
    (selectedWard && selectedWard === layer)
  ) {
    return;
  }

  layer.setStyle(getNeutralStyle({
    weight: 3,
    color: "#222",
    fillOpacity: 0.24
  }));

  layer.bringToFront();
}

// =====================================================
// LAYER VARIABLES
// =====================================================

let lsLayer;
let acLayer;
let districtLayer;
let localBodyLayer = null;
let selectedLocalBody = null;
let selectedDistrict = null;
let selectedAC = null;
let selectedLS = null;
let selectedWard = null;

const localBodyCache = {};
function getDistrictFile(district) {
    return district.toLowerCase().replace(/\s+/g, "_") + ".geojson";
}
let wardLayer = null;
let currentDistrict = null;
let currentLocalBody = null;
const wardCache = {};

let lsgiLookup = {};

function resetSelectedLocalBody() {
    if (selectedLocalBody && selectedLocalBody.setStyle) {
        selectedLocalBody.setStyle(getNeutralStyle());
    }
}

function resetDrillDownState({ preserveLocalBodyLayer = false } = {}) {
    map.closePopup();

    if (wardLayer) {
        if (map.hasLayer(wardLayer)) {
            map.removeLayer(wardLayer);
        }
        wardLayer = null;
    }

    if (localBodyLayer) {
        if (map.hasLayer(localBodyLayer)) {
            map.removeLayer(localBodyLayer);
        }

        if (!preserveLocalBodyLayer) {
            searchableLayers.removeLayer(localBodyLayer);
            localBodyLayer = null;
        }
    }

    resetSelectedLocalBody();

    if (selectedDistrict && districtLayer) {
        districtLayer.resetStyle(selectedDistrict);
    }

    if (selectedWard && wardLayer === null) {
        selectedWard = null;
    }

    if (selectedAC && acLayer) {
        acLayer.resetStyle(selectedAC);
        selectedAC = null;
    }

    if (selectedLS && lsLayer) {
        lsLayer.resetStyle(selectedLS);
        selectedLS = null;
    }

    selectedLocalBody = null;
    selectedDistrict = null;
    currentLocalBody = null;
    currentDistrict = null;

    updateBackButton();
}

function activateTopLevelLayer(targetLayer) {
    resetDrillDownState();

    [districtLayer, acLayer, lsLayer].forEach(layer => {
      if (layer && layer !== targetLayer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    if (targetLayer && !map.hasLayer(targetLayer)) {
      map.addLayer(targetLayer);
    }
}

function switchToLayer(targetLayer) {
    activateTopLevelLayer(targetLayer);
}
// Searchable layers group — initialize early so loaders can safely reference it
let searchableLayers = L.layerGroup();

// =====================================================
// BACK BUTTON
// =====================================================

const backButton = document.getElementById("backButton");
const browseSidebar = document.getElementById("browseSidebar");
const browseSidebarToggle = document.getElementById("browseSidebarToggle");
const districtSelect = document.getElementById("districtSelect");
const localBodyTypeSelect = document.getElementById("localBodyTypeSelect");
const localBodySelect = document.getElementById("localBodySelect");
const mobileMenuToggle = document.getElementById("mobileMenuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const mobileMenuBackdrop = document.getElementById("mobileMenuBackdrop");
const mobileMenuClose = document.getElementById("mobileMenuClose");
const mobileDistrictSelect = document.getElementById("mobileDistrictSelect");
const mobileLocalBodyTypeSelect = document.getElementById("mobileLocalBodyTypeSelect");
const mobileLocalBodySelect = document.getElementById("mobileLocalBodySelect");
const mobileAccordionButtons = Array.from(document.querySelectorAll(".mobile-menu__section-toggle"));
const mobileMenuSections = Array.from(document.querySelectorAll(".mobile-menu__section"));
const titleCard = document.getElementById("title-card");
const titleHeading = titleCard ? titleCard.querySelector("h2") : null;
const mobileSearchInput = document.getElementById("mobileSearchInput");
const mobileSearchButton = document.getElementById("mobileSearchButton");
let isMobileMenuOpen = false;
let hasInteractedWithMobileUI = false;
let searchControl = null;

function updateBackButton() {

    if (wardLayer && map.hasLayer(wardLayer)) {
        backButton.style.display = "block";
        backButton.innerText = "← Back to Local Bodies";
    }
    else if (localBodyLayer && map.hasLayer(localBodyLayer)) {
        backButton.style.display = "block";
        backButton.innerText = "← Back to Districts";
    }
    else {
        backButton.style.display = "none";
    }
}
backButton.onclick = function () {
    if (wardLayer && map.hasLayer(wardLayer)) {
        const previousLocalBodyLayer = localBodyLayer;
        resetDrillDownState({ preserveLocalBodyLayer: true });
        if (previousLocalBodyLayer) {
            map.addLayer(previousLocalBodyLayer);
        }
        if (districtLayer) {
            map.addLayer(districtLayer);
            map.fitBounds(districtLayer.getBounds());
        }
        updateBackButton();
        return;
    }

    if (localBodyLayer && map.hasLayer(localBodyLayer)) {
        resetDrillDownState();
        if (districtLayer) {
            map.addLayer(districtLayer);
            map.fitBounds(districtLayer.getBounds());
        }
        return;
    }

    updateBackButton();
};

function populateDistrictOptions(lookup) {
  const districts = Array.from(
    new Set(
      Object.values(lookup || {})
        .filter(Boolean)
        .map(item => item.district)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const optionsHtml = '<option value="">Select district</option>' +
    districts.map(district => `<option value="${district}">${district}</option>`).join('');

  [districtSelect, mobileDistrictSelect].forEach(select => {
    if (!select) return;
    select.innerHTML = optionsHtml;
  });
}

function populateLocalBodyTypeOptions(district) {
  const selects = [localBodyTypeSelect, mobileLocalBodyTypeSelect].filter(Boolean);

  if (!district) {
    const disabledMessage = '<option value="">Choose a district first</option>';
    selects.forEach(select => {
      select.innerHTML = disabledMessage;
      select.disabled = true;
    });
    return;
  }

  const typeOrder = [
    "District Panchayat",
    "Block Panchayat",
    "Grama Panchayat",
    "Municipality",
    "Municipal Corporation"
  ];

  const types = Array.from(
    new Set(
      Object.values(lsgiLookup || {})
        .map(item => item && item.lsgd_type)
        .filter(Boolean)
    )
  );

  const orderedTypes = types.sort((a, b) => {
    const indexA = typeOrder.indexOf(a);
    const indexB = typeOrder.indexOf(b);

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    return a.localeCompare(b);
  });

  const optionsHtml = '<option value="">Select local body type</option>' +
    orderedTypes.map(type => `<option value="${type}">${type}</option>`).join('');

  selects.forEach(select => {
    select.innerHTML = optionsHtml;
    select.disabled = false;
  });
}

function populateLocalBodyOptions(district, type) {
  const selects = [localBodySelect, mobileLocalBodySelect].filter(Boolean);

  if (!district || !type) {
    const placeholder = '<option value="">Choose a type first</option>';
    selects.forEach(select => {
      select.innerHTML = placeholder;
      select.disabled = true;
    });
    return;
  }

  const entries = Object.values(lsgiLookup || {})
    .filter(item => item && item.district === district && item.lsgd_type === type)
    .sort((a, b) => a.lsgd_name.localeCompare(b.lsgd_name));

  if (!entries.length) {
    const placeholder = '<option value="">No local bodies found</option>';
    selects.forEach(select => {
      select.innerHTML = placeholder;
      select.disabled = true;
    });
    return;
  }

  const optionsHtml = '<option value="">Select local body</option>' +
    entries.map(item => `<option value="${item.sec_kerala_code}">${item.lsgd_name}</option>`).join('');

  selects.forEach(select => {
    select.innerHTML = optionsHtml;
    select.disabled = false;
  });
}

function findLayerByFeatureProperty(layerGroup, propertyName, value) {
  if (!layerGroup || !layerGroup.getLayers) return null;

  return layerGroup.getLayers().find(layer => {
    const layerFeature = layer.feature || {};
    const properties = layerFeature.properties || {};
    return String(properties[propertyName] || "") === String(value);
  }) || null;
}

async function activateDistrictSelection(layer, districtName) {
  if (selectedDistrict && selectedDistrict !== layer && districtLayer) {
    districtLayer.resetStyle(selectedDistrict);
  }

  selectedDistrict = layer;

  [districtSelect, mobileDistrictSelect].forEach(select => {
    if (select) {
      select.value = districtName;
    }
  });

  populateLocalBodyTypeOptions(districtName);
  [localBodySelect, mobileLocalBodySelect].forEach(select => {
    if (select) {
      select.innerHTML = '<option value="">Choose a type first</option>';
      select.disabled = true;
    }
  });
  [localBodyTypeSelect, mobileLocalBodyTypeSelect].forEach(select => {
    if (select) {
      select.value = "";
    }
  });

  applySelectionStyle(selectedDistrict, null, {
    color: "#000",
    weight: 3.2,
    fillOpacity: 0.28
  });

  map.fitBounds(layer.getBounds(), {
    padding: [30, 30]
  });

  await loadLocalBodies(districtName);
}

async function activateLocalBodySelection(feature, layer, info) {
  if (selectedLocalBody && selectedLocalBody !== layer) {
    selectedLocalBody.setStyle(getNeutralStyle());
  }

  selectedLocalBody = layer;

  if (!info) {
    console.warn("Lookup not found");
    return;
  }

  [localBodySelect, mobileLocalBodySelect].forEach(select => {
    if (select) {
      select.value = info.sec_kerala_code;
    }
  });

  currentLocalBody = feature.properties.sec_kerala_code;

  map.fitBounds(layer.getBounds(), {
    padding: [20, 20]
  });

  applySelectionStyle(layer, info.majority_front || info.largest_front || null, {
    weight: 2.7,
    fillOpacity: 0.28
  });

  if (window.innerWidth <= 768) {
    closeMobileMenu();
  }

  await loadWardLayer(info.district, info.sec_kerala_code);

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
}

function compactMobileTitle() {
  if (!titleCard || hasInteractedWithMobileUI) return;

  hasInteractedWithMobileUI = true;
  titleCard.classList.add("title-card--compact");

  if (titleHeading) {
    titleHeading.textContent = "Kerala Map";
  }

}

function markMobileInteraction() {
  if (window.innerWidth > 768) return;
  compactMobileTitle();
}

function handleTitleHomeAction() {
  if (!districtLayer) return;
  resetDrillDownState();
  switchToLayer(districtLayer);
  map.fitBounds(districtLayer.getBounds(), {
    padding: [20, 20]
  });
}

function triggerMobileSearch() {
  if (!mobileSearchInput || !searchControl) return;
  const query = mobileSearchInput.value.trim();
  if (!query) return;

  if (typeof searchControl.searchText === "function") {
    searchControl.searchText(query);
  } else if (searchControl._input) {
    searchControl._input.value = query;
    if (typeof searchControl._search === "function") {
      searchControl._search();
    }
  }

  markMobileInteraction();
}

function openMobileMenu() {
  if (!mobileMenu || !mobileMenuBackdrop) return;
  mobileMenu.classList.add("is-open");
  mobileMenuBackdrop.classList.add("is-visible");
  mobileMenu.setAttribute("aria-hidden", "false");
  mobileMenuToggle.setAttribute("aria-expanded", "true");
  markMobileInteraction();
  isMobileMenuOpen = true;
}

function closeMobileMenu() {
  if (!mobileMenu || !mobileMenuBackdrop) return;
  mobileMenu.classList.remove("is-open");
  mobileMenuBackdrop.classList.remove("is-visible");
  mobileMenu.setAttribute("aria-hidden", "true");
  mobileMenuToggle.setAttribute("aria-expanded", "false");
  isMobileMenuOpen = false;
}

function toggleMobileMenu() {
  if (isMobileMenuOpen) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

function setMobileAccordionState(sectionElement, shouldOpen) {
  if (!sectionElement) return;
  sectionElement.classList.toggle("is-open", shouldOpen);
  const toggle = sectionElement.querySelector(".mobile-menu__section-toggle");
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(shouldOpen));
  }
}

function collapseBrowseMenuSection() {
  const browseSection = mobileMenuSections.find(section => section.querySelector("[data-target='browseMobilePanel']"));
  if (browseSection) {
    setMobileAccordionState(browseSection, false);
  }
}

function setupBrowseSidebar() {
  if (!browseSidebar || !browseSidebarToggle || !districtSelect || !localBodyTypeSelect || !localBodySelect) return;

  browseSidebarToggle.addEventListener("click", function () {
    const isCollapsed = browseSidebar.classList.toggle("is-collapsed");
    browseSidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
    browseSidebarToggle.querySelector(".browse-sidebar__toggle-icon").textContent = isCollapsed ? "+" : "−";
  });

  if (titleCard) {
    titleCard.addEventListener("click", function (event) {
      if (event.target.closest("a")) return;
      handleTitleHomeAction();
      markMobileInteraction();
    });
  }

  map.on("click", markMobileInteraction);
  map.on("zoom", markMobileInteraction);
  map.on("move", markMobileInteraction);

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", function () {
      markMobileInteraction();
      toggleMobileMenu();
    });
  }

  if (mobileMenuClose) {
    mobileMenuClose.addEventListener("click", closeMobileMenu);
  }

  if (mobileMenuBackdrop) {
    mobileMenuBackdrop.addEventListener("click", closeMobileMenu);
  }

  if (mobileSearchInput) {
    mobileSearchInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        triggerMobileSearch();
      }
    });
  }

  if (mobileSearchButton) {
    mobileSearchButton.addEventListener("click", triggerMobileSearch);
  }

  mobileAccordionButtons.forEach(button => {
    button.addEventListener("click", function () {
      const section = this.closest(".mobile-menu__section");
      const shouldOpen = !section.classList.contains("is-open");

      mobileMenuSections.forEach(item => {
        const toggle = item.querySelector(".mobile-menu__section-toggle");
        if (toggle && toggle !== this) {
          setMobileAccordionState(item, false);
        }
      });

      if (shouldOpen) {
        setMobileAccordionState(section, true);
      } else {
        setMobileAccordionState(section, false);
      }

      markMobileInteraction();
    });
  });

  const handleDistrictSelection = async function (sourceSelect) {
    const districtName = sourceSelect.value;

    if (!districtName) {
      [localBodyTypeSelect, mobileLocalBodyTypeSelect].forEach(select => {
        if (select) {
          select.innerHTML = '<option value="">Choose a district first</option>';
          select.disabled = true;
        }
      });

      [localBodySelect, mobileLocalBodySelect].forEach(select => {
        if (select) {
          select.innerHTML = '<option value="">Choose a type first</option>';
          select.disabled = true;
        }
      });
      return;
    }

    populateLocalBodyTypeOptions(districtName);
    [localBodySelect, mobileLocalBodySelect].forEach(select => {
      if (select) {
        select.innerHTML = '<option value="">Choose a type first</option>';
        select.disabled = true;
      }
    });

    const districtLayerMatch = findLayerByFeatureProperty(districtLayer, "district", districtName);
    if (districtLayerMatch) {
      await activateDistrictSelection(districtLayerMatch, districtName);
    }
  };

  const handleLocalBodyTypeSelection = function (sourceSelect) {
    const districtName = districtSelect.value || mobileDistrictSelect?.value || "";
    const typeName = sourceSelect.value;

    populateLocalBodyOptions(districtName, typeName);
  };

  const handleLocalBodySelection = async function (sourceSelect) {
    const secCode = sourceSelect.value;

    if (!secCode) return;

    const info = Object.values(lsgiLookup || {}).find(item => item && item.sec_kerala_code === secCode);

    if (!info) return;

    if (!localBodyLayer) {
      await loadLocalBodies(info.district);
    }

    const layerMatch = findLayerByFeatureProperty(localBodyLayer, "sec_kerala_code", secCode);
    if (layerMatch) {
      await activateLocalBodySelection(layerMatch.feature, layerMatch, info);
    }
  };

  [districtSelect, mobileDistrictSelect].forEach(select => {
    if (!select) return;
    select.addEventListener("change", async function () {
      [districtSelect, mobileDistrictSelect].forEach(item => {
        if (item && item !== this) {
          item.value = this.value;
        }
      });
      await handleDistrictSelection(this);
    });
  });

  [localBodyTypeSelect, mobileLocalBodyTypeSelect].forEach(select => {
    if (!select) return;
    select.addEventListener("change", function () {
      [localBodyTypeSelect, mobileLocalBodyTypeSelect].forEach(item => {
        if (item && item !== this) {
          item.value = this.value;
        }
      });
      handleLocalBodyTypeSelection(this);
    });
  });

  [localBodySelect, mobileLocalBodySelect].forEach(select => {
    if (!select) return;
    select.addEventListener("change", async function () {
      [localBodySelect, mobileLocalBodySelect].forEach(item => {
        if (item && item !== this) {
          item.value = this.value;
        }
      });
      await handleLocalBodySelection(this);
    });
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 768) {
      closeMobileMenu();
    }
  });
}

// =====================================================
// LOCAL BODY LOADER
// =====================================================

async function loadLocalBodies(district) {

  currentDistrict = district;

  resetDrillDownState();

    const filename = getDistrictFile(district);

let geojson;

// ---------- CACHE ----------
if (localBodyCache[district]) {

    geojson = localBodyCache[district];

} else {

    const response = await fetch(
        `data/kerala_lsgi/localbodies/${filename}`
    );

    geojson = await response.json();

    localBodyCache[district] = geojson;

}
// ---------- DRAW ----------
localBodyLayer = L.geoJSON(geojson, {

    style: function(feature) {

        const info = lsgiLookup[feature.properties.sec_kerala_code];

        return getNeutralStyle({
          color: "#555",
          weight: 1.3,
          fillOpacity: 0.14
        });

    },

    onEachFeature: function(feature, layer) {
         const info = lsgiLookup[feature.properties.sec_kerala_code];

    if (info) {

        layer.bindTooltip(
            `
            <strong>${info.lsgd_name}</strong><br>
            ${info.lsgd_type}
            `,
            {
                sticky: true,
                direction: "top",
                className: "constituency-label"
            }
        );

    }

   layer.on("click", async function() {
        await activateLocalBodySelection(feature, layer, info);
    });
    
   
}

});

    map.addLayer(localBodyLayer);
    searchableLayers.addLayer(localBodyLayer);
    updateBackButton();
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

    let geojson;

    // ---------- CACHE ----------Í
if (wardCache[district]) {

    geojson = wardCache[district];

} else {

    const response = await fetch(
        `data/kerala_lsgi/wards/${filename}`
    );

    geojson = await response.json();

    wardCache[district] = geojson;

}

    // ---------- DRAW LAYER ----------
    wardLayer = L.geoJSON(geojson, {
      filter: function(feature) {

          return feature.properties.sec_kerala_code === secKeralaCode;

        },
      style: function(feature) {

    return getNeutralStyle({
      color: "#555",
      weight: 0.8,
      fillOpacity: 0.14
    });

  },
  onEachFeature: function(feature, layer) {

    const p = feature.properties;

     layer.bindTooltip(
    `
    <strong>Ward ${p.ward_number}</strong><br>
    ${p.ward_name}
    `,
    {
      sticky: true,
      direction: "top",
      className: "constituency-label"
    }
  );

    layer.on("click", function() {

      // ensure only one ward highlighted at a time
      if (selectedWard && selectedWard !== layer && wardLayer) {
        wardLayer.resetStyle(selectedWard);
      }
      selectedWard = layer;

      applySelectionStyle(layer, p.winning_front, {
        weight: 1.4,
        fillOpacity: 0.28
      });

      layer.bringToFront();

      layer.bindPopup(`

        <div style="font-size:14px;">

          <strong style="font-size:16px;">
            ${p.ward_name || `Ward ${p.ward_number}`}
          </strong>

          <br><br>
           <strong>Local Body:</strong>
           ${p.lsgd_name} ${p.lsgd_type}<br>

          <strong>Ward Number:</strong>
          ${p.ward_number}<br>

          <strong>Representative:</strong>
          ${p.elected_representative}<br>

          <strong>Party:</strong>
          ${p.winning_party}<br>

          <strong>Front:</strong>
          ${p.winning_front}<br>

          <strong>Votes:</strong>
          ${p.votes}<br>

          <strong>Election Year:</strong>
          ${p.year}

        </div>

      `).openPopup();

    });

  }

    });

    wardLayer.addTo(map);
    // Fade the local body layer into the background
localBodyLayer.setStyle(getNeutralStyle({
    color: "#555",
    weight: 1.3,
    fillOpacity: 0.14
}));
    wardLayer.bringToFront();

    if (wardLayer.getBounds().isValid()) {
    map.fitBounds(wardLayer.getBounds(), {
        padding: [30, 30]
    });
}


updateBackButton();
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
  populateDistrictOptions(lookup);
  setupBrowseSidebar();

  // =====================================================
  // LOK SABHA LAYER
  // =====================================================

  lsLayer = L.geoJSON(lsData, {

    style: style,

    onEachFeature: function(feature, layer) {

      const p = feature.properties;

      // Standardized search name
      feature.properties.name = p.ls_seat_name;

      feature.properties.search_label = `🟣 ${p.ls_seat_name} Lok Sabha`;

      feature.properties.layer_type = "loksabha";

      // Tooltip
      layer.bindTooltip(p.ls_seat_name, {
        sticky: true,
        direction: "top",
        className: "constituency-label"
      });

      // Events
      layer.on({
        mouseover: highlightFeature,
        mouseout: function(e) {
          if (selectedLS && selectedLS === e.target) {
            return; // keep selected style
          }
          lsLayer.resetStyle(e.target);
        },
        click: function() {
          // clear the previous LS selection and remove the previous AC selection
          if (selectedLS && selectedLS !== layer) {
            lsLayer.resetStyle(selectedLS);
          }
          if (selectedAC && selectedAC !== layer) {
            acLayer.resetStyle(selectedAC);
          }
          selectedLS = layer;
          selectedAC = null;

          // apply alliance colour to selected feature
          applySelectionStyle(layer, p.winning_front);

          layer.bringToFront();

          layer.bindPopup(`
            <div style="font-size:14px;">
              <strong style="font-size:16px;">${p.ls_seat_name}</strong>
              <br><br>
              <strong>MP:</strong> ${p.elected_representative}<br>
              <strong>Party:</strong> ${p.winning_party} (${p.winning_party_full})<br>
              <strong>Front:</strong> ${p.winning_front} (${p.fron_full})<br>
              <strong>Election Year:</strong> ${2024}<br>
              <strong>Margin:</strong> ${p.margin}<br>
              <strong>Turnout:</strong> ${p.turnout_percentage}
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
        `🏛 ${p.Asmbly_Con} Assembly`;

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
          if (selectedAC && selectedAC === e.target) {
            return; // keep selected style
          }
          acLayer.resetStyle(e.target);
        },
        click: function() {
          // clear the previous AC selection and remove the previous LS selection
          if (selectedAC && selectedAC !== layer) {
            acLayer.resetStyle(selectedAC);
          }
          if (selectedLS && selectedLS !== layer) {
            lsLayer.resetStyle(selectedLS);
          }
          selectedAC = layer;
          selectedLS = null;

          // apply alliance colour to selected feature
          applySelectionStyle(layer, p.winning_front);

          layer.bringToFront();

          layer.bindPopup(`
            <div style="font-size:14px;">
              <strong style="font-size:16px;">${p.Asmbly_Con}</strong>
              <br><br>
              <strong>District:</strong> ${p.District || "N/A"}<br>
              <strong>MLA:</strong> ${p.elected_representative}<br>
              <strong>Party:</strong> ${p.winning_party} (${p.winning_party_full})<br>
              <strong>Front:</strong> ${p.winning_front} (${p.winning_front_full})<br>
              <strong>Election Year:</strong> ${p.election_year || "2026"}<br>
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

      return getNeutralStyle({
        color: "#555",
        weight: 1.3,
        fillOpacity: 0.14
      });
    },

    onEachFeature: function(feature, layer) {

      const p = feature.properties;


      // Standardized search name
      feature.properties.name = p.district;

      feature.properties.search_label =
        `📍 ${p.district} District`;

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
          if (selectedDistrict && selectedDistrict === e.target) {
            return;
          }

          e.target.setStyle(getNeutralStyle({
            color: "#222",
            weight: 2.8,
            fillOpacity: 0.24
          }));
        },

        mouseout: function(e) {
          if (selectedDistrict && selectedDistrict === e.target) {
            return;
          }
          districtLayer.resetStyle(e.target);
        },

       click: async function () {
    await activateDistrictSelection(layer, p.district);
}
}
        
      );
    }
  });

// =====================================================
// DEFAULT LAYER
// Ensure only the district layer is visible by default.
// =====================================================

switchToLayer(districtLayer);

// Be explicit: remove other base layers if they somehow exist
if (acLayer && map.hasLayer(acLayer)) map.removeLayer(acLayer);
if (lsLayer && map.hasLayer(lsLayer)) map.removeLayer(lsLayer);

map.fitBounds(districtLayer.getBounds());

  // =====================================================
  // TOGGLE CONTROL
  // =====================================================

  const baseMaps = {
    "Districts": districtLayer,
    "State Assembly": acLayer,
    "Lok Sabha": lsLayer
};


  // Ensure map only has the district layer before creating the control
  if (acLayer && map.hasLayer(acLayer)) map.removeLayer(acLayer);
  if (lsLayer && map.hasLayer(lsLayer)) map.removeLayer(lsLayer);
  if (!map.hasLayer(districtLayer)) map.addLayer(districtLayer);

  const layersControl = L.control.layers(baseMaps, null, {
    collapsed: false
  }).addTo(map);

  map.on('baselayerchange', function (event) {
    if (event && event.layer && [districtLayer, acLayer, lsLayer].includes(event.layer)) {
      activateTopLevelLayer(event.layer);
    }
  });

  // Explicitly sync the control radios to reflect the actual map state
  setTimeout(() => {
    try {
      const baseInputs = document.querySelectorAll('.leaflet-control-layers-base input[type="radio"]');
      baseInputs.forEach((input) => {
        const labelSpan = input.closest('label') ? input.closest('label').querySelector('span span') : null;
        const label = labelSpan ? labelSpan.textContent.trim() : (input.nextSibling ? input.nextSibling.textContent.trim() : '');
        const layer = baseMaps[label];
        if (layer) input.checked = map.hasLayer(layer);
      });

      // Force only the Districts radio to be checked by default to avoid mismatches
      baseInputs.forEach((input) => {
        const labelSpan = input.closest('label') ? input.closest('label').querySelector('span span') : null;
        const label = labelSpan ? labelSpan.textContent.trim() : (input.nextSibling ? input.nextSibling.textContent.trim() : '');
        if (label === 'Districts') {
          input.checked = true;
        } else {
          input.checked = false;
        }
      });

    } catch (e) {
      console.warn('Could not sync layer control radios', e);
    }
  }, 200);

  // =====================================================
  // LEGEND
  // =====================================================

  const legend = L.control({
    position: "bottomright"
  });

  legend.onAdd = function () {

    const div = L.DomUtil.create("div", "info legend");

    div.innerHTML = `

      <h4>Political Alliance Colours</h4>

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

      <hr>

      <div>
        <small>Alliance colours apply only to the currently selected feature; the default map stays neutral.</small>
      </div>
    `;

    return div;
  };

  legend.addTo(map);

  // =====================================================
  // SEARCH CONTROL
  // =====================================================

  searchableLayers = L.layerGroup([
    lsLayer,
    acLayer,
    districtLayer
]);

  searchControl = new L.Control.Search({

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
    markMobileInteraction();

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

  // Leaflet Search automatically adds the provided layer group to the map.
  // Since that group contains all base layers, remove the non-default layers again.
  if (acLayer && map.hasLayer(acLayer)) map.removeLayer(acLayer);
  if (lsLayer && map.hasLayer(lsLayer)) map.removeLayer(lsLayer);

})
.catch(err => console.error(err));

const aboutButton = document.getElementById("aboutButton");

const aboutPanel = document.getElementById("aboutPanel");

aboutButton.onclick = function(){

    aboutPanel.classList.toggle("hidden");

}
