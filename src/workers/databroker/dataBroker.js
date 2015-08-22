var DataBroker = function () {
    var logger = require("../../logging/logger").makeLogger("DATABROKER-----");
    var dataStore = {};

    process.on("message", messageReceived);
    logger.INFO("Broker initialised!");

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Private functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    /**
     *
     * @param msg
     */
    function messageReceived(msg) {
        logger.DEBUG("Broker received message from: " + msg.workerId);
        eval(msg.targetFunc)(msg);
    }

    /**
     *
     * @param msg
     * @returns {boolean}
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
     * ------------------------------------------------------------------------------------------------
     *                                  Data broker data handling
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    /**
     *
     * @param msg
     */
    function saveData(msg) {
        dataStore[msg.data.key] = msg.data.value;
    }

    /**
     *
     * @param msg
     */
    function updateData(msg) {
        dataStore[msg.data.key] = msg.data.value;
    }

    /**
     *
     * @param msg
     */
    function retrieveData(msg) {
        if(isMessageWithHandlers(msg)) {
            msg.returnData = dataStore[msg.data.key];
            process.send(msg);
        }
    }

    /**
     *
     * @param msg
     */
    function deleteData(msg) {
        delete dataStore[msg.data.key];
    }

    /**
     *
     * @param msg
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
     *
     * @param msg
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
     *
     * @param msg
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
     *
     * @param msg
     */
    function removeFromCache(msg) {
        var cache = dataStore[msg.data.cacheName];

        var values = msg.data.values;
        if(values !== null || values !== undefined && values.length > 0) {
            for(var i = 0 ; i < values.length ; i++) {
                cache.data.splice(i,1);
            }
        }
    }

    /**
     *
     * @param msg
     */
    function clearCache(msg) {
        dataStore[msg.data.cacheName].data = [];
    }
};

module.exports = DataBroker;