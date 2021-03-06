var hue = require('node-hue-api');

var displayBridges = function(bridge) {
    console.log("Hue Bridges Found: " + JSON.stringify(bridge));
};

// --------------------------
// Using a callback
hue.locateBridges(function(err, result) {
    if (err) throw err;
    displayBridges(result);
});