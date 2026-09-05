
// const axios = require('axios');

// const getLiveFlightPosition = async (flightNumber) => {
//     try {
//         const response = await axios.get('https://opensky-network.org/api/states/all', {
//             timeout: 5000
//         });

//         const states = response.data.states || [];
        
//         // Find aircraft matching the flight number or callsign
//         const targetFlight = states.find(flight => {
//             const callsign = (flight[1] || '').trim();
//             return callsign.toLowerCase().includes(flightNumber.toLowerCase());
//         });

//         if (targetFlight) {
//             return {
//                 lat: targetFlight[6],
//                 lng: targetFlight[5],
//                 speed: Math.round((targetFlight[9] || 200) * 1.94384), // Convert m/s to knots
//                 heading: Math.round(targetFlight[10] || 0),
//                 altitude: Math.round((targetFlight[7] || 10000) * 3.28084), // Meters to feet
//                 isOnGround: targetFlight[8]
//             };
//         }

//         return null; // Returns null if not airborne right now
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
            timeout: 3000 // Reduced timeout so it fails fast if blocked
        });

        const states = response.data.states || [];
        
        const targetFlight = states.find(flight => {
            const callsign = (flight[1] || '').trim();
            return callsign.toLowerCase().includes(flightNumber.toLowerCase());
        });

        if (targetFlight) {
            return {
                lat: targetFlight[6],
                lng: targetFlight[5],
                speed: Math.round((targetFlight[9] || 200) * 1.94384),
                heading: Math.round(targetFlight[10] || 0),
                altitude: Math.round((targetFlight[7] || 10000) * 3.28084),
                isOnGround: targetFlight[8]
            };
        }

        return null; // Triggers smooth simulation fallback in server.js
    } catch (error) {
        // Silently handle timeouts on Render without cluttering logs
        return null; 
    }
};

module.exports = { getLiveFlightPosition };