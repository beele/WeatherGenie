var cluster = require('cluster');

var blitzortung = require("../workers/blitzortung/blitzortung");
var gifProcessor = require("../workers/buienradar/gifProcessor");
var buienradar = require("../workers/buienradar/buienradar");

var logger = require("../logging/logger").makeLogger("INTERV");

function startWorker() {
    //Set up the blitzortung service.
    setupBlitzortung();

    //Init buienradar image data the first time.
    refreshBuienradarImages();

    //Set up the interval to update the data regularly.
    setInterval(function() {
        logger.INFO("Refreshing data (8 minutes elapsed)");

        logger.DEBUG("Retrieving and processing buienradar images");
        refreshBuienradarImages();
    }, 480000 );

    logger.INFO("Interval worker started!");
}

function setupBlitzortung() {
    logger.DEBUG("Attempting to setup websocket connect to blitzortung...");

    blitzortung.setupBlitzortungWebSocket();
}

function refreshBuienradarImages() {
    logger.DEBUG("Attempting to update buienradar rain map...");

    gifProcessor.retrieveAndCorrectImages(function onImagesLoaded(currentImageData, predictImageData) {
        var now = buienradar.convertImageToRainMap(currentImageData);
        var pre = buienradar.convertImageToRainMap(predictImageData);
        var result = {currentRainMap: now, predictRainMap: pre};

        var payload = {};
        payload.origin = cluster.worker.id;
        payload.originFunc = "refreshBuienradarImages";
        payload.target = "broker";
        payload.targetFunc = "saveData";
        payload.key = "rainMaps";
        payload.value = result;
        process.send(payload);

        logger.INFO("Buienradar rain map updated!");
    });
}

exports.startWorker = startWorker;