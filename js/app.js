// Shared JS utilities for GeoTrack mockup

// Default Tokyo Metropolitan Government Building (新宿) center when permission denied
const DEFAULT_TOKYO_CENTER = [35.6895, 139.6917];
const STORAGE_KEY = 'geotrack_location_v1';

function getStoredLocation(){
  try{
    const v = localStorage.getItem(STORAGE_KEY);
    if (!v) return null;
    return JSON.parse(v);
  }catch(e){ return null }
}

function saveLocation(lat, lon){
  const obj = { lat: Number(lat), lon: Number(lon), ts: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  return obj;
}

// Create map in containerId, return map instance
function createMap(containerId, centerLatLng, zoom){
  const map = L.map(containerId, { zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  map.setView(centerLatLng, zoom || 13);
  // store reference for markers
  map._geotrackMarkers = map._geotrackMarkers || {};
  return map;
}

function addOrUpdateUserMarker(map, lat, lon, label){
  if (!map) return;
  // reuse marker id 'user'
  if (map._geotrackMarkers.user){
    map._geotrackMarkers.user.setLatLng([lat, lon]).bindPopup(label);
  } else {
    map._geotrackMarkers.user = L.marker([lat, lon], { draggable:false }).addTo(map).bindPopup(label);
  }
}

function addOrUpdateTempMarker(map, lat, lon, label){
  if (!map) return;
  if (map._geotrackMarkers.temp){
    map._geotrackMarkers.temp.setLatLng([lat, lon]).bindPopup(label).openPopup();
  } else {
    map._geotrackMarkers.temp = L.marker([lat, lon], { opacity:0.9 }).addTo(map).bindPopup(label).openPopup();
  }
}

// Create a draggable marker for user adjustment (not saved until explicitly saved)
function createDraggableMarker(map, lat, lon, label){
  if (!map) return null;
  // remove existing adjustable
  if (map._geotrackMarkers.adjustable){
    try{ map.removeLayer(map._geotrackMarkers.adjustable); }catch(e){}
    map._geotrackMarkers.adjustable = null;
  }
  const marker = L.marker([lat, lon], { draggable:true }).addTo(map).bindPopup(label || 'ドラッグで位置を調整').openPopup();
  marker.on('dragend', function(e){
    const p = e.target.getLatLng();
    marker.setPopupContent(`${(p.lat).toFixed(6)}, ${(p.lng).toFixed(6)}`);
  });
  map._geotrackMarkers.adjustable = marker;
  return marker;
}

function removeAdjustableMarker(map){
  if (!map) return;
  if (map._geotrackMarkers.adjustable){
    try{ map.removeLayer(map._geotrackMarkers.adjustable); }catch(e){}
    map._geotrackMarkers.adjustable = null;
  }
}

function getMarkerLatLng(marker){
  if (!marker) return null;
  const p = marker.getLatLng();
  return { lat: p.lat, lon: p.lng };
}

// Request and save location (used for registration flows)
function requestAndSaveLocation(){
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation){
      alert('このブラウザは位置情報に対応していません。');
      reject(new Error('no-geolocation'));
      return;
    }
    navigator.geolocation.getCurrentPosition(function (pos){
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const saved = saveLocation(lat, lon);
      resolve(saved);
    }, function (err){
      // If permission denied, fallback to default Tokyo and do not save
      if (err.code === err.PERMISSION_DENIED){
        alert('位置情報の許可が拒否されました。東京都心付近を表示します（保存はされません）。');
        resolve(saveLocation(DEFAULT_TOKYO_CENTER[0], DEFAULT_TOKYO_CENTER[1]));
      } else {
        alert('位置情報を取得できませんでした: ' + err.message);
        reject(err);
      }
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  });
}

// Request current position without saving (used in page2's "現在地表示")
function requestCurrentPosition(){
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation){ reject(new Error('no-geolocation')); return; }
    navigator.geolocation.getCurrentPosition(function (pos){
      resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    }, function (err){
      reject(err);
    }, { enableHighAccuracy:true, timeout:10000, maximumAge:0 });
  });
}

// Generate N dummy users near a center coordinate
function generateDummyUsers(center, n){
  const [baseLat, baseLon] = center || DEFAULT_TOKYO_CENTER;
  const users = [];
  for(let i=0;i<n;i++){
    const lat = baseLat + (Math.random()-0.5) * 0.03; // ~±3km
    const lon = baseLon + (Math.random()-0.5) * 0.03;
    users.push({ name: `User${i+1}`, lat, lon, desc: 'ダミーユーザー' });
  }
  return users;
}
