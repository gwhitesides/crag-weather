const locSelect = document.getElementById('locationSelect');
let map = L.map('map').setView([39.25, -111.12], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let marker = L.marker([39.25, -111.12]).addTo(map);

// Rain Radar Overlay
L.tileLayer('https://tilecache.rainviewer.com/v2/radar/nowcast_89b87640/256/{z}/{x}/{y}/2/1_1.png', {
    opacity: 0.4
}).addTo(map);

async function getCragData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relativehumidity_2m,precipitation,precipitation_probability&forecast_days=2&past_days=1`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Past 24h Rain Check
        const pastRain = data.hourly.precipitation.slice(0, 24).reduce((a, b) => a + b, 0);
        updateSafetyUI(pastRain);

        // Process Future Forecast (Starts at index 24)
        processBestWindow(data.hourly);
    } catch (e) { console.error("Data error", e); }
}

function updateSafetyUI(rain) {
    const warn = document.getElementById('rock-warning');
    document.getElementById('past-rain').innerText = `${rain.toFixed(2)}mm`;
    warn.style.display = "block";
    if (rain > 0.1) {
        warn.className = "warning-card danger";
        warn.innerHTML = `⚠️ <b>WET ROCK ALERT:</b> ${rain.toFixed(2)}mm rain fell recently. <b>DO NOT CLIMB SANDSTONE.</b>`;
    } else {
        warn.className = "warning-card safe";
        warn.innerHTML = `✅ <b>ROCK IS DRY:</b> No significant rain in the last 24h.`;
    }
}

function processBestWindow(hourly) {
    let bestScore = -Infinity;
    let bestIdx = 24;

    for (let i = 24; i < hourly.time.length - 4; i++) {
        let score = (100 - hourly.relativehumidity_2m[i]) - Math.abs(12 - hourly.temperature_2m[i]) - (hourly.precipitation_probability[i] * 2);
        if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
        }
    }

    const time = new Date(hourly.time[bestIdx]).toLocaleString([], {weekday: 'short', hour: '2-digit'});
    document.getElementById('best-time').innerText = time;
    document.getElementById('best-details').innerText = `${hourly.temperature_2m[bestIdx]}°C | ${hourly.relativehumidity_2m[bestIdx]}% Humidity`;
    
    // Update current
    document.getElementById('temp').innerText = `${hourly.temperature_2m[24]}°C`;
    document.getElementById('humidity').innerText = `${hourly.relativehumidity_2m[24]}%`;
}

locSelect.addEventListener('change', (e) => {
    const [lat, lon] = e.target.value.split(',');
    map.setView([lat, lon], 12);
    marker.setLatLng([lat, lon]);
    getCragData(lat, lon);
});

getCragData(39.25, -111.12);