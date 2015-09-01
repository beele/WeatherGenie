//Init charts.
Chart.defaults.global.scaleOverride = true;
Chart.defaults.global.scaleSteps = 5;
Chart.defaults.global.scaleStepWidth = 1;
Chart.defaults.global.scaleStartValue = 0;
Chart.defaults.global.showTooltips = false;
Chart.defaults.global.scaleLineColor = "rgba(255,255,255,.7)";
Chart.defaults.global.scaleFontColor = "rgba(255,255,255,.7)";

//Services.
angular.module('weatherGenieApp.services', [])
    .factory('weatherAPIService', function($http) {

        var weatherAPI = {};

        weatherAPI.getCityInformation = function (fakeScope, callback) {
            console.log("Submitted: " + fakeScope.city);
            blockUI();

            $http.get('weather/' + fakeScope.city).then(
                function onResponse(response) {
                    var data = response.data;

                    //Check for errors from the backend (City not found,...).
                    if (data.error !== null) {
                        fakeScope.weatherData = null;
                        blockUIWithDismissableError(data.error);
                        return;
                    }

                    //Process data.
                    data.latitude = (data.latitude + "").replace(".", ",");
                    data.longitude = (data.longitude + "").replace(".", ",");
                    data.sunriseString = unixTimeToTimeString(data.sunrise);
                    data.sunsetString = unixTimeToTimeString(data.sunset);

                    var interval = fakeScope.bgInterval;
                    if (interval !== null) {
                        clearInterval(interval);
                        interval = null;
                        fakeScope.bgInterval = null;
                    }

                    determineBackgroundImage(data);
                    calculateAndAnimsateSunPosition(data);
                    calculateAndAnimateWindDirectionPosition(data);
                    calculateAndAnimateWindSpeed(data);

                    fakeScope.weatherData = data;
                    callback();
                },
                function onError(response) {
                    blockUIWithDismissableError("An error occurred: " + response.statusCode);
                }
            );
        };

        weatherAPI.retrieveRainInformation = function (fakeScope, lat, lon) {
            $http.get('weather/rain/' + lat + "&" + lon).then(
                function onResponse(response) {
                    var data = response.data;

                    //Charting!
                    var ctxCurrent = document.getElementById("currentCanvas").getContext("2d");
                    var ctxPredict = document.getElementById("predictCanvas").getContext("2d");
                    var lineChartCurrent = new Chart(ctxCurrent).Line(createChartData(data, true), {bezierCurve: false});
                    var lineChartPredict = new Chart(ctxPredict).Line(createChartData(data, false), {bezierCurve: false});

                    //Process rain data and put in on the scope:
                    var currentRain = data.currentConditions.data[data.currentConditions.data.length - 1];
                    switch (currentRain.intensity) {
                        case 0:
                            currentRain = 0;
                            break;
                        case 1:
                            currentRain = 1;
                            break;
                        case 2:
                            currentRain = 4;
                            break;
                        case 3:
                            currentRain = 7.5;
                            break;
                        case 4:
                            currentRain = 50;
                            break;
                        case 5:
                            currentRain = 100;
                            break;
                    }

                    fakeScope.rainData = {
                        isRainingNow: currentRain !== 0,
                        intensity: currentRain
                    };
                },
                function onError(response) {
                    blockUIWithDismissableError("An error occurred: " + response.statusCode);
                }
            );
        };

        weatherAPI.retrieveLightningInformation = function (fakeScope, lat, lon) {
            $http.get('weather/lightning/' + lat + "&" + lon).then(
                function onResponse(response) {
                    var data = response.data;

                    //Process lightning data and put in on the scope:

                    //Only continue if we have any data to process!
                    if (data.ERROR !== undefined) {
                        return;
                    }

                    var now = new Date();

                    var strike = null;
                    var closeCount = 0;
                    var mediumCount = 0;
                    var farCount = 0;
                    for (var i = 0; i < data.data.length; i++) {
                        var currentStrike = data.data[i];
                        var dt = new Date(currentStrike.timestamp);

                        //Do a stale data check on the strike, if too old discard!
                        //60 mins * 60 secs * 1000 millisecs.
                        if (dt.getTime() + 60 * 60 * 1000 < now.getTime()) {
                            continue;
                        }

                        if (strike === null) {
                            strike = currentStrike;
                        }

                        //Find the closest strike:
                        if (currentStrike.distance < strike.distance) {
                            strike = currentStrike;
                        }

                        //Count strikes depending on distance to the current lat/lon
                        if (currentStrike.distance <= 50) {
                            closeCount++;
                        } else if (currentStrike.distance <= 100) {
                            mediumCount++;
                        } else {
                            farCount++;
                        }
                    }

                    //If no strike is available, show a dash!
                    if(strike === null) {
                        strike = {distance : "-"};
                    }

                    fakeScope.lightningData = {
                        closestStrike: strike,
                        closeCount: closeCount,
                        mediumCount: mediumCount,
                        farCount: farCount
                    };
                },
                function onError(response) {
                    blockUIWithDismissableError("An error occurred: " + response.statusCode);
                }
            );
        };

        return weatherAPI;
    });