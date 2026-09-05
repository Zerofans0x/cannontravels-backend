

// const axios = require('axios');

// const getLiveFlightPosition = async (flightNumber) => {
//     try {
//         const response = await axios.get('https://opensky-network.org/api/states/all', {
//             timeout: 3000 // Reduced timeout so it fails fast if blocked
//         });

//         const states = response.data.states || [];
        
//         const targetFlight = states.find(flight => {
//             const callsign = (flight[1] || '').trim();
//             return callsign.toLowerCase().includes(flightNumber.toLowerCase());
//         });

//         if (targetFlight) {
//             return {
//                 lat: targetFlight[6],
//                 lng: targetFlight[5],
//                 speed: Math.round((targetFlight[9] || 200) * 1.94384),
//                 heading: Math.round(targetFlight[10] || 0),
//                 altitude: Math.round((targetFlight[7] || 10000) * 3.28084),
//                 isOnGround: targetFlight[8]
//             };
//         }

//         return null; // Triggers smooth simulation fallback in server.js
//     } catch (error) {
//         // Silently handle timeouts on Render without cluttering logs
//         return null; 
//     }
// };

// module.exports = { getLiveFlightPosition };


const axios = require('axios');

const getLiveFlightPosition = async (flightNumber) => {
    try {
        // We set a very tight timeout and validate response cleanly
        const response = await axios.get('https://opensky-network.org/api/states/all', {
            timeout: 2000,
            validateStatus: function (status) {
                return status === 200; // Only resolve if 200 OK
            }
        });

        const states = response.data?.states || [];
        
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

        return null;
    } catch (err) {
        // Completely silent: suppresses Axios error logs and timeouts entirely
        return null; 
    }
};

module.exports = { getLiveFlightPosition };