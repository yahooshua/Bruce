// aic_wifi_report.js — AIC / Riviera Tech field-kit add-on for Bruce
// -----------------------------------------------------------------------------
// Scans nearby WiFi and POSTs the result as JSON to a configurable endpoint
// (over WiFi/HTTPS), so the finding lands in a visit record the phone can read.
//
// This is documentation, NOT an attack: a passive WiFi scan of what is already
// broadcasting. It sends what any device sees in the air. Run it only on sites
// you own or are contracted to service. No deauth, no portal, no spam.
//
// Uses only Bruce's built-in JS API (require('wifi').scan / .httpFetch), so it
// runs on stock Bruce firmware — no custom build required. Load it from the
// Scripts (interpreter) menu.
//
// -----------------------------------------------------------------------------
// EDIT THESE THREE, then save to the SD card.
var ENDPOINT = "http://192.168.0.179:8391/api/cardputer/finding"; // trimmapiaserve LAN IP (receiver listens on all interfaces as of 2026-09-14)
var TOKEN = "CHANGE-ME-SHARED-SECRET"; // paste the receiver's token: ssh trimmapiaserve "grep AIC_FINDING_TOKEN ~/cardputer/receiver.env"
var DEVICE_ID = "cardputer-01"; // this device's label
// TICKET is prompted at runtime if the keyboard() helper is available; otherwise
// this default is used. Set to the NinjaOne ticket for the visit.
var TICKET = "no-ticket";
// -----------------------------------------------------------------------------

var wifi = require("wifi");
var dialog = require("dialog");
// Bruce exposes dialogs as a module (dialog.message / dialog.error), not as bare
// globals. Alias them so the rest of the script reads cleanly. (Verified against
// Bruce 1.16.1, the release running on the device.)
var dialogMessage = dialog.message;
var dialogError = dialog.error;

function nowMillis() {
    // Date may not exist in the mqjs runtime; fail soft. The server also stamps
    // its own received_at, so a 0 here is harmless.
    try {
        return Date.now();
    } catch (e) {
        return 0;
    }
}

function tryPromptTicket(fallback) {
    // dialog.prompt(defaultText, maxLen, title) is Bruce's on-device text input.
    // Wrapped so the script still works if the signature differs on a build.
    try {
        var t = dialog.prompt(fallback, 32, "Ticket #:");
        if (t && t.length > 0) return t;
    } catch (e) {}
    return fallback;
}

function scanNetworks() {
    dialogMessage("Scanning WiFi...");
    var nets = wifi.scan();
    delay(8000);
    var out = [];
    if (!nets || !nets.length) return out;
    for (var i = 0; i < nets.length; i++) {
        var n = nets[i];
        out.push({
            ssid: n.SSID,
            bssid: n.MAC,
            rssi: n.RSSI,
            channel: n.channel, // may be undefined on some builds -> null in JSON
            enc: n.encryptionType,
        });
    }
    return out;
}

function postFinding(kind, payload) {
    var body = {
        ticket: TICKET,
        device_id: DEVICE_ID,
        kind: kind,
        ts: nowMillis(),
        payload: payload,
    };
    // httpFetch auto-connects WiFi (wifiConnectMenu) if not connected, and
    // JSON.stringifies an object body for us.
    var res = wifi.httpFetch(ENDPOINT, {
        method: "POST",
        body: body,
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + TOKEN,
        },
        responseType: "string",
    });
    return res;
}

function main() {
    var networks = scanNetworks();
    if (!networks.length) {
        dialogError("No WiFi networks found.");
        return;
    }
    TICKET = tryPromptTicket(TICKET);
    dialogMessage("Uploading " + networks.length + " APs...");
    try {
        var res = postFinding("wifi_scan", networks);
        var reply = res && res.body ? String(res.body).substring(0, 80) : "(no body)";
        dialogMessage("Uploaded " + networks.length + " APs.\n" + reply);
    } catch (err) {
        // httpFetch throws on connect/TLS/HTTP failure. Show it; don't crash.
        var msg = "";
        try {
            msg = JSON.stringify(err);
        } catch (e) {
            msg = "upload failed";
        }
        dialogError("Upload failed:\n" + msg);
    }
    delay(2000);
}

main();
