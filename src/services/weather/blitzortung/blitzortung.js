var Blitzortung = function() {
    var logger          = require("../../../logging/logger").makeLogger("IMPL-BLTZRTNG--");
    var WebSocket       = require("ws");
    var messageFactory  = require("../../../util/messagefactory").getInstance();
    var callbackManager = require("../../../util/callbackmanager").getInstance();

    //Private variables.
    var self            = this;
    var webSocket       = null;
    var retryCount      = 0;

    //Western Europe.
    var boundary        = '{"west":-12,"east":20,"north":56,"south":33.6}';
    //North America
    //var boundary        = '{"west":-130,"east":-60,"north":62.5,"south":2.3}';

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Public functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    /**
     * Sets up a connection to the blitzortung websocket.
     * First checks to see is a connection is already open, if not it will attempt to open a connection (if the retry count has not been reached).
     *
     * When the socket is opened, a command is send to start receiving all lightning strikes in a given geographic area (southern europe).
     * Only strikes that are within 300km of the geographic center of Belgium will be saved to the cache, all others will be discarded.
     *
     * @param resetRetryCount When given and set to true, will reset the retryCount to 0.
     */
    this.setupBlitzortungWebSocket = function(resetRetryCount) {
        if(resetRetryCount !== null && resetRetryCount !== undefined) {
            retryCount = resetRetryCount === true ? 0 : retryCount;
        }

        //Safety check.
        if(retryCount === 0 && webSocket !== null) {
            webSocket.send(boundary, function ack(error) {
                if(error !== undefined) {
                    //An error occurred
                    logger.ERROR("Connection to blitzortung is in a zombie state, resetting...");
                    onWebsocketFailure(null, null);
                }
            });

            logger.WARNING("A connection to blitzortung is already open!");
            return;
        } else if(retryCount > 5) {
            logger.ERROR("Cannot (re)conntect to blitzortung websocket!");
            return;
        }

        //Connect to websocket from blitzortung.org
        webSocket = new WebSocket("ws://ws.blitzortung.org:808" + retryCount, "", {headers: {origin: "http://www.blitzortung.org"}});
        webSocket.on("open", function startupLightingSocket() {
            logger.INFO("Websocket connection to blitzortung opened!");
            retryCount = 0;
            webSocket.send(boundary);
        });
        webSocket.on("message", function lightningDataReceived(data) {
            var data = JSON.parse(data);

            //Check to see if the strike was in the radius (300km) of the geographic center of Belgium.
            //Only send the strike when in range.
            if(getDistanceBetweenTwoLatLonPoints(50.6404438,4.66775, data.lat, data.lon) <= 300) {
                logger.DEBUG("Lightning in range received!");
                messageFactory.sendSimpleMessage(messageFactory.TARGET_BROKER, "addToCache", {cacheName: "lightning", value: {timestamp: new Date(Math.floor(data.time/1000000)), lat: data.lat, lon: data.lon}});
            }
        });
        //If the socket goes down restart it!
        webSocket.on("close", onWebsocketFailure);
        webSocket.on("error", onWebsocketFailure);
    };

    /**
     * Will retrieve all lightning data, calculate the distance between the caller's position and return the results.
     * This will partially be handled by the "lightningDataMessageHandler" function.
     *
     * @param lat The latitude position of the caller.
     * @param lon The longitude position of the caller.
     * @param callback The callback function to execute when done.
     */
    this.lightningData = function(lat, lon, callback) {
        logger.INFO("lightningData method was called!");

        var id = callbackManager.generateIdForCallback(callback);
        messageFactory.sendMessageWithHandler(  messageFactory.TARGET_BROKER, "retrieveCache", {cacheName: "lightning"},
                                                "blitzortung", "lightningDataMessageHandler", {lat: lat, lon: lon, callbackId: id});
    };

    /**
     * Handles the returned data from the "lightningData" function.
     * The callback will be retrieved an executed. The processed data will be given to the caller.
     *
     * If not lightning data is available, an error is returned.
     * If there is data, for each lightning strike, the distance between the strike and location of the caller.
     *
     * @param msg The original message with the requested data (or error) added.
     */
    this.lightningDataMessageHandler = function(msg) {
        logger.DEBUG("blitzortung data received");

        if(msg.returnData === undefined || msg.returnData.length === 0) {
            logger.DEBUG("No data available, returning error!");

            callbackManager.returnAndRemoveCallbackForId(msg.handlerParams.callbackId)({warning: "No lightning data available!"});
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

            callbackManager.returnAndRemoveCallbackForId(msg.handlerParams.callbackId)({lat: oLat, lon: oLon, data: strikes});
        }
    };

    /**
     * Shows the complete contents of the lightning cache.
     * Mainly provided for debugging purposes.
     * This will partially be handled by the "showLightingCacheMessageHandler" function.
     *
     * @param callback The callback function to execute when done.
     */
    this.showLightingCache = function(callback) {
        logger.INFO("showLightingCache method was called!");

        var id = callbackManager.generateIdForCallback(callback);
        messageFactory.sendMessageWithHandler(  messageFactory.TARGET_BROKER, "retrieveCache", {cacheName: "lightning"},
                                                "blitzortung", "showLightingCacheMessageHandler", {callbackId: id});
    };

    /**
     * Handles the returned data from the "showLightingCache" function.
     * The callback will be retrieved an executed. This will result in the data being given back to the caller.
     *
     * @param msg The original message with the requested data (or error) added.
     */
    this.showLightingCacheMessageHandler = function(msg) {
        logger.DEBUG("blitzortung data received: " + msg.returnData);

        callbackManager.returnAndRemoveCallbackForId(msg.handlerParams.callbackId)(msg.returnData);
    };

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Private functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    /**
     * Executed when the websocket has failed (either close/error events).
     * An attempt will be made to reestablish the connection.
     *
     * @param data The error data.
     * @param flags The error flags.
     */
    function onWebsocketFailure(data, flags) {
        logger.ERROR("Websocket failure: " + JSON.stringify(data) + " - " + JSON.stringify(flags));

        //The retryCount acts as the count for retries and as the port number.
        retryCount++;
        webSocket = null;
        self.setupBlitzortungWebSocket();
    }

    /*-------------------------------------------------------------------------------------------------
     *                                  Mathematical functions
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
};

module.exports = Blitzortung;