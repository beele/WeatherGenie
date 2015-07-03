var http = require("http");
var cluster = require('cluster');

var logger = require("../../logging/logger").makeLogger("SERVIC");

//Variables.
var clbck = null;
var threshold = 120 * 60 * 1000;

function setupWeatherCache() {
    var payload = {};
    payload.origin = cluster.worker.id;
    payload.originFunc = "setupWeatherCache";
    payload.target = "broker";
    payload.targetFunc = "createCache";
    payload.cacheName = "weather";
    payload.maxSize = 50;
    process.send(payload);
}

/**
 * Retrieves the remote weather via the openweathermap api. (wrapper function)
 * For belgium only!
 *
 * @param placeName
 * @param callback
 */
function retrieveWeatherInfo(placeName, callback) {
    logger.INFO("retrieveWeatherInfo method was called!");

    clbck = callback;

    var payload = {};
    payload.origin = cluster.worker.id;
    payload.originFunc = "retrieveWeatherInfo";
    payload.target = "broker";
    payload.targetFunc = "retrieveCache";
    payload.cacheName = "weather";
    payload.originalParams = {placeName: placeName};
    process.send(payload);
}

function retrieveWeatherInfoMessageHandler(msg) {
    logger.DEBUG("weather cache data received");

    var placeName = msg.originalParams.placeName;
    var result = null;

    var now = new Date();
    var obsoleteIndexes = [];

    for(var i = 0 ; i < msg.value.length ; i++) {
        var info = msg.value[i];
        var previous = new Date(info.timeStamp);

        if((+previous + threshold) > +now) {
            if(info.placeName === placeName) {
                logger.DEBUG("Weather for location found in cache!")
                result = info;
            }
        } else {
            logger.DEBUG("Weather cache index " + i + " is outdated!");
            obsoleteIndexes.push(i);
        }
    }

    if(result === null) {
        getRemoteWeather("BE", placeName, clbck);
    } else {
        clbck(result);
    }

    //Send the obsolete indexes if any to the broker to have them removed!
    if(obsoleteIndexes.length > 0) {
        var payload = {};
        payload.origin = cluster.worker.id;
        payload.originFunc = "retrieveWeatherInfoMessageHandler";
        payload.target = "broker";
        payload.targetFunc = "removeFromCache";
        payload.cacheName = "weather";
        payload.value = obsoleteIndexes;
        process.send(payload);
    }
}

function showWeatherCache(callback) {
    logger.INFO("showWeatherCache method was called!");

    clbck = callback;

    var payload = {};
    payload.origin = cluster.worker.id;
    payload.originFunc = "showWeatherCache";
    payload.target = "broker";
    payload.targetFunc = "retrieveCache";
    payload.cacheName = "weather";
    process.send(payload);
}

function showWeatherCacheMessageHandler(msg) {
    logger.DEBUG("weather cache data received");

    clbck(msg.value);
}

/*-------------------------------------------------------------------------------------------------
 * ------------------------------------------------------------------------------------------------
 *                                Internal openweathermap functions
 * ------------------------------------------------------------------------------------------------
 ------------------------------------------------------------------------------------------------*/
/**
 * Retrieves the remote weather via the openweathermap api.
 *
 * @param countryCode The two char ISO country code.
 * @param placeName The name of the city.
 * @param callback callback function.
 */
function getRemoteWeather(countryCode, placeName, callback) {
    logger.INFO("Retrieving weather info from remote service...");

    var options = {
        host: 'api.openweathermap.org',
        port: '80',
        path: '/data/2.5/weather?q=' + placeName + "," + countryCode,
        method: 'POST'
    };

    http.request(options, function(res) {
        var data = '';
        res.setEncoding('utf8');

        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on('end', function() {
            logger.DEBUG(data);
            data = JSON.parse(data);

            var info = {};

            //Check for errors in the data that has been returned.
            if(data.cod === "404") {
                info.error = data.message;
                callback(info);
                return;
            }

            info.placeName = placeName;
            info.location =  data.name;
            info.latitude = data.coord.lat;
            info.longitude = data.coord.lon;

            info.sunrise = data.sys.sunrise;
            info.sunset = data.sys.sunset;

            info.avgTemp = data.main.temp  - 273.15;
            info.maxTemp = data.main.temp_max - 273.15;
            info.minTemp = data.main.temp_min - 273.15;
            info.relHumidity = data.main.humidity;
            info.pressure = data.main.pressure;

            info.avgWindSpeed = data.wind.speed;
            info.avgWindDirectionDegree = data.wind.deg;
            info.avgWindDirectionCardinal = convertToCardinalWindDirection(info.avgWindDirectionDegree);

            info.conditions = [];
            for(var i = 0; i < data.weather.length ; i++) {
                var weather = data.weather[i];

                var condition = {};
                condition.id = weather.id;
                condition.icon = weather.icon;
                condition.main = weather.main;
                condition.description = weather.description;

                info.conditions.push(condition);
            }

            info.error = null;
            info.timeStamp = new Date();

            var payload = {};
            payload.origin = cluster.worker.id;
            payload.originFunc = "getRemoteWeather";
            payload.target = "broker";
            payload.targetFunc = "addToCache";
            payload.cacheName = "weather";
            payload.value = info;
            process.send(payload);

            callback(info);
        });
    }).end();
}

/**
 * Converts a given degree angle (0-360°) to a String based cardinal direction.
 *
 * @param degrees The angle given in range of: [0,360]
 * @return A String representing the cardinal direction.
 */
function  convertToCardinalWindDirection(degrees) {
    var cardinalDirection;

    if(degrees >= 0 && degrees < 11) {
        cardinalDirection = "N";
    } else if(degrees >= 11 && degrees < 34) {
        cardinalDirection = "NNE";
    } else if(degrees >= 34 && degrees < 56) {
        cardinalDirection = "NE";
    } else if(degrees >= 56 && degrees < 79) {
        cardinalDirection = "ENE";
    } else if(degrees >= 79 && degrees < 101) {
        cardinalDirection = "E";
    } else if(degrees >= 101 && degrees < 124) {
        cardinalDirection = "ESE";
    } else if(degrees >= 124 && degrees < 146) {
        cardinalDirection = "SE";
    } else if(degrees >= 146 && degrees < 169) {
        cardinalDirection = "SSE";
    } else if(degrees >= 169 && degrees < 191) {
        cardinalDirection = "S";
    } else if(degrees >= 191 && degrees < 214) {
        cardinalDirection = "SSW";
    } else if(degrees >= 214 && degrees < 236) {
        cardinalDirection = "SW";
    } else if(degrees >= 236 && degrees < 259) {
        cardinalDirection = "WSW";
    } else if(degrees >= 259 && degrees < 281) {
        cardinalDirection = "W";
    } else if(degrees >= 281 && degrees < 304) {
        cardinalDirection = "WNW";
    } else if(degrees >= 304 && degrees < 326) {
        cardinalDirection = "NW";
    } else if(degrees >= 326 && degrees < 349) {
        cardinalDirection = "NNW";
    } else if(degrees >= 349 && degrees < 361) {
        cardinalDirection = "N";
    } else {
        logger.ERROR("Given direction in degrees should be in range of: [0,360]");
    }

    return cardinalDirection;
}

exports.setupWeatherCache                   = setupWeatherCache;
exports.retrieveWeatherInfo                 = retrieveWeatherInfo;
exports.retrieveWeatherInfoMessageHandler   = retrieveWeatherInfoMessageHandler;
exports.showWeatherCache                    = showWeatherCache;
exports.showWeatherCacheMessageHandler      = showWeatherCacheMessageHandler;