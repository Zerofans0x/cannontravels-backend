// const axios = require('axios');

// // OpenSky Network public API endpoint for live state vectors
// const getLiveFlightPosition = async (flightNumber) => {
//     try {
//         // OpenSky public API returns all airborne aircraft or you can query specific bounds/callsigns
//         const response = await axios.get('https://opensky-network.org/api/states/all', {
//             timeout: 5000
//         });

//         const states = response.data.states || [];
        
//         // Search for the flight by callsign (e.g., matching flightNumber like "CPN-402" or airline callsign)
//         const targetFlight = states.find(flight => {
//             const callsign = (flight[1] || '').trim();
//             return callsign.toLowerCase().includes(flightNumber.toLowerCase());
//         });

//         if (targetFlight) {
//             // OpenSky state vector format: [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate, ...]
//             return {
//                 lat: targetFlight[6],
//                 lng: targetFlight[5],
//                 speed: Math.round((targetFlight[9] || 200) * 1.94384), // Convert m/s to knots
//                 heading: Math.round(targetFlight[10] || 0),
//                 altitude: Math.round((targetFlight[7] || 10000) * 3.28084), // Convert meters to feet
//                 isOnGround: targetFlight[8]
//             };
//         }

//         // Fallback simulation coordinates if the exact commercial flight isn't currently transmitting via OpenSky public radar
//         return {
//             lat: 6.5244,
//             lng: 3.3792,
//             speed: 480,
//             heading: 85,
//             altitude: 36000,
//             isOnGround: false,
//             simulated: true
//         };

//     } catch (error) {
//         console.error("OpenSky Radar Fetch Error:", error.message);
//         return null;
//     }
// };

// module.exports = { getLiveFlightPosition };


const axios = require('axios');

const getLiveFlightPosition = async (flightNumber) => {
    try {
        const response = await axios.get('https://opensky-network.org/api/states/all', {
            timeout: 5000
        });

        const states = response.data.states || [];
        
        // Find aircraft matching the flight number or callsign
        const targetFlight = states.find(flight => {
            const callsign = (flight[1] || '').trim();
            return callsign.toLowerCase().includes(flightNumber.toLowerCase());
        });

        if (targetFlight) {
            return {
                lat: targetFlight[6],
                lng: targetFlight[5],
                speed: Math.round((targetFlight[9] || 200) * 1.94384), // Convert m/s to knots
                heading: Math.round(targetFlight[10] || 0),
                altitude: Math.round((targetFlight[7] || 10000) * 3.28084), // Meters to feet
                isOnGround: targetFlight[8]
            };
        }

        return null; // Returns null if not airborne right now
    } catch (error) {
        console.error("OpenSky Radar Fetch Error:", error.message);
        return null;
    }
};

module.exports = { getLiveFlightPosition };