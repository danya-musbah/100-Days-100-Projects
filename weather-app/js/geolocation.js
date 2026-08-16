/* ==========================================================================
   SkyCast — geolocation.js
   Promise-based wrapper around navigator.geolocation with friendly,
   speakable error messages for the UI to display directly.
   ========================================================================== */

/**
 * @returns {Promise<{lat: number, lon: number}>}
 * @throws {Error} with a human-readable message
 */
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Your browser doesn't support location services."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Location access was denied. Enable it in your browser settings to use this."));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Your location is currently unavailable. Try again in a moment."));
            break;
          case error.TIMEOUT:
            reject(new Error("Finding your location took too long. Try again."));
            break;
          default:
            reject(new Error("Something went wrong finding your location."));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

window.SkyCast = window.SkyCast || {};
window.SkyCast.geolocation = { getCurrentPosition };
