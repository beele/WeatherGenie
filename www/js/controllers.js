//Controllers.
angular.module('weatherGenieApp.controllers', [])
    .controller('weatherController', function ($scope, weatherAPIService) {

        //Loop through all the backgrounds. This will be stopped when a search has been done.
        $scope.bgInterval = setInterval(toggleBackground, 10000);

        $scope.initialSearch = function () {
            //TODO: Do this with angular animation!
            //Perform some animations to go away from the initial screen.
            $("#initialSearch").animate({bottom: 1500, opacity: 0, height: 50}, 1500, "swing", function complete() {
                $(this).toggleClass("hidden");
            });

            var item = $("#headerWrapper");
            item.toggleClass("hidden");
            item.fadeTo(2000, 1);
            item = $("#content");
            item.toggleClass("hidden");
            item.fadeTo(2000, 1);
            item = $("#footer");
            item.toggleClass("hidden");
            item.fadeTo(2000, 1);

            //Perform the actual search!
            $scope.search();
        };

        $scope.search = function () {
            hideSoftKeyboard();
            reloadExternalImages();

            var clback = function onCityInformationRetrieved() {
                weatherAPIService.retrieveRainInformation($scope, $scope.weatherData.latitude, $scope.weatherData.longitude);
                weatherAPIService.retrieveLightningInformation($scope, $scope.weatherData.latitude, $scope.weatherData.longitude);
                unblockUI();
            };

            weatherAPIService.getCityInformation($scope, clback);
        };
    });