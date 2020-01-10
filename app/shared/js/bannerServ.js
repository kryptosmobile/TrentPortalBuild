angular.module('BannerSrvc', []).factory('BannerService', ['$http', '$rootScope', function($http, $rootScope) {
	var services = {};

    var tempStore = {
        "bypass": false,
        "productinfo": {},
        "clearpass" : "",
        "bannerticket": "",
        "roles": [],
        "username": "",
        "password": ""
    };

    function fnVerifyBannerTicket(tempStore, callBack) {
        tempStore.bypass = false;
        if ($rootScope.bannerticket && (tempStore.productinfo && tempStore.productinfo.middlewareUrl)) {
            tempStore.bypass = true;
        }
        tempStore.bannerticket = $rootScope.bannerticket;
        return callBack(null, tempStore);
    }

    function fnGetBannerInfoFromTenantSettings(tempStore, callBack) {
        if (tempStore.bypass) {
            return callBack(null, tempStore);
        }
        tempStore.bypass = ($rootScope.bannerticket) ? true : false;
        var tenantid = $rootScope.user.tenant;
        var platformreq = {
            method: "GET",
            url: $rootScope.GatewayUrl + "/unifydplatform/open/tenant/search/findOneByTenantid?tenantid=" + tenantid ,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-TENANT-ID': 'CEAI',
            }
        }
        $http(platformreq).then(function successCallback(res) {
            var bannerProd;
            if (res && res.data) {
                bannerProd = _.find(res.data.products, function(product) {
                    return product.product == "BANNER";
                });
            }
            tempStore.productinfo = bannerProd;
            return callBack(null, tempStore);
        }, function errorCallback(err) {
            return callBack(err);
        });
    }

    function fnGetUserName(tempStore, callBack) {
        if (tempStore.bypass) {
            return callBack(null, tempStore);
        }
        tempStore.username = "dhorton";
        tempStore.password = "Tape1798";
        return callBack(null, tempStore);
        // this code should be replaced with actual logic
    }

    function fnGetClearpass(tempStore, callBack) {
        return callBack(null, tempStore);
        if (tempStore.bypass) {
            return callBack(null, tempStore);
        }
        var qlTenantid = tempStore.productinfo.qlTenantid;
        var clearpassEndpoint = "https://qlsso.quicklaunchsso.com/admin/secured/" + qlTenantid + "/api/getClearPass";
        var errorObj = { "error" : ""}
        // call clearpass API
        $http({
            url: clearpassEndpoint,
            method: 'GET',
            withCredentials: true
        }).then(function successCallback(res) {
            if (!res.data) {
                errorObj.error = "Unknown error";
                return callBack(errorObj);
            }
            tempStore.clearpass = res.data;
            return callBack(null, tempStore);
        }, function errorCallback(err1) {
            return callBack(err1);
        });
    }

    function fnBannerAuthenticate(tempStore, callBack) {
        if (tempStore.bypass) {
            return callBack(null, tempStore);
        }
        var username = tempStore.username,
            password =  tempStore.password;
        var authEndpoint = tempStore.productinfo.middlewareUrl + "/services/authenticate/login",
            postdata     = "username=" + username + "&password=" + encodeURIComponent(password);
        var request = { "url" : authEndpoint,
                        "method" : "POST",
                        "body": postdata,
                        "headers": {'Content-Type': 'application/x-www-form-urlencoded'}
                      }
        $http({
            url: "/proxy",
            method: "POST",
            data: request
        }).then(function successCallback(res) {
            tempStore.bannerticket = res.data.ticket;
            tempStore.roles = res.data.roles;
            return callBack(null, tempStore);
        }, function errorCallback(err1) {
            return callBack(err1);
        });

    }

    function streamlineBannerProcess(callBack) {
         async.waterfall([
            async.apply(fnVerifyBannerTicket, tempStore),
            fnGetBannerInfoFromTenantSettings,
            fnGetUserName,
            fnGetClearpass,
            fnBannerAuthenticate
            ], function(err, tempStore) {
                if (err) {
                    return callBack(err);
                }
                return callBack(null, tempStore);
            });
    }

	services.getAPI = function(endpoint, callback) {
        streamlineBannerProcess(function(err, resTempStore) {
            if (err) {
                return callback(err);
            }
            $rootScope.bannerticket = resTempStore.bannerticket;
            $rootScope.demoMode = resTempStore.productinfo.demoMode;
            $rootScope.bannerMiddlewareUrl = resTempStore.productinfo.middlewareUrl;
            tempStore = resTempStore;
            var serviceUrl = resTempStore.productinfo.middlewareUrl +  "/services/student" +
                             endpoint + "?ticket=" + $rootScope.bannerticket;
            var error = { "error" : "" };
            var apiBody = { "url" : serviceUrl,
                            "method" : "GET",
                            "body": "",
                            "headers": { 'Content-Type': 'application/x-www-form-urlencoded' }
                          }
            $http({
                url: "/proxy",
                method: "POST",
                data: apiBody
            }).then(function successCallback(res) {
                return callback(res);
            }, function errorCallback(err1) {
                if (err1.status == "403") {
                    // forbidden (ticket expired)
                    $rootScope.bannerticket = "";
                    tempStore.bannerticket = "";
                    this.getAPI(endpoint, callback);
                } else {
                    return callback(err1);
                }
            });
        });
	};

	services.postAPI = function(endpoint, postdata, callback) {
        async.waterfall([
            async.apply(fnVerifyBannerTicket, tempStore),
            fnGetBannerInfoFromTenantSettings,
            fnGetUserName,
            fnGetClearpass,
            fnBannerAuthenticate
            ], function(err, tempStore) {
                if (err) {
                    return callback(err);
                }
                $rootScope.bannerticket = tempStore.bannerticket;
                var serviceUrl = tempStore.productinfo.middlewareUrl +  "/services/student" +
                                 endpoint + "?ticket=" + $rootScope.bannerticket;
                var error = { "error" : ""};
                var apiBody = { "url" : serviceUrl,
                                "method" : "POST",
                                "body": postdata,
                                "headers": {'Content-Type': 'application/x-www-form-urlencoded'}
                              }
                $http({
                    url: "/proxy",
                    method: "POST",
                    data: apiBody
                }).then(function successCallback(res) {
                    return callback(res);
                }, function errorCallback(err1) {
                    return callback(err1);
                });
            });
	};
	return services;
}]);
