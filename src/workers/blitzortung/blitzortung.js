var cluster = require('cluster');
var WebSocket = require('ws');

var logger = require("../../logging/logger").makeLogger("SERVIC");

//Variables.
var ws = null;
var callbacks = {};

var retryCount = 0;

function setupLightningCache() {
    var payload = {};
    payload.origin = cluster.worker.id;
    payload.originFunc = "startupLightingSocket";
    payload.target = "broker";
    payload.targetFunc = "createCache";
    payload.cacheName = "lightning";
    payload.maxSize = 100;
    process.send(payload);
}

function setupBlitzortungWebSocket() {
    //Safety check.
    if(retryCount > 5) {
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
        if(getDistanceFromLatLonInKm(50.6404438,4.66775, data.lat, data.lon) <= 300) {
            var payload = {};
            payload.origin = cluster.worker.id;
            payload.originFunc = "lightningDataReceived";
            payload.target = "broker";
            payload.targetFunc = "addToCache";
            payload.cacheName = "lightning";
            payload.value = {timestamp: data.time, lat: data.lat, lon: data.lon};
            process.send(payload);
        }
    });
    //If the socket goes down restart it!
    ws.on('close', onWebsocketFailure);
    ws.on('error', onWebsocketFailure);
}

function onWebsocketFailure(data, flags) {
    logger.ERROR("Websocket failure: " + JSON.stringify(data) + " - " + JSON.stringify(flags));

    //The retrycount acts as the count for retries and as the port number.
    retryCount++;
    setupBlitzortungWebSocket();
}

function lightningData(callback, lat, lon) {
    logger.INFO("lightningData method was called!");
    var id = new Date().getTime() + "--" + (Math.random() * 6);
    callbacks[id] = callback;

    var payload = {};
    payload.origin = cluster.worker.id;
    payload.originFunc = "lightningData";
    payload.target = "broker";
    payload.targetFunc = "retrieveCache";
    payload.cacheName = "lightning";
    payload.originalParams = {lat: lat, lon: lon, callbackId: id};
    process.send(payload);
}

function lightningDataMessageHandler(msg) {
    logger.DEBUG("blitzortung data received");

    var oLat = null;
    var oLon = null;

    if(msg.value === undefined || msg.value.length === 0) {
        logger.DEBUG("No data available, returning error!");

        callbacks[msg.originalParams.callbackId]({ERROR: "No lightning data available!"});
        delete callbacks[msg.originalParams.callbackId];
    } else {
        var oLat = msg.originalParams.lat;
        var oLon = msg.originalParams.lon;

        var strikes = [];
        for(var i = 0 ; i < msg.value.length ; i++) {
            var strike = msg.value[i];
            var dist = getDistanceFromLatLonInKm(oLat, oLon, strike.lat, strike.lon);
            strikes.push({timestamp: strike.timestamp, distance: dist});
        }

        callbacks[msg.originalParams.callbackId]({lat: oLat, lon: oLon, data: strikes});
        delete callbacks[msg.originalParams.callbackId];
    }
}

function showLightingCache(callback) {
    logger.INFO("showLightingCache method was called!");
    var id = new Date().getTime() + "--" + (Math.random() * 6);
    callbacks[id] = callback;

    var payload = {};
    payload.origin = cluster.worker.id;
    payload.originFunc = "showLightingCache";
    payload.target = "broker";
    payload.targetFunc = "retrieveCache";
    payload.cacheName = "lightning";
    payload.originalParams = {callbackId: id};
    process.send(payload);
}

function showLightingCacheMessageHandler(msg) {
    logger.DEBUG("blitzortung data received: " + msg.value);

    callbacks[msg.originalParams.callbackId](msg.value);
    delete callbacks[msg.originalParams.callbackId];
}

/*-------------------------------------------------------------------------------------------------
 * ------------------------------------------------------------------------------------------------
 *                                  Internal blitzortung functions
 * ------------------------------------------------------------------------------------------------
 ------------------------------------------------------------------------------------------------*/
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
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

function deg2rad(deg) {
    return deg * (Math.PI/180)
}

exports.setupLightningCache             = setupLightningCache;
exports.setupBlitzortungWebSocket       = setupBlitzortungWebSocket;

exports.lightningData                   = lightningData;
exports.lightningDataMessageHandler     = lightningDataMessageHandler;
exports.showLightingCache               = showLightingCache;
exports.showLightingCacheMessageHandler = showLightingCacheMessageHandler;