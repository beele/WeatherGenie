var logger = require("../logging/logger").makeLogger("BROKER");

//Constants
//TODO: Put constants in singleton wrapper.
const FUNC_SAVE_DATA            = "saveData";
const FUNC_UPDATE_DATA          = "updateData";
const FUNC_RETRIEVE_DATA        = "retrieveData";
const FUNC_DElETE_DATA          = "deleteData";

const FUNC_CREATE_CACHE         = "createCache";
const FUNC_ADD_TO_CACHE         = "addToCache";
const FUNC_RETRIEVE_CACHE       = "retrieveCache";
const FUNC_REMOVE_FROM_CACHE    = "removeFromCache";
const FUNC_CLEAR_CACHE          = "clearCache";

//Variables.
var dataStore = {};

function initialise() {
    process.on("message", function(msg) {
        logger.DEBUG("Broker received message from: " + msg.workerId);
        eval(msg.targetFunc)(msg);
    });
    logger.INFO("Broker initialised!");
}

function isMessageWithHandlers(msg) {
    if(msg.handler === undefined || msg.handler === null || msg.handlerFunction === undefined || msg.handlerFunction === null) {
        logger.ERROR("Cannot handle message!");
        logger.ERROR("A simple message was sent when a message with handler definitions is required!");
        logger.ERROR("Worker: " + msg.workerId + " requested: " + msg.targetFunc);
        return false;
    }
    return true;
}

function saveData(msg) {
    dataStore[msg.data.key] = msg.data.value;
}

function updateData(msg) {
    dataStore[msg.data.key] = msg.data.value;
}

function retrieveData(msg) {
    if(isMessageWithHandlers(msg)) {
        msg.returnData = dataStore[msg.data.key];
        process.send(msg);
    }
}

function deleteData(msg) {
    delete dataStore[msg.data.key];
}

function createCache(msg) {
    if (dataStore[msg.data.cacheName] === null || dataStore[msg.data.cacheName] === undefined) {
        dataStore[msg.data.cacheName] = { data: [], maxSize: msg.data.maxSize};
        logger.INFO("Cache " + msg.data.cacheName + " with max size of " + msg.data.maxSize + " created!")
    } else {
        logger.ERROR("Cache with name: " + msg.data.cacheName + " already exists!");
    }
}

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

function removeFromCache(msg) {
    var cache = dataStore[msg.data.cacheName];

    var values = msg.data.values;
    if(values !== null || values !== undefined && values.length > 0) {
        for(var i = 0 ; i < values.length ; i++) {
            cache.data.splice(i,1);
        }
    }
}

function clearCache(msg) {
    dataStore[msg.data.cacheName].data = [];
}

exports.initialise = initialise;