
const axios = require('axios');
const captainModel = require('../models/captain.model');

// Using Nominatim for geocoding (OpenStreetMap)
module.exports.getAddressCoordinate = async (address) => {
   const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'YourAppName/1.0'
            }
        });
        
        if (response.data && response.data.length > 0) {
            const location = response.data[0];
            return {
                ltd: parseFloat(location.lat),
                lng: parseFloat(location.lon)
            };
        } else {
            throw new Error('Unable to fetch coordinates');
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// Using OpenRouteService for distance and time calculation
module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }

    try {
        // First get coordinates for both locations
        const originCoords = await this.getAddressCoordinate(origin);
        const destCoords = await this.getAddressCoordinate(destination);

       const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${originCoords}&end=${destCoords}`
        
        const response = await axios.post(url, {
            coordinates: [[originCoords.lng, originCoords.ltd], [destCoords.lng, destCoords.ltd]]
        }, {
            headers: {
                'Authorization': process.env.OPENROUTE_API_KEY || '5b3ce3597851110001cf6248YOUR_API_KEY_HERE',
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.routes && response.data.routes.length > 0) {
            const route = response.data.routes[0];
            return {
                distance: {
                    text: `${(route.summary.distance / 1000).toFixed(1)} km`,
                    value: route.summary.distance
                },
                duration: {
                    text: `${Math.ceil(route.summary.duration / 60)} mins`,
                    value: route.summary.duration
                },
                status: 'OK'
            };
        } else {
            throw new Error('No routes found');
        }

    } catch (err) {
        console.error(err);
        throw err;
    }
}

// Using Photon for autocomplete suggestions
module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        throw new Error('query is required');
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=5`;

    try {
        const response = await axios.get(url);
        
        if (response.data && response.data.features) {
            return response.data.features.map(feature => {
                const properties = feature.properties;
                let displayName = properties.name || '';
                
                if (properties.street) displayName += `, ${properties.street}`;
                if (properties.city) displayName += `, ${properties.city}`;
                if (properties.country) displayName += `, ${properties.country}`;
                
                return displayName;
            }).filter(value => value);
        } else {
            throw new Error('Unable to fetch suggestions');
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
}

module.exports.getCaptainsInTheRadius = async (ltd, lng, radius) => {
    // radius in km
    const captains = await captainModel.find({
        location: {
            $geoWithin: {
                $centerSphere: [ [ ltd, lng ], radius / 6371 ]
            }
        }
    });

    return captains;
}
