var TwitterService = function() {
    var logger  = require("../../logging/logger").makeLogger("SERV-TWITTER---");
    var Twitter = require('twitter');

    //Private variables.
    var client  = null;

    init();

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Public functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    //TODO: Decent implementation
    this.tweet = function(request, response) {
        logger.INFO("Tweet method was called!");

        client.post('statuses/update', {status: 'The genie is out of the lamp!'},  function(error, tweet, response){
            if(error) throw error;
            logger.DEBUG(tweet);
            logger.DEBUG(response);
        });

        response.writeHead(200, {});
        response.write(JSON.stringify({result: "ok"}, 0, 4));
        response.end();
    };

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Private functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    function init() {
        client = new Twitter({
            //TODO: Load twitter credentials.
            consumer_key: '',
            consumer_secret: '',
            access_token_key: '',
            access_token_secret: ''
        });
    }

    //TODO: Implement!
    /*function startInterval() {
        setInterval(function() {
            logger.DEBUG("Testing interval 61s");

            client.get('statuses/mentions_timeline', function(error, tweets, response){
                if(error) throw error;
                logger.DEBUG(tweets);
                logger.DEBUG(response);

                //TODO: Check for new mentions and reply to them!
            });

        }, 61000 );
    }*/
};

module.exports = TwitterService;