var IntervalWorker = function() {
    var logger          = require("../../logging/logger").makeLogger("INTERVALWORKER-");
    var messageFactory  = require("../../util/messagefactory").getInstance();

    //Required private imports for functionality.
    var BuienRadar      = require("../../services/weather/buienradar/buienradar");
    var GifProcessor    = require("../../util/gifprocessor");
    var Blitzortung     = require("../../services/weather/blitzortung/blitzortung");

    var buienradar      = null;
    var gifProcessor    = null;
    var blitzortung     = null;

    init();

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Private functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    /**
     * Sets up the interval worker.
     * Sets up the blitzortung websocket connection.
     * Refreshes and processes the buienradar images.
     * Starts and interval and after the given interval both functions are executed again.
     * This should then update the buienradar images and reconnect the blitzortung websocket if it lost connection.
     */
    function init() {
        buienradar      = new BuienRadar();
        gifProcessor    = new GifProcessor();
        blitzortung     = new Blitzortung();

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
     * Runs the setupBlitzortungWebSocket() function on the blitzortung service.
     * This makes sure the socket connection to blitzortung is set up on the interval worker instance (and not some HTTP worker instance).
     */
    function setupBlitzortung() {
        logger.INFO("Attempting to setup websocket connect to blitzortung...");
        blitzortung.setupBlitzortungWebSocket(true);
    }

    /**
     * Refreshes the buienradar current and predictive rain images and processes them.
     * This makes sure this intensive process happens on the interval worker instance (and not some HTTP worker instance).
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
};

module.exports = IntervalWorker;