let appletCtrl = angular.module('AppletCtrl', []);
appletCtrl.controller('appletController', ['$rootScope', '$scope', '$routeParams', '$http', '$compile', '$sce', '$location', '$window', 'BannerService', 'sqlLiteServ','$injector', 'convertSvgIcon', function($rootScope, $scope, $routeParams, $http, $compile, $sce, $location, $window, BannerService, sqlLiteServ,$injector ,convertSvgIcon) {
    let services = {
        "BannerService": BannerService
    }

    $scope.appid = $routeParams.appid;
    $scope.pageid = $routeParams.pageid;
    console.log("appid=" + $scope.appid + " - pageid=" + $scope.pageid);

    $scope.evaluateApplet = function(appPage, callBack) {
        try {
            window.eval(appPage.pageprocessor);
            return callBack(appPage);
        } catch (e) {
            if (!$rootScope.isblocking) $.unblockUI();
            console.error(e);
            return callBack(appPage, e);
        }
    }
    $scope.adddynamicPadding = function(){
        var headerHeight = $('#appHeader').height()
        var footerHeight = $('#bottomFixContent').height()
        $('#loadApplet').css({
            'paddingBottom':footerHeight,
            'paddingTop':headerHeight
        })
    }
    $scope.launchPage = function(appPage) {
        var pagedef = {};
        pagedef.datatemplate = appPage.datatemplate;
        pagedef.pageprocessor = appPage.pageprocessor;
        //pagedef.pageTemplate = appPage.pageTemplate;
        // Get all additional configs.
        for (var prop in appPage) {
            switch (prop) {
                case "pageid":
                    break;
                case "datatemplate":
                    break;
                case "pageTemplate":
                    break;
                case "pageprocessor":
                    break;
                default:
                    pagedef[prop] = appPage[prop];
            }
        }

        try {
            setTimeout(function() {
                $("#appContent").append("");
                window[$scope.pname](pagedef, $scope, $routeParams, $compile,
                    $http, $rootScope, $sce, $window, $location, services,sqlLiteServ,convertSvgIcon);
                 $scope.adddynamicPadding();
                $scope.$apply();
            }, 100);
        } catch (err) {
            $.unblockUI();
        }
    }

    let found = false;
    $scope.pname = "pageprocessor" + $scope.pageid;

    $scope.checkNewAppletVer = function(){
      var req = {
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          },
          url: '/studio/checkappletver/' + $rootScope.tenantId + '/' + $scope.appid,
          method: 'GET'
      };
      $rootScope.callCMSAPI(req, function(err, res) {
          $rootScope.appletsData = $rootScope.appletsData || [];
          $rootScope.appletsData.push(res.pages[0]);
          $scope.evaluateApplet(res.pages[0], $scope.launchPage);
      });
    }

    $scope.getAppletFromLocal = function(){
      angular.forEach($rootScope.appletsData, function(val, key) {
          if (val.pageid == $scope.pageid) {
              found = true;
              $scope.evaluateApplet(val, $scope.launchPage);
          }
      });

      if (found) {
          return;
      }

      if (!found) {
          /* check if the page is sql DB */
          if (window.device) {
              let trans = [];
              trans.push({
                  q: `SELECT info FROM pageDetails WHERE pageid = ?`,
                  d: [$scope.pageid]
              });
              sqlLiteServ.runGetQuery(trans, function(err, res) {
                  if (err) {
                      var req = {
                          headers: {
                              'Content-Type': 'application/json',
                              'Accept': 'application/json'
                          },
                          url: '/studio/getappletmetadata/' + $rootScope.tenantId + '/' + $scope.appid + "/" + $scope.pageid,
                          method: 'POST',
                          data:{
                            uuid: window.device?device.uuid:'9876543210',
                          }
                      };

                      $rootScope.callCMSAPI(req, function(err, res) {
                          $rootScope.appletsData = $rootScope.appletsData || [];
                          $rootScope.appletsData.push(res.pages[0]);
                          $scope.evaluateApplet(res.pages[0], $scope.launchPage);
                          trans = [];
                          trans.push({
                              q: `CREATE TABLE IF NOT EXISTS pageDetails (info,pageid)`,
                              d: null
                          });
                          trans.push({
                              q: `INSERT INTO pageDetails (info,pageid) VALUES (?,?)`,
                              d: [JSON.stringify(res.pages[0]), res.pages[0].pageid]
                          });
                          if (window.device) {
                              sqlLiteServ.runAddQuery(trans, function(err, res) {
                                  if (err) {
                                      console.log(err);
                                  }
                              });
                          } else {

                          }
                      });
                  } else {
                      //console.log('pageDetails', JSON.parse(res.item(0).info));
                      $rootScope.appletsData = $rootScope.appletsData || [];
                      $rootScope.appletsData.push(JSON.parse(res.item(0).info));
                      $scope.evaluateApplet(JSON.parse(res.item(0).info), $scope.launchPage);
                  }
              });
          } else {
              var req = {
                  headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                  },
                  url: '/studio/getmobileappletmetadata/' + $rootScope.tenantId + '/' + $scope.appid + "/" + $scope.pageid,
                  method: 'POST',
                  data:{
                    uuid: window.device?device.uuid:'9876543210',
                  }
              };
              $rootScope.callCMSAPI(req, function(err, res) {
                let appletVersion = $.jStorage.get('appletVersion')?$.jStorage.get('appletVersion'):{};
                appletVersion[$scope.appid] = res.updateApp.appletversion;
                $.jStorage.set('appletVersion',appletVersion);
                $rootScope.appletsData = $rootScope.appletsData || [];
                $rootScope.appletsData.push(res.updateApp.pages[0]);
                $scope.evaluateApplet(res.updateApp.pages[0], $scope.launchPage);
                $scope.saveApplet($scope.pageid,res.updateApp.pages[0]);
              });
          }
      }
    }

    $scope.saveApplet = function(pageid,pages){
      let trans = [];
      trans.push({
          q: `SELECT info FROM pageDetails WHERE pageid = ?`,
          d: [pageid]
      });
      sqlLiteServ.runGetQuery(trans, function(err, res) {
          if (err) {
            trans = [];
            trans.push({
                q: `CREATE TABLE IF NOT EXISTS pageDetails (info,pageid)`,
                d: null
            });
            trans.push({
                q: `INSERT INTO pageDetails (info,pageid) VALUES (?,?)`,
                d: [JSON.stringify(pages), pageid]
            });
          }else{
            trans = [];
            trans.push({
                q: `UPDATE pageDetails SET info=? WHERE pageid=?`,
                d: [JSON.stringify(pages), pageid]
            });
          }
          sqlLiteServ.runAddQuery(trans, function(err, res) {
              if (err) {
                  console.log(err);
              }
          });
        });
    }

    $scope.checkDeviceUpdatePublish = function(){
      var req = {
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          },
          url: '/studio/getmobileappletmetadata/' + $rootScope.tenantId + '/' + $scope.appid + "/" + $scope.pageid,
          method: 'POST',
          body: { uuid: window.device?device.uuid:'9876543210',
                  cver:$.jStorage.get('appletVersion')?$.jStorage.get('appletVersion')[$scope.appid]:null
          },
  		    json: true
      };
      $rootScope.callCMSAPI(req, function(err, res) {
          //console.log('checkDeviceUpdatePublish',res);
          if(res.success){
            /* No update is required, get applet from sqlLite else load from mongo DB */
            $scope.getAppletFromLocal();
          } else if(res.devicepublish){
            let appletVersion = $.jStorage.get('appletVersion')?$.jStorage.get('appletVersion'):{};
            appletVersion[$scope.appid] = res.devicepublish.appletversion;
            $.jStorage.set('appletVersion',appletVersion);
            $scope.evaluateApplet(res.devicepublish.pages[0], $scope.launchPage);
          } else{
            let appletVersion = $.jStorage.get('appletVersion')?$.jStorage.get('appletVersion'):{};
            appletVersion[$scope.appid] = res.updateApp.appletversion;
            $.jStorage.set('appletVersion',appletVersion);
            $rootScope.appletsData = $rootScope.appletsData || [];
            $rootScope.appletsData.push(res.updateApp.pages[0]);
            $scope.evaluateApplet(res.updateApp.pages[0], $scope.launchPage);
            $scope.saveApplet($scope.pageid,res.updateApp.pages[0]);
          }
      });
    }();
}]);
