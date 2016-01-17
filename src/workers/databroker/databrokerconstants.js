var DataBrokerConstants = (function() {
    var logger = require("../../logging/logger").makeLogger("CONSTANTS------");

    //Private variables.
    var instance;

    /**
     * Private constructor which creates the actual DataBrokerConstants instance.
     *
     * @returns {{FUNC_SAVE_DATA: string, FUNC_UPDATE_DATA: string, FUNC_RETRIEVE_DATA: string, FUNC_DElETE_DATA: string, FUNC_CREATE_CACHE: string, FUNC_ADD_TO_CACHE: string, FUNC_RETRIEVE_CACHE: string, FUNC_REMOVE_FROM_CACHE: string, FUNC_CLEAR_CACHE: string}}
     */
    function init() {
        /*-------------------------------------------------------------------------------------------------
         * ------------------------------------------------------------------------------------------------
         *                                        Public functions
         * ------------------------------------------------------------------------------------------------
         ------------------------------------------------------------------------------------------------*/
        return {
            BROKER_SAVE_DATA            : "saveData",
            BROKER_UPDATE_DATA          : "updateData",
            BROKER_RETRIEVE_DATA        : "retrieveData",
            BROKER_DElETE_DATA          : "deleteData",

            BROKER_CREATE_CACHE         : "createCache",
            BROKER_ADD_TO_CACHE         : "addToCache",
            BROKER_RETRIEVE_CACHE       : "retrieveCache",
            BROKER_RETRIEVE_FROM_CACHE  : "retrieveFromCache",
            BROKER_REMOVE_FROM_CACHE    : "removeFromCache",
            BROKER_CLEAR_CACHE          : "clearCache"
        };
    }

    return {
        /**
         * Returns the singleton instance.
         * @returns {*}
         */
        getInstance: function () {
            if (!instance) {
                instance = init();
            }
            return instance;
        }
    };
})();

module.exports = DataBrokerConstants;