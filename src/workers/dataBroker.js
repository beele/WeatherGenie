var logger = require("../logging/logger").makeLogger("BROKER");

//Variables.
var dataStore = {};

function initialise() {
    process.on("message", function(msg) {
        logger.DEBUG("Broker received message: " + msg);
        //logger.DEBUG("Broker received message: " + JSON.stringify(msg));

        switch (msg.targetFunc) {
            case "saveData":
                saveData(msg.key, msg.value);
                logger.INFO("Data saved!");
                break;
            case "updateData":
                updateData(msg.key, msg.value);
                logger.INFO("Data updated!");
                break;
            case "retrieveData":
                msg.value = retrieveData(msg.key);
                process.send(msg);
                logger.INFO("Data retrieved!");
                break;
            case "deleteData":
                deleteData(msg.key);
                logger.INFO("Data deleted!");
                break;
            case "createCache":
                createCache(msg.cacheName, msg.maxSize);
                logger.INFO("Cache created: " + msg.cacheName);
                break;
            case "addToCache":
                addToCache(msg.cacheName, msg.value);
                logger.INFO("Data added to cache: " + msg.cacheName);
                break;
            case "retrieveCache":
                msg.value = retrieveCache(msg.cacheName);
                process.send(msg);
                logger.INFO("Cache retrieved: " + msg.cacheName);
                break;
            case "removeFromCache":
                removeFromCache(msg.cacheName, msg.value);
                logger.INFO("Entries removed from cache: " + msg.cacheName);
                break;
            case "clearCache":
                clearCache(msg.cacheName);
                logger.INFO("Cache cleared: " + msg.cacheName);
                break;
        }
    });
    logger.INFO("Broker initialised!");
}

function saveData(key, value) {
    dataStore[key] = value;
}

function updateData(key, value) {
    dataStore[key] = value;
}

function retrieveData(key) {
    return dataStore[key];
}

function deleteData(key) {
    delete dataStore[key];
}

function createCache(cacheName, maxSize) {
    if (dataStore[cacheName] === null || dataStore[cacheName] === undefined) {
        dataStore[cacheName] = { data: [], maxSize: maxSize};
        logger.INFO("Cache " + cacheName + " with max size of " + maxSize + " created!")
    } else {
        logger.ERROR("Cache with name: " + cacheName + " already exists!");
    }
}

function addToCache(cacheName, value) {
    if(dataStore[cacheName].data !== null) {
        var cache = dataStore[cacheName];
        //Check cache size and take the correct action!
        if(cache.data.length >= cache.maxSize) {
            //Remove first element!
            cache.data.shift();
            logger.DEBUG("Data was popped from cache! (max size reached)");
        }
        //Add new value
        cache.data.push(value);
    }
}

function retrieveCache(cacheName) {
    return dataStore[cacheName].data;
}

function removeFromCache(cacheName, values) {
    var cache = dataStore[cacheName];

    if(values !== null || values !== undefined && values.length > 0) {
        for(var i = 0 ; i < values.length ; i++) {
            cache.data.splice(i,1);
        }
    }
}

function clearCache(cacheName) {
    dataStore[cacheName].data = [];
}

exports.initialise = initialise;