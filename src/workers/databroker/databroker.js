var DataBroker = function () {
    var logger = require("../../logging/logger").makeLogger("DATABROKER-----");

    //Configuration.
    var Config          = require("../../../resources/config");
    var config          = new Config();

    //Private variables.
    var dataStore       = null;
    var cacheStale      = config.settings.cacheStaleThresholdInMinutes * 60 * 1000;

    init();

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Public functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    this.setupDefaultCaches = function() {
        createCache({data : {cacheName: "lightning"             , maxSize: 250}});
        createCache({data : {cacheName: "weather_openweathermap", maxSize: 50}});
        createCache({data : {cacheName: "weather_buienradar"    , maxSize: 50}});
    };

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Private functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    /**
     * Initializes the databroker.
     * Sets up the dataStore that will hold all the data (in memory).
     * Attaches a message handler.
     */
    function init() {
        dataStore = {};

        process.on("message", messageReceived);
        logger.INFO("Broker initialised!");
    }

    /**
     * Handles messages that are relayed here from the workers. Executes the targetFunc.
     * The targetFunc should map directly to one of the functions in the section "Data broker data handling".
     *
     * @param msg The message that was sent to the broker.
     */
    function messageReceived(msg) {
        logger.DEBUG("Broker received message from worker: " + msg.workerId);
        eval(msg.targetFunc)(msg);
    }

    /**
     * Checks to see if the message that was received is of the simple kind or the kind that has handlers (which means it needs to be forwarded again).
     *
     * @param msg The message that was received.
     * @returns {boolean} True if the message contains handles and needs to be forwarded, false if not.
     */
    function isMessageWithHandlers(msg) {
        if(msg.handler === undefined || msg.handler === null || msg.handlerFunction === undefined || msg.handlerFunction === null) {
            logger.ERROR("Cannot handle message!");
            logger.ERROR("A simple message was sent when a message with handler definitions is required!");
            logger.ERROR("Worker: " + msg.workerId + " requested: " + msg.targetFunc);
            return false;
        }
        return true;
    }

    /*-------------------------------------------------------------------------------------------------
     *                                  Data broker data handling
     ------------------------------------------------------------------------------------------------*/
    /**
     * Saves the data present on the message.
     * Data should come from the "data" object on the message.
     * The objects "key" and "value" should be present.
     *
     * @param msg The message that contains the data to save.
     */
    function saveData(msg) {
        dataStore[msg.data.key] = msg.data.value;
    }

    /**
     * Updates the data present on the message.
     * Data should come from the "data" object on the message.
     * The objects "key" and "value" should be present.
     *
     * @param msg The message that contains the data to update.
     */
    function updateData(msg) {
        dataStore[msg.data.key] = msg.data.value;
    }

    /**
     * Retrieve the data by the key present on the message.
     * Data should come from the "data" object on the message.
     * The object "key" should be present.
     *
     * @param msg The message that contains the key for the data to retrieve.
     */
    function retrieveData(msg) {
        if(isMessageWithHandlers(msg)) {
            msg.returnData = dataStore[msg.data.key];
            process.send(msg);
        }
    }

    /**
     * Delete the data identified by the key present on the message.
     * Data should come from the "data" object on the message.
     * The object "key" should be present.
     *
     * @param msg The message that contains the key for the data to be deleted.
     */
    function deleteData(msg) {
        delete dataStore[msg.data.key];
    }

    /**
     * Creates a cache for the given cache name and maximum size.
     * Data should come from the "data" object on the message.
     * The objects "cacheName" and "maxSize" should be present.
     *
     * @param msg The message that contains the cache name and maximum size.
     */
    function createCache(msg) {
        if (dataStore[msg.data.cacheName] === null || dataStore[msg.data.cacheName] === undefined) {
            dataStore[msg.data.cacheName] = { data: [], maxSize: msg.data.maxSize};
            logger.INFO("Cache " + msg.data.cacheName + " with max size of " + msg.data.maxSize + " created!")
        } else {
            logger.ERROR("Cache with name: " + msg.data.cacheName + " already exists!");
        }
    }

    /**
     * Adds data to a specific cache.
     * Data should come from the "data" object on the message.
     * The objects "cacheName" and "value" should be present.
     * If the maximum cache size is exceeded the first element is removed.
     *
     * @param msg The message that contains the data and the cache name to add the data to.
     */
    function addToCache(msg) {
        if(dataStore[msg.data.cacheName].data !== null) {
            var cache = dataStore[msg.data.cacheName];
            //Check cache size and take the correct action!
            if(cache.data.length >= cache.maxSize) {
                //Remove first element!
                cache.data.shift();
                logger.DEBUG("Data was popped from cache! (max size reached)");
            }
            //Add new value
            cache.data.push(msg.data.value);
        }
    }

    /**
     * Retrieves a full size cache.
     * Data should come from the "data" object on the message.
     * The object "cacheName" should be present.
     *
     * @param msg The message that contains the name of the cache to retrieve.
     */
    function retrieveCache(msg) {
        if(isMessageWithHandlers(msg)) {
            if(dataStore[msg.data.cacheName] !== undefined) {
                msg.returnData = dataStore[msg.data.cacheName].data;
            } else {
                msg.returnData = null;
                logger.ERROR("Cannot find cache: " + msg.data.cacheName + " in dataStore");
            }
            process.send(msg);
        }
    }

    /**
     * Retrieves a match from the cache.
     * Data should come from the "data" object on the message. the "valueId" object should contain a string that is the path to the value that will be compared to the value in "valueIdValue".
     * The object "cacheName" should be present.
     * The object "valueId" should be present.
     * The object "valueIdValue" should be present.
     *
     * @param msg The message that contains the name of the cache to retrieve the matching object from.
     */
    function retrieveFromCache(msg) {
        if(isMessageWithHandlers(msg)) {
            if(dataStore[msg.data.cacheName] !== undefined) {
                var cache = dataStore[msg.data.cacheName].data;
                var key = msg.data.valueId;

                //Cache checking vars.
                var now = new Date();
                var obsoleteIndexes = [];

                for(var i = 0; i < cache.length; i++) {
                    var entry = cache[i];

                    //We use a handy trick to allow for string based notation to get a value in a chain of objects/arrays.
                    var getter = new Function("obj", "return obj." + key + ";");
                    var value = getter(cache[i]);

                    //Perform stale checks on all values.
                    var previous = new Date(entry.timeStamp);
                    if((+previous + cacheStale) > +now) {
                        //Check if the wanted value matches the given value => cache match!
                        if(msg.data.valueIdValue.toLowerCase() === value.toLowerCase()) {
                            logger.DEBUG("Valid cached entry found!");
                            msg.returnData = entry;
                        }
                    } else {
                        logger.DEBUG("Cache index " + i + " is outdated!");
                        obsoleteIndexes.push(i);
                    }
                }

                //Send the obsolete indexes if any to the broker to have them removed!
                if(obsoleteIndexes.length > 0) {
                    logger.DEBUG("Removing obsolete weather data from cache");
                    removeFromCache({cacheName: msg.data.cacheName, value: obsoleteIndexes});
                }

                if(msg.returnData === null || msg.returnData === undefined) {
                    msg.returnData = null;
                    logger.ERROR("Cannot find value in cache: " + msg.data.cacheName + " (" + msg.data.valueId + " with value: " + msg.data.valueIdValue + ")");
                }
            } else {
                msg.returnData = null;
                logger.ERROR("Cannot find cache: " + msg.data.cacheName + " in dataStore");
            }
            process.send(msg);
        }
    }

    /**
     * Removes values from a cache.
     * Data should come from the "data" object on the message.
     * The objects "cacheName" and "values" should be present.
     *
     * @param msg The message that contains the cache name and the values that should be removed.
     */
    function removeFromCache(msg) {
        var cache = dataStore[msg.data.cacheName];

        var values = msg.data.value;
        if(values !== null || values !== undefined && values.length > 0) {
            for(var i = 0 ; i < values.length ; i++) {
                cache.data.splice(i,1);
            }
        }
    }

    /**
     * Clears a cache. The cache will be empty after this action.
     * Data should come from the "data" object on the message.
     * The object "cacheName" should be present.
     *
     * @param msg The message that contains the cache name.
     */
    function clearCache(msg) {
        dataStore[msg.data.cacheName].data = [];
    }
};

module.exports = DataBroker;