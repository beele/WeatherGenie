/************************************************************
 ***                  Contains util methods               ***
 ***********************************************************/
//TODO: Remove evil global vars.
var bgCounter = 1;
var bgTotal = 9;

var lat = null;
var lon = null;

var styleSheetSelection = null;

function hideSoftKeyboard() {
    document.activeElement.blur();
    var inputs = document.querySelectorAll('input');
    for(var i=0; i < inputs.length; i++) {
        inputs[i].blur();
    }
}

function reloadExternalImages() {
    var lightingImg = $("#lightningImg");
    var buienradarImg = $("#buienradarImg");

    lightingImg.attr("src", "http://images.blitzortung.org/Images/image_b_fr.png?" + new Date().getTime());
    buienradarImg.attr("src", "http://www.buienradar.be/image?" + new Date().getTime());
}

/**
 * Returns an object corresponding to the given condition type. The returned object has more information about the given condition.
 * @param condition The condition as received from the backend (wrapped openweathermap API).
 * @returns {{kind: string, bgIndex: number, weight: number}} An object containing more info about the background.
 */
function getWeatherConditionWeight(condition) {
    switch (condition) {
        //Day conditions:
        case "01d": return {kind : "clear sky",         bgIndex : 1, weight: 10};
        case "02d": return {kind : "few clouds",        bgIndex : 2, weight: 20};
        case "03d": return {kind : "scattered clouds",  bgIndex : 3, weight: 30};
        case "04d": return {kind : "broken clouds",     bgIndex : 4, weight: 40};
        case "09d": return {kind : "mist",              bgIndex : 5, weight: 50};
        case "10d": return {kind : "showers",           bgIndex : 6, weight: 50};
        case "11d": return {kind : "rain",              bgIndex : 7, weight: 60};
        case "13d": return {kind : "snow",              bgIndex : 8, weight: 60};
        case "50d": return {kind : "thunderstorm",      bgIndex : 9, weight: 70};
        //Night conditions:
        case "01n": return {kind : "clear sky",         bgIndex : 1, weight: 10};
        case "02n": return {kind : "few clouds",        bgIndex : 2, weight: 20};
        case "03n": return {kind : "scattered clouds",  bgIndex : 3, weight: 30};
        case "04n": return {kind : "broken clouds",     bgIndex : 4, weight: 40};
        case "09n": return {kind : "mist",              bgIndex : 5, weight: 50};
        case "10n": return {kind : "showers",           bgIndex : 6, weight: 50};
        case "11n": return {kind : "rain",              bgIndex : 7, weight: 60};
        case "13n": return {kind : "snow",              bgIndex : 8, weight: 60};
        case "50n": return {kind : "thunderstorm",      bgIndex : 9, weight: 70};
    }
}

/**
 * Used to loop through all the backgrounds.
 */
function toggleBackground() {
    var from = bgCounter++;
    if(bgCounter > bgTotal) {
        bgCounter = 1;
    }
    swapPageBackground(from, bgCounter);
}

/**
 * Swaps the background images between from and to indexes.
 * @param from The index to swap from.
 * @param to The index to swap to.
 */
function swapPageBackground(from, to) {
    $("#bgImage" + from).toggleClass("transparent");
    $("#bgImage" + to).toggleClass("transparent");
}

/**
 * Determines the correct background image for the given weather data.
 * @param weatherData The weatherData as received by the call to the REST API.
 */
function determineBackgroundImage(weatherData) {
    var conditions = weatherData.conditions;
    var weights = [];

    console.log("Determining background image...");
    for(var i = 0 ; i < conditions.length ; i++) {
        console.log(conditions[0]);
        weights.push(getWeatherConditionWeight(conditions[0].icon));
    }

    weights.sort(function(a,b) { return parseFloat(a.weight) - parseFloat(b.weight) });
    console.log(weights);
    //TODO: What if there are multiple same level conditions => Random one?
    if(weights !== null && weights.length > 0) {
        swapPageBackground(bgCounter, weights[0].bgIndex);
        bgCounter = weights[0].bgIndex;
    }
}

function calculateAndAnimsateSunPosition(weatherData) {
    var now = new Date();
    var sunUp = new Date(weatherData.sunrise * 1000);
    var sunDown = new Date(weatherData.sunset * 1000);

    var sunIsUpMinutes = (sunDown.getHours() * 60 + sunDown.getMinutes()) - (sunUp.getHours() * 60 + sunUp.getMinutes());
    var nowMinutes = now.getHours() * 60 + now.getMinutes();

    var degPerMinute = 180 / sunIsUpMinutes;
    var sunDeg = 315 + Math.round((nowMinutes - (sunUp.getHours() * 60 + sunUp.getMinutes())) * degPerMinute);

    restartAnimation("sunAnimation", "animateSun", "sunContainer", "sunWrapper" ,"to", "transform:rotate(" + sunDeg + "deg);");
}

function calculateAndAnimateWindDirectionPosition(weatherData) {
    restartAnimation("windDirAnimation", "animateWindDir", "compassWrapper", "needle" ,"to", "transform:rotate(" + weatherData.avgWindDirectionDegree +"deg);");
}

function calculateAndAnimateWindSpeed(weatherData) {
    var windArms = $("#windArms");
    windArms.removeClass("windSlow");
    windArms.removeClass("windMedium");
    windArms.removeClass("windFast");
    windArms.removeClass("windStorm");

    //This delay is necessary to make the change in animation work!
    setTimeout(function () {
        //km/h is m/s * 3.6
        var windSpeed = Math.round(weatherData.avgWindSpeed * 3.6);

        if(windSpeed == 0) {
            //No wind!
        } else if(windSpeed < 10) {
            windArms.addClass("windSlow");
        } else if(windSpeed < 30) {
            windArms.addClass("windMedium");
        } else if(windSpeed < 50) {
            windArms.addClass("windFast");
        } else {
            windArms.addClass("windStorm");
        }
    },100);
}

function createChartData(data, isForCurrentRainData) {
    var conditions = null;
    if(isForCurrentRainData) {
        conditions = data.currentConditions;
    } else {
        conditions = data.predictedConditions;
    }

    var labels = [];
    var datasets = [];
    var dataset =
    {
        label: "Current conditions",
        fillColor: "rgba(10,123,255,0.3)",
        strokeColor: "rgba(10,123,255,0.7)",
        pointColor: "rgba(10,123,255,1)",
        pointStrokeColor: "rgba(10,123,255,0.7)",
        pointHighlightFill: "rgba(10,123,255,0.7)",
        pointHighlightStroke: "rgba(10,123,255,0.7)",
        data: []
    };
    datasets.push(dataset);

    for( var i = 0; i < conditions.data.length ; i++) {
        var input = conditions.data;

        labels.push(input[i].time);
        dataset.data.push(input[i].intensity);
    }

    var result = {};
    result.labels = labels;
    result.datasets = datasets;
    return result;
}

/*----------------------------------------------------------------------------------
------------------------------------------------------------------------------------
                   Non weather specific javascript util functions
------------------------------------------------------------------------------------
----------------------------------------------------------------------------------*/
/**
 * Converts any given UNIX timestamp into a timeString (hh:mm).
 * @param unixTimeStamp The timestamp to convert.
 * @returns {string} The converted timestamp in string format (hh:mm)
 */
function unixTimeToTimeString(unixTimeStamp) {
    var date = new Date(unixTimeStamp * 1000);
    var hours = date.getHours() + "";
    var minutes = date.getMinutes() + "";

    if(hours.length == 1) {
        hours = "0" + hours;
    }
    if(minutes.length == 1) {
        minutes = "0" + minutes;
    }

    return hours + ":" + minutes;
}

/**
 * Finds the given keyframe by name.
 * @param rule The name of the keyframe rule to find in any document css.
 * @returns {*}
 */
function findKeyframesRule(rule) {
    if(styleSheetSelection === null) {
        // gather all stylesheets into an array
        var ss = document.styleSheets;
        //But we only need the css files we have locally with the animations in them.
        styleSheetSelection = [];
        for(var i = 0 ; i < ss.length ; i++) {
            styleSheetSelection.push(ss[i]);
        }
        //Only interested in our stylesheets!
        //styleSheetSelection.push(ss[3]);
        //styleSheetSelection.push(ss[4]);
    }

    var rules = [];
    // loop through the stylesheets
    for (var i = 0; i < styleSheetSelection.length; ++i) {
        var styleSheet = styleSheetSelection[i];
        // loop through all the rules
        if(styleSheet.cssRules !== null) {
            for (var j = 0; j < styleSheet.cssRules.length; ++j) {
                //Collect all the rules (including the ss[i].cssRules[j].type === window.CSSRule.WEBKIT_KEYFRAMES_RULE type for safari)
                if (styleSheet.cssRules[j].name == rule) {
                    rules.push(styleSheet.cssRules[j]);
                }
            }
        }
    }
    return rules.length === 0 ? null : rules;
}

/**
 * Restarts a pure css animation, and supports altering animation end state parameters.
 * @param animationName The name of the CSS keyframe based animation.
 * @param animationClass The name of the CSS class that contains the animation definition.
 * @param objectParentId The id of the wrapper object of the animated object.
 * @param objectId The id of the animated object.
 * @param ruleName The optional name of the keyframe animation label to alter.
 * @param rule The optional rule that should go with the ruleName.
 */
function restartAnimation(animationName, animationClass, objectParentId, objectId, ruleName, rule){
    if(ruleName !== null && rule !== null) {
        var keyframes = findKeyframesRule(animationName);

        //Because some browsers are silly, we delete the index (as per the spec) first and then the rulename (looking at you chrome).
        switch(ruleName) {
            case "from":
                deleteFromRules(keyframes, "0");
                deleteFromRules(keyframes, ruleName);
                break;
            case "to":
                deleteFromRules(keyframes, "1");
                deleteFromRules(keyframes, ruleName);
                break;
            default:
                deleteFromRules(keyframes, ruleName);
        }

        addToRules(keyframes, ruleName, rule);
    }

    //Restart the animation by cloning, removing and adding it to the DOM again.
    //This is the only way it consistently works.
    var original = $("#" + objectId);
    var cloned = original.clone().removeClass();
    original.remove();
    $("#" + objectParentId).append(cloned);
    cloned.addClass(animationClass);
}

function addToRules(rules, ruleName, ruleToAdd) {
    if(rules instanceof Array) {
        for(var i = 0 ; i < rules.length ; i++) {
            addRule(rules[i], ruleName, ruleToAdd);
        }
    } else {
        addRule(rules, ruleName, ruleToAdd);
    }
}

function addRule(rules, ruleName, rule) {
    if (typeof rules.insertRule === 'function') {
        rules.insertRule(ruleName +  " { -webkit-" + rule + " }");
    } else {
        rules.appendRule(ruleName +  " { " + rule + " }");
    }
}

function deleteFromRules(rules, ruleToDelete) {
    if(rules instanceof Array) {
        for(var i = 0 ; i < rules.length ; i++) {
            rules[i].deleteRule(ruleToDelete);
        }
    } else {
        rules.deleteRule(ruleToDelete);
    }
}

/**
 * Blocks the UI for the whole page, This will prevent the user from interacting with the page.
 * @param message The message to show to the user.
 */
function blockUI(message) {
    if(message === null || message === undefined) {
        message = "Loading weather data...";
    }

    $.blockUI({
        message: message,
        css: {
            border: "none",
            padding: "15px",
            backgroundColor: "rgb(202,202,202)",
            color: "rgb(71,71,71)",
            opacity: "1",
            'z-index': "9999"
        }
    });
}

/**
 * Blocks the UI with a given error message. The user can dismiss the error message by clicking anywhere on the page!
 * @param message The message to show to the user.
 */
function blockUIWithDismissableError(message) {
    message = "An error occurred: " + message + "<br/>Click to close this message!";

    $(".blockMsg").html(message);
    $(".blockUI").click(unblockUI);
}

/**
 * This unblocks the UI, allowing the user to interact with it again.
 */
function unblockUI() {
    $.unblockUI();
}