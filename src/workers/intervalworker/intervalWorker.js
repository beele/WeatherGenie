var logger          = require("../../logging/logger").makeLogger("INTERVALWORKER-");

var messageFactory  = require("../../util/messagefactory").getInstance();

var blitzortung     = require("../../services/weather/blitzortung/blitzortung");
var gifProcessor    = require("../../util/gifProcessor");
var buienradar      = require("../../services/weather/buienradar/buienradar");

/**
 *
 */
function startWorker() {
    //Set up the blitzortung service.
    setupBlitzortung();
    //Init buienradar image data the first time.
    refreshBuienradarImages();

    //Set up the interval to update the data regularly.
    setInterval(function() {
        logger.INFO("Refreshing data (8 minutes elapsed)");

        //The blitzortung websocket has a tendency of closing a lot. We will attempt a reconnection every 8 minutes.
        //If the connection is still open, nothing happens (the blitzortung service will also try to reconnect itself a few times)
        setupBlitzortung();
        refreshBuienradarImages();
    }, 480000 );

    logger.INFO("Interval worker started!");
}

/**
 *
 */
function setupBlitzortung() {
    logger.INFO("Attempting to setup websocket connect to blitzortung...");
    blitzortung.setupBlitzortungWebSocket();
}

/**
 *
 */
function refreshBuienradarImages() {
    logger.INFO("Attempting to update buienradar rain map...");

    gifProcessor.retrieveAndCorrectImages(function onImagesLoaded(currentImageData, predictImageData) {
        var now = buienradar.convertImageToRainMap(currentImageData);
        var pre = buienradar.convertImageToRainMap(predictImageData);
        var result = {currentRainMap: now, predictRainMap: pre};

        //Send message to the data broker to store the data.
        messageFactory.sendSimpleMessage(messageFactory.TARGET_BROKER, "saveData", {key: "rainMaps", value: result});

        logger.INFO("Buienradar rain map updated!");
    });
}

exports.startWorker = startWorker;