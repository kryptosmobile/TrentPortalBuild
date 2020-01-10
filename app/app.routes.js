angular.module('appRoutes', []).config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {

    $routeProvider
        .when('/', {
            templateUrl: 'app/components/main/mainView.html',
            controller: 'mainController'
        })
        .when('/app/:appid/:pageid', {
            templateUrl: 'app/components/applet/appletView.html',
            controller: 'appletController'
        })
        .when('/:sitebaseurl/:id', {
            templateUrl: 'app/components/cmspage/pageView.html',
            controller: 'unifyedPageCtrl'
        }).when('/group/:sitebaseurl/:id', {
            templateUrl: 'app/components/groups/grouppage.html',
            controller: 'unifyedSiteGroupPageCtrl'
        });

        $locationProvider.hashPrefix('');
        //$locationProvider.html5Mode({enabled: true,requireBase: false});
}]);
