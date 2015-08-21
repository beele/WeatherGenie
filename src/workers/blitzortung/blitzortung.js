var WebSocket = require('ws');

var logger = require("../../logging/logger").makeLogger("SERVIC");
var messageFactory = require("../../util/messagefactory1").getInstance();

//Variables.
var ws = null;
var callbacks = {};

var retryCount = 0;

function setupLightningCache() {
    messageFactory.sendSimpleMessage(messageFactory.TARGET_BROKER, "createCache", {cacheName: "lightning", maxSize: 250});
}

function setupBlitzortungWebSocket() {
    //Safety check.
    if(retryCount === 0 && ws !== null) {
        logger.ERROR("A connection to blitzortung is already open!");
        return;
    } else if(retryCount > 5) {
        logger.ERROR("Cannot (re)conntect to blitzortung websocket!");
        return;
    }

    //Connect to websocket from blitzortung.org
    ws = new WebSocket("ws://ws.blitzortung.org:808" + retryCount, "", {headers: {origin: "http://www.blitzortung.org"}});
    ws.on('open', function startupLightingSocket() {
        retryCount = 0;

        //North america.
        //ws.send('{"west":-130,"east":-60,"north":62.5,"south":2.3}');
        //Western europe.
        ws.send('{"west":-12,"east":20,"north":56,"south":33.6}');
    });
    ws.on('message', function lightningDataReceived(data) {
        var data = JSON.parse(data);

        //Check to see if the strike was in the radius (300km) of the geographic center of belgium.
        //Only send the strike when in range.
        if(getDistanceBetweenTwoLatLonPoints(50.6404438,4.66775, data.lat, data.lon) <= 300) {
            messageFactory.sendSimpleMessage(messageFactory.TARGET_BROKER, "addToCache", {cacheName: "lightning", value: {timestamp: new Date(Math.floor(data.time/1000000)), lat: data.lat, lon: data.lon}});
        }
    });
    //If the socket goes down restart it!
    ws.on('close', onWebsocketFailure);
    ws.on('error', onWebsocketFailure);
}

function onWebsocketFailure(data, flags) {
    logger.ERROR("Websocket failure: " + JSON.stringify(data) + " - " + JSON.stringify(flags));

    //The retryCount acts as the count for retries and as the port number.
    retryCount++;
    setupBlitzortungWebSocket();
}

function lightningData(callback, lat, lon) {
    logger.INFO("lightningData method was called!");
    var id = new Date().getTime() + "--" + (Math.random() * 6);
    callbacks[id] = callback;

    messageFactory.sendMessageWithHandler(  messageFactory.TARGET_BROKER, "retrieveCache", {cacheName: "lightning"},
                                            "blitzortung", "lightningDataMessageHandler", {lat: lat, lon: lon, callbackId: id});
}

function lightningDataMessageHandler(msg) {
    logger.DEBUG("blitzortung data received");

    if(msg.returnData === undefined || msg.returnData.length === 0) {
        logger.DEBUG("No data available, returning error!");

        callbacks[msg.handlerParams.callbackId]({ERROR: "No lightning data available!"});
        delete callbacks[msg.handlerParams.callbackId];
    } else {
        var oLat = msg.handlerParams.lat;
        var oLon = msg.handlerParams.lon;

        var strikes = [];
        for(var i = 0 ; i < msg.returnData.length ; i++) {
            var strike = msg.returnData[i];
            var dist = getDistanceBetweenTwoLatLonPoints(oLat, oLon, strike.lat, strike.lon);
            strikes.push({
                timestamp: strike.timestamp,
                distance: dist
            });
        }

        callbacks[msg.handlerParams.callbackId]({lat: oLat, lon: oLon, data: strikes});
        delete callbacks[msg.handlerParams.callbackId];
    }
}

function showLightingCache(callback) {
    logger.INFO("showLightingCache method was called!");
    var id = new Date().getTime() + "--" + (Math.random() * 6);
    callbacks[id] = callback;

    messageFactory.sendMessageWithHandler(  messageFactory.TARGET_BROKER, "retrieveCache", {cacheName: "lightning"},
                                            "blitzortung", "showLightingCacheMessageHandler", {callbackId: id});
}

function showLightingCacheMessageHandler(msg) {
    logger.DEBUG("blitzortung data received: " + msg.returnData);

    callbacks[msg.handlerParams.callbackId](msg.returnData);
    delete callbacks[msg.handlerParams.callbackId];
}

/*-------------------------------------------------------------------------------------------------
 * ------------------------------------------------------------------------------------------------
 *                                  Internal blitzortung functions
 * ------------------------------------------------------------------------------------------------
 ------------------------------------------------------------------------------------------------*/
/**
 * Calculates the distance in km between to given points in lat/lon
 *
 * @param lat1 Latitude of point 1.
 * @param lon1 Longitude of point 1.
 * @param lat2 Latitude of point 2.
 * @param lon2 Latitude of point 2.
 * @returns {number} The distance between the two points in kilometers.
 */
function getDistanceBetweenTwoLatLonPoints(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = deg2rad(lat2-lat1);
    var dLon = deg2rad(lon2-lon1);
    var a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d;
}

/**
 * Converts degrees to radians.
 *
 * @param deg The number of degrees to convert.
 * @returns {number} The amount of radians.
 */
function deg2rad(deg) {
    return deg * (Math.PI/180)
}

//Function exports:
exports.setupLightningCache             = setupLightningCache;
exports.setupBlitzortungWebSocket       = setupBlitzortungWebSocket;
exports.lightningData                   = lightningData;
exports.showLightingCache               = showLightingCache;

//Message handlers:
exports.lightningDataMessageHandler     = lightningDataMessageHandler;
exports.showLightingCacheMessageHandler = showLightingCacheMessageHandler;