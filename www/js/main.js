//Init charts:
Chart.defaults.global.scaleOverride = true;
Chart.defaults.global.scaleSteps = 5;
Chart.defaults.global.scaleStepWidth = 1;
Chart.defaults.global.scaleStartValue = 0;
Chart.defaults.global.showTooltips = false;
Chart.defaults.global.scaleLineColor = "rgba(255,255,255,.7)";
Chart.defaults.global.scaleFontColor = "rgba(255,255,255,.7)";

//Start angularJS.
var app = angular.module('weatherGenie', []);
var bgInterval;

app.run(function($rootScope) {
    //Get the user's GEOlocation.
    determineGeoLocation();
    //Loop through all the backgrounds. This will be stopped when a search has been done.
    bgInterval = setInterval(toggleBackground, 10000);
});

app.controller('weatherController', function($scope, $http) {
    $scope.getCityInformation = function() {
        console.log("Submitted: " + $scope.city);
        blockUI();

        $http({method: 'GET', url: 'weather/' + $scope.city}).
            success(function(data, status, headers, config) {
                //Check for errors from the backend (City not found,...).
                if(data.error !== null) {
                    $scope.weatherData = null;
                    unblockWithError(data.error);
                    return;
                }

                //Process data.
                data.sunriseString = unixTimeToTimeString(data.sunrise);
                data.sunsetString = unixTimeToTimeString(data.sunset);

                if(bgInterval !== null) {
                    clearInterval(bgInterval);
                    bgInterval = null;
                }

                determineBackgroundImage(data);
                calculateAndAnimsateSunPosition(data);
                calculateAndAnimateWindDirectionPosition(data);
                calculateAndAnimateWindSpeed(data);

                $scope.weatherData = data;
                var lat = (data.latitude + "").replace(".", ",");
                var lon = (data.longitude + "").replace(".", ",");
                $scope.retrieveRainInformation(lat,lon);
                unblockUI();
            }).
            error(function(data, status, headers, config) {
                unblockWithError(status);
            });
    };

    $scope.retrieveRainInformation = function(lat, lon) {

        $http({method: 'GET', url: 'weather/geo/' + lat + "&" + lon}).
            success(function(data, status, headers, config) {
                //Charting!
                var ctxCurrent = document.getElementById("currentCanvas").getContext("2d");
                var ctxPredict = document.getElementById("predictCanvas").getContext("2d");
                var lineChartCurrent = new Chart(ctxCurrent).Line(createChartData(data, true), {bezierCurve: false});
                var lineChartPredict = new Chart(ctxPredict).Line(createChartData(data, false), {bezierCurve: false});
            }).
            error(function(data, status, headers, config) {
                console.log(status);
            });
    }
});

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

    var data = {};
    data.labels = labels;
    data.datasets = datasets;

    return data;
}