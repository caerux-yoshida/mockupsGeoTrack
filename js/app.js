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

// Enable tap-to-place marker flow: place initial marker at (lat, lon); user can tap map to move it.
// Returns the marker created and stores handler reference on map to allow removal.
function enableTapToPlaceMarker(map, lat, lon, label){
  if (!map) return null;
  // remove existing adjustable and any previous tap listener
  removeAdjustableMarker(map);
  if (map._geotrackMarkers._tapListener){
    map.off('click', map._geotrackMarkers._tapListener);
    map._geotrackMarkers._tapListener = null;
  }

  const marker = L.marker([lat, lon], { draggable:false }).addTo(map).bindPopup(label || 'タップで位置を変更').openPopup();
  marker.setPopupContent(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
  map._geotrackMarkers.adjustable = marker;

  const listener = function(e){
    const p = e.latlng;
    if (map._geotrackMarkers.adjustable){
      map._geotrackMarkers.adjustable.setLatLng(p).setPopupContent(`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`).openPopup();
    } else {
      map._geotrackMarkers.adjustable = L.marker([p.lat, p.lng]).addTo(map).bindPopup(`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`).openPopup();
    }
  };
  map.on('click', listener);
  map._geotrackMarkers._tapListener = listener;
  return marker;
}

function disableTapToPlace(map){
  if (!map) return;
  if (map._geotrackMarkers._tapListener){
    map.off('click', map._geotrackMarkers._tapListener);
    map._geotrackMarkers._tapListener = null;
  }
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
// Check if geolocation permission is denied
async function checkGeolocationPermission() {
  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state; // 'granted', 'denied', or 'prompt'
  } catch (e) {
    return 'unknown'; // Fallback for older browsers
  }
}

function getPermissionInstructions() {
  const ua = navigator.userAgent;
  if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
    return '設定 → Safari → 位置情報 から許可に変更してください。';
  } else if (ua.indexOf('Android') > -1) {
    return '設定 → サイトの設定 → 位置情報 から許可に変更してください。';
  } else {
    return 'ブラウザの設定から位置情報の許可を変更してください。';
  }
}

// カスタムダイアログを表示する関数
function showDialog(title, message, buttons) {
  return new Promise((resolve) => {
    let overlay = document.querySelector('.dialog-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      overlay.innerHTML = `
        <div class="dialog-content">
          <h3 class="dialog-title"></h3>
          <p class="dialog-message"></p>
          <div class="dialog-buttons"></div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const content = overlay.querySelector('.dialog-content');
    content.querySelector('.dialog-title').textContent = title;
    content.querySelector('.dialog-message').textContent = message;

    const buttonsContainer = content.querySelector('.dialog-buttons');
    buttonsContainer.innerHTML = '';
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.textContent = btn.text;
      button.className = btn.primary ? 'btn-primary' : 'btn-secondary';
      button.onclick = () => {
        overlay.style.display = 'none';
        resolve(btn.value);
      };
      buttonsContainer.appendChild(button);
    });

    overlay.style.display = 'flex';
  });
}

// 位置情報の利用確認ダイアログを表示
async function showLocationConfirmDialog() {
  const result = await showDialog(
    '位置情報の利用について',
    '現在地を自動で表示させる場合には、位置情報が必要です。',
    [
      { text: 'OK', value: true, primary: true },
      { text: 'キャンセル', value: false, primary: false }
    ]
  );
  return result;
}

// 位置情報が拒否された場合のダイアログ
function showPermissionDeniedDialog() {
  return showDialog(
    '位置情報が拒否されました',
    '位置情報が拒否されました。この機能を利用するには、端末の設定(またはブラウザの設定)から位置情報のアクセスを手動で許可してください。',
    [{ text: '閉じる', value: 'close', primary: true }]
  );
}

// 位置情報サービスが無効の場合のダイアログ
function showLocationDisabledDialog() {
  return showDialog(
    '位置情報サービスが無効です',
    '位置情報サービス自体がオフになっています。この機能を利用するには、端末の[設定]＞[プライバシー]＞[位置情報サービス]をオンにしてください。',
    [{ text: '閉じる', value: 'close', primary: true }]
  );
}

async function requestCurrentPosition(){
  return new Promise(async (resolve, reject) => {
    if (!navigator.geolocation){ 
      await showDialog(
        'エラー',
        'このブラウザは位置情報に対応していません。',
        [{ text: '閉じる', value: 'close', primary: true }]
      );
      reject(new Error('no-geolocation')); 
      return; 
    }

    const permissionState = await checkGeolocationPermission();
    
    // 既に許可されている場合は直接取得
    if (permissionState === 'granted') {
      getCurrentPosition();
      return;
    }

    // 初回または不明な場合は確認ダイアログを表示
    if (permissionState === 'prompt' || permissionState === 'unknown') {
      const shouldProceed = await showLocationConfirmDialog();
      if (!shouldProceed) {
        reject(new Error('user-cancelled'));
        return;
      }
    }

    function getCurrentPosition() {
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        async err => {
          if (err.code === err.PERMISSION_DENIED) {
            await showPermissionDeniedDialog();
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            await showLocationDisabledDialog();
          }
          reject(err);
        },
        { enableHighAccuracy:true, timeout:10000, maximumAge:0 }
      );
    }

    getCurrentPosition();
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
