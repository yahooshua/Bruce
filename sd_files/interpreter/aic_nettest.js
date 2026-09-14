// aic_nettest.js — minimal Bruce networking test.
// -----------------------------------------------------------------------------
// Does ONE HTTP GET to the receiver's health endpoint and shows the result.
// Purpose: prove the Cardputer can reach trimmapiaserve over the LAN, with no
// WiFi scan, no token, and no loops — so it isolates networking from everything
// else and won't trip the watchdog like a hung POST does.
//
// Success shows:  OK {"ok": true}
// Failure shows:  FAILED <error>  (connection refused / timeout / not connected)
//
// Written for Bruce release 1.16.1 (module-based JS API).
// -----------------------------------------------------------------------------
var URL = "http://192.168.0.179:8391/healthz"; // trimmapiaserve LAN IP

var wifi = require("wifi");
var dialog = require("dialog");

function main() {
    dialog.message("GET " + URL);
    try {
        var res = wifi.httpFetch(URL, { method: "GET", responseType: "string" });
        var body = res && res.body ? String(res.body) : "(no body)";
        dialog.message("OK\n" + body.substring(0, 100));
    } catch (e) {
        var m = "";
        try {
            m = JSON.stringify(e);
        } catch (x) {
            m = "request failed";
        }
        dialog.error("FAILED\n" + m);
    }
    delay(3000);
}

main();
