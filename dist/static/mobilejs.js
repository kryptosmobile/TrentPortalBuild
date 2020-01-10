//'use strict';
const onDeviceReady = () => {
  angular.module('unifyedmobile', [
    'MainCtrl',
    'AppletCtrl',
    'pageCtrl',
    'siteGroupCtrl',
    'MobileServices',
    'convertSvg',
    'cmsDirectives',
    'siteGroupHeaderDirective',
    'UnifyedActionIcon',
    'BannerSrvc',
    'sqlService',
    'ngRoute',
    'appRoutes'
  ]);
}
window.device?document.addEventListener('deviceready',onDeviceReady, false):onDeviceReady();

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

var unifyedCMSDirectives = angular.module('cmsDirectives', []);
unifyedCMSDirectives.directive('uniApplet', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', 'BannerService', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location, BannerService) {
    return {
        restrict: 'A',
        transclude: false,
        scope: { apps: '=apps', comp: '=comp', span: '=span' },
        link: function(scope, element, attr) {
            scope.user = $rootScope.user;
            scope.randomBackground = $rootScope.randomBackground;
            //alert("uniApplet directive " + scope.id);
            //alert(element.data("aid"));
            //scope.appletname = scope.comp.applet.displayname;
            scope.getWidgetHtml = function(widget) {
                //alert(widget.processor);
                //if(!CONSOLE) widget.processor = widget.processor.replace(/console\.log\(([^)]+)\);/igm, "");
                window.eval(widget.processor);
                var result = window["proc" + widget.name](widget.attribs);
                return $sce.trustAsHtml(result);
            };
            var getCompHtml = function(comp, node) {
                if (comp.widgetid && $rootScope.pagedata.widgetcomps != undefined) {
                    var widget = null;
                    var len = $rootScope.pagedata.widgetcomps.length;
                    for (var i = 0; i < len; i++) {
                        if ($rootScope.pagedata.widgetcomps[i]._id == comp.widgetid) {
                            widget = $rootScope.pagedata.widgetcomps[i].widget;
                        }
                    }
                    if (widget) {
                        comp.widget = widget;
                    }
                }
                if (comp.widget) {
                    var dt = "<div ng-bind-html='getWidgetHtml(comp.widget)'></div>";
                    if (comp.widget.editor && comp.widget.editor == true)
                        dt = "<div id='ak' cid='ak' uni-editor compval='comp.widget.attribs[0]' ng-bind-html='getWidgetHtml(comp.widget)'></div>";
                    else if (comp.widget.compile && comp.widget.compile == true)
                        dt = "<div>" + scope.getWidgetHtml(comp.widget) + "</div>";
                    return dt;
                } else if (comp.applet) {
                    console.log(comp.applet);
                    var appPage = comp.applet.pages[0];
                    //if(!CONSOLE) appPage.pageprocessor = appPage.pageprocessor.replace(/console\.log\(([^)]+)\);/igm, "");
                    window.eval(appPage.pageprocessor);
                    var pagedef = {};
                    var procname = "pageprocessor" + comp.applet.appkey;
                    pagedef.datatemplate = appPage.datatemplate;
                    pagedef.pageprocessor = appPage.pageprocessor;
                    pagedef.pageTemplate = appPage.pageTemplate;
                    var services = { BannerService: BannerService }
                    try {
                        window[procname](appPage, scope, $routeParams, $compile, $http,
                            $rootScope, $sce, $window, $location, services, scope.span);
                    } catch (ex) {
                        console.log("Error in processor..");
                    }
                    var data = '<div>' +
                        '<div class="applet-header hidden-xs" >' + comp.applet.displayname + '</div>' +
                        '<div class="applet-header visible-xs cmscellTitleResponsive" ng-class="" data-toggle="collapse" data-target="#' + comp.applet._id + '" aria-expanded="true">' + comp.applet.displayname + '<i class="fa fa-angle-down pull-right"></i></div>' +
                        //'<img class="float-left applet-header-icon" src=\'' + comp.applet.iconUrl + '\'/>' + comp.applet.displayname + '</div>'
                        '<div class="applet-content cmscellReponsiveContent collapse in" id="' + comp.applet._id + '">' +
                        comp.applet.pages[0].datatemplate + comp.applet.pages[0].pageTemplate + '</div>' + '</div>';
                    var data2 = "<div>" +
                        "<uni-Applet apps='tenantmetadata.apps' data-aid=" + comp.applet.id + "></uni-Applet>" +
                        "<div class='appletdrop'>" +
                        "Applet..!!<br/>" +
                        "<img src='" + comp.applet.iconUrl + "'/>" +
                        "<h1>" + comp.applet.displayname + "</h1>" +
                        "</div>" +
                        "</div>";
                    var data1 = $compile(data)($rootScope);
                    //MM:console.log(data1.html());
                    //return $sce.trustAsHtml(data1.html());
                    //node.append(data1);
                    //alert(comp.applet.pages[0].pageTemplate);
                    return data;
                }
                return "";
            };
            if (scope.comp.applet) {
                var vappKey = scope.comp.applet.appkey || scope.comp.applet.name;
                console.log('vappkey=' + vappKey);
                var url = '/studio/getappletmetadata/' + $rootScope.tenantId + "/" + vappKey + "/" + vappKey;
                console.log("Before calling applet metadata API " + new Date());
                var req = {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    url: url,
                    method: 'POST',
                    data:{
                      uuid: window.device?device.uuid:'9876543210',
                    }
                };
                $.blockUI();
                $rootScope.callCMSAPI(req, function(err, res) {
                  //scope.comp.applet.pages = res.pages[0];
                  $.unblockUI();
                  scope.comp.applet.pages = res.pages;
                  //return callBack(currentapp);
                  var data = getCompHtml(scope.comp);
                  $(element).append($compile(data)(scope));
                });
            } else {
                var data = getCompHtml(scope.comp);
                $(element).append($compile(data)(scope));
            }
        }
    };
}]).directive('uniDraggable', ['$document', function($document) {
    return {
        scope: false,
        link: function(scope, element, attr) {
            var startX = 0,
                startY = 0,
                x = 0,
                y = 0;
            if (attr.posx) {
                x = attr.posx;
                //startX=attr.posx;
            }
            if (attr.posy) {
                y = attr.posy;
                //startY = attr.posy;
            }
            element.css({
                /*position: 'relative',*/
                border: '1px solid transparent',
                cursor: 'pointer',
                width: 'auto',
                top: y + "px",
                left: x + "px"
            });
            element.on('mousedown', function(event) {
                // Prevent default dragging of selected content
                event.preventDefault();
                //MM:console.log(event.pageX + " : " + event.pageY);
                startX = event.pageX - x;
                startY = event.pageY - y;
                $document.on('mousemove', mousemove);
                $document.on('mouseup', mouseup);
                $("#widgetposition").removeClass("hide");
                //$("#pageContent").append($("#widgetposition"));
                $("#widgetposition").html("X: " + event.pageX + ", Y : " + event.pageY);
            });

            function mousemove(event) {
                y = event.pageY - startY;
                x = event.pageX - startX;
                element.css({
                    top: y + 'px',
                    left: x + 'px'
                });
                scope.selectedcomp.position.x = x;
                scope.selectedcomp.position.y = y;
                $("#widgetposition").removeClass("hide");
                $("#widgetposition").html("X: " + x + ", Y : " + y);
            }

            function mouseup() {
                $document.off('mousemove', mousemove);
                $document.off('mouseup', mouseup);
                //$("#widgetposition").addClass("hide");
                //element.parent.append($("#widgetposition"));
            }
        }
    };
}]).directive('uniEditor', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'A',
        transclude: true,
        scope: { attribute: '=compval' },
        link: function(scope, element, attr) {
            //alert("uniApplet directive " + scope.id);
            //alert(attr.cid);
            //scope.appletname = scope.comp.applet.displayname;
            //alert(element.data.cid);
            //setTimeout(function() {
            /*BalloonEditor
                //.create( document.querySelector("#" + attr.cid ) )
                .create( element[0]  )
                .then( editor => {
                    console.log( editor );
                    editor.document.on( 'change', ( evt, data ) => {
                        console.log("AK event fired " +  evt, data );
                        scope.attribute.value = editor.getData();
                    } );
                } )
                .catch( error => {
                    console.error( error );
                } ); */
            //}, 100);
        }
    };
}]).directive('cmssidebutton', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        scope: { icon: '@icon', image: '@image', label: '@label' },
        template: '<div class="cmssidebutton">' +
            '<div ng-class="icon" class=""></div>' +
            '<div class="cmssidbuttonlabel">{{label}}</div>' +
            '<div class="marker"></div>' + //MM:
            '</div>',
        link: function(scope, element, attr) {
            element.on("click", function(event) {
                //alert(scope.label);
                $(".cmssidebutton").removeClass("selected");
                $(element.children()[0]).addClass("selected");
                //angular.element()
            });
        }
    };
}]).directive('cmsapp', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', '$route', 'FragmentLoaderService', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location, $route, FragmentLoaderService) {
    return {
        restrict: 'A',
        transclude: true,

        template: '<div class="applicationpage">' +
            '<nav  class="cmstopnav" ng-if="studiomode">' +
            '<div style="" class="cmstopnavInner">' +
            '<div style="float:left"  tabindex="0" aria-label="unifyed logo" class="tabFocusHighlighter">' +
            '<span style="display:inline-block;height:100%;vertical-align:middle;"></span>' +
            '<img src="images/logo-300x83.png" alt="unifyed logo" style="width: 132px;">' +
            '</div>' +

            '<div class="tabFocusHighlighter"  tabindex="0" aria-label="project dropdown" style="float: left;"><div class="proximaFont text-info" style="margin-top: 5px;margin-left: 20px;color: #525252;">PROJECT</div><a href="#" ng-click="openInstitutions();"  role="button" aria-haspopup="true"  style="padding-top: 0px;margin-left: 20px;padding-left: 0px;color: #000;">{{site.name}} <span class="caret"></span></a><ul class="dropdown-menu"></ul></div>' +
            '<div style="float:right;text-align:center;">' +
            //'<a class="previewBtn">' +
            //        '<img src="images/hamburger.png" />' +
            //'</a>' +
            '</div>' +
            '<div style="float:right;text-align:center; margin: 3px 10px;"  tabindex="0" aria-label="publish icon" class="tabFocusHighlighter">' +
            '<button class="btn primary-btn btn-cancel"  disabled title="Coming Soon" style="color: #000;">Publish</button>' +
            '</div>' +
            '<div style="float:right;text-align:center;margin: 3px 10px;"  tabindex="0" aria-label="save icon" class="tabFocusHighlighter">' +
            '<button class="btn primary-btn btn-cancel" ng-click="savePage();" title="Save"  style="color: #000;">Save</button>' +
            '</div>' +
            /*'<div ng-if="$root.viewModeOn" style="float:right;text-align:center;margin: 3px 10px;"  tabindex="0" aria-label="save icon" class="tabFocusHighlighter">' +
                '<button class="btn primary-btn" ng-click="exitViewMode();" title="Exit View Mode">Exit View Mode</button>' +
            '</div>' +*/
            // '<div ng-if="cmsapplication || site.sitefeatureaccess.preview" tabindex="0" aria-label="preview button" class="tabFocusHighlighter" style="float:right;text-align:center; margin: 3px 10px;>' +
            //     '<button class="btn primary-btn btn-cancel" ng-click="openPreview();"  title="Save"   style="color: #000;">Preview</button>' +
            // '</div>' +
            '<div ng-if="cmsapplication || site.sitefeatureaccess.redo"  tabindex="0" aria-label="redo icon" class="tabFocusHighlighter" style="float:right;text-align:center;width:70px;">' +
            '<a class="navbar-icon-container" ng-click="redoAction()">' +
            '<img src="images/cmstools/redo.png" alt="redo icon" class="navbar-icons" />' +
            '<br>' +
            '<div class="navbar-icon-label">Redo</div>' +
            '</a>' +
            '</div>' +
            '<div ng-if="cmsapplication || site.sitefeatureaccess.undo"  tabindex="0" aria-label="undo icon" class="tabFocusHighlighter" style="float:right;text-align:center;width:70px;">' +
            '<a class="navbar-icon-container" ng-click="undoAction()">    ' +
            '<img src="images/cmstools/undo.png" alt="undo icon" class="navbar-icons" /> ' +
            '<br>' +
            '<div class="navbar-icon-label"  style="color: #525252;">Undo</div>' +
            '</a>' +
            '</div>' +

            '<div ng-if="cmsapplication || site.sitefeatureaccess.mobilesimu"  tabindex="0" aria-label="mobile view icon" class="tabFocusHighlighter" style="float:right;text-align:center;width:70px;">' +
            '<a class="navbar-icon-container" ng-click="showmobileview();">' +
            '<img src="images/cmstools/mobile-browser.png" alt="mobile browser icon" id="cmsdevicemobile" class="navbar-icons cmstooliconblur" />' +
            '<br>' +
            '<div class="navbar-icon-label"  style="color: #525252;">Mobile</div>' +
            '</a>' +
            '</div>' +
            '<div ng-if="cmsapplication || site.sitefeatureaccess.tabsimu"  tabindex="0" aria-label="ipad view icon" class="tabFocusHighlighter" style="float:right;text-align:center;width:70px;">' +
            '<a class="navbar-icon-container" ng-click="showtabletview();">' +
            '<img src="images/cmstools/ipad.png" alt="ipad icon"  id="cmsdeviceipad" class="navbar-icons cmstooliconblur"/>' +
            '<br>' +
            '<div class="navbar-icon-label"  style="color: #525252;">iPad/Tab</div>' +
            '</a>' +
            '</div>' +
            '<div ng-if="cmsapplication || site.sitefeatureaccess.desktopsimu" tabindex="0" aria-label="desktop view icon" class="tabFocusHighlighter" style="float:right;text-align:center;width:70px;">' +
            '<a class="navbar-icon-container" ng-click="showwebview();">' +
            '<img src="images/cmstools/desktop.png" alt="desktop icon"  id="cmsdevicedesktop" class="navbar-icons cmstooliconblur"/>' +
            '<br>' +
            '<div class="navbar-icon-label-active"  style="color: #525252;">Desktop</div>' +
            '</a>' +
            '</div>' +


            '</div>' +
            '</nav>' +

            '<div class="leftmenu" id="leftmenu" ng-if="studiomode">' +
            '<cmssidebutton ng-if="cmsapplication || site.sitefeatureaccess.design" icon="design-icon icon-design" label="Design" ng-click="loadDesign();"></cmssidebutton>' +
            '<cmssidebutton ng-if="cmsapplication || site.sitefeatureaccess.sitepage" icon="pages-icon icon-pages" label="Sites & Pages" ng-click="loadAppletPages();"></cmssidebutton>' +
            '<cmssidebutton ng-if="cmsapplication || site.sitefeatureaccess.widgets" icon="widgets-icon icon-widgets" label="Widgets" ng-click="loadWidgets();"></cmssidebutton>' +
            '<cmssidebutton ng-if="cmsapplication || site.sitefeatureaccess.content" icon="content-icon icon-files" label="Content" ng-click="loadContent();"></cmssidebutton>' +
            '<cmssidebutton icon="appmanager-icon icon-app-manager" label="App Manager" ng-click="loadAppManager();"></cmssidebutton>' +
            /*'<cmssidebutton ng-if="cmsapplication || site.sitefeatureaccess.analytics" icon="analytics-icon icon-Analytics" label="Analytics" ng-click="loadAnalytics();"></cmssidebutton>' +*/
            /*'<cmssidebutton ng-if="cmsapplication || site.sitefeatureaccess.push" icon="push-icon icon-push-notification" label="Push Notification" ng-click="loadPushNotification();"></cmssidebutton>' +*/
            '<cmssidebutton ng-if="cmsapplication || site.sitefeatureaccess.settings" icon="settings-icon icon-settings" label="Settings" ng-click="loadSettings();"></cmssidebutton>' +
            '<cmssidebutton icon="usergroup-icon icon-UsersGroups_icon" label="User/Groups" ng-click="loadUserAndGroup();"></cmssidebutton>' +
            '<cmssidebutton icon="settings-icon icon-settings" label="Chat" ng-click="loadChat();"></cmssidebutton>' +
            '<cmssidebutton ng-if="cmsapplication" icon="settings-icon icon-settings" label="Tenant Setup" ng-click="tenantSetup();"></cmssidebutton>' +
            '</div>' +
            '<div ng-transclude class="apppagecontainer"></div>' +
            '</div>',
        replace: true,
        link: function(scope, element, attr) {
            $rootScope.tenantMsg = "";
            //Get school info
            scope.getSchoolInfo = function() {
                console.log("calling school api");
                var url = '/unifydplatform/open/school/search/findOneByTenantId?tenant=' + $rootScope.selSite.tenantid;
                $rootScope.callAPI(url, 'GET', '', function(response) {
                    console.log(response);
                    $rootScope.schoolInfo = response.data;
                    if (!$rootScope.schoolInfo) {
                        $rootScope.schoolInfo = {}
                        $rootScope.tenantid = $rootScope.selSite.tenantid;
                        $rootScope.schoolInfo.tenantId = $rootScope.selSite.tenantid;
                    }
                    $rootScope.schoolInfo.tenantId = ($rootScope.schoolInfo.tenantId) ? $rootScope.schoolInfo.tenantId : $rootScope.selSite.tenantid;
                    $rootScope.schoolInfo.name = ($rootScope.schoolInfo.name) ? $rootScope.schoolInfo.name : $rootScope.tenantDoc.name;
                });

            }

            scope.exitViewMode = function() {
                    $rootScope.viewModeOn = false;
                }
                //MM: code for tenant setup
            scope.tenantSetup = function() {
                console.log($rootScope.selSite);
                console.log("site");
                console.log($rootScope.site);
                $rootScope.tenantMsg = "";
                $rootScope.schoolInfo = [];
                $rootScope.genderList = [];
                $rootScope.categoryList = [];

                $http.get('/unifyed-platform/tenant/' + $rootScope.selSite.tenantid).then(function(response) {
                    $rootScope.tenantDoc = response.data;
                    if (!$rootScope.tenantDoc) {
                        $rootScope.tenantDoc = {}
                    }
                    if ($rootScope.tenantDoc._id) {
                        $rootScope.tenantDoc.id = $rootScope.tenantDoc._id;
                    }
                    $rootScope.tenantDoc.tenantid = ($rootScope.tenantDoc.tenantid) ? $rootScope.tenantDoc.tenantid : $rootScope.selSite.tenantid;
                    $rootScope.tenantDoc.siteId = $rootScope.selSite._id;
                    console.log("calling school info");
                    scope.getSchoolInfo();
                }, function(errorResponse) {
                    console.log('Could not retrieve  tenant info');
                    $rootScope.tenantDoc = {}
                    $rootScope.tenantid = $rootScope.selSite.tenantid;
                    $rootScope.tenantDoc.siteId = $rootScope.selSite._id;
                    scope.getSchoolInfo();
                });
                $("#selectTenantSetupModel").modal("show");
            }
            scope.submitTenant = function() {
                console.log("Updating tenant");
                console.log($rootScope.tenantDoc);
                if (typeof $rootScope.tenantDoc.admins == "string") {
                    var tempStr = $rootScope.tenantDoc.admins;
                    $rootScope.tenantDoc.admins = (tempStr) ? tempStr.split(",") : [];
                }
                if (typeof $rootScope.tenantDoc.products == "string") {
                    var tempStr = $rootScope.tenantDoc.products;
                    $rootScope.tenantDoc.products = (tempStr) ? tempStr.split(",") : [];
                }
                //
                console.log("before calling callAPI");
                var url = '/unifydplatform/open/tenant';
                $rootScope.callAPI(url, 'POST', $rootScope.tenantDoc, function(res) {
                    console.log(res);
                });
            }

            /*scope.loadAppManager = function() {
                $.blockUI()
                $('#appmanagerframe').on('load', function() {
                    if(scope.loadinprogress) {
                        $.unblockUI()
                        $rootScope.isappmanagerview = true;
                        scope.loadinprogress = false;
                        scope.$apply();
                    }

                });
                var tenantid = $rootScope.site.tenantid;
                //tenantid = "NSC"; //For testing.
                scope.loadinprogress = true;
                var studioUrl = "https://studio.unifyed.com/appmanager/" + tenantid + "?user=" + $rootScope.username;
                //$("#appmanagerframe").attr("src","http://localhost:8081/CCMSTenantAppConfigurator/showTenantConsole?tenant=" + $rootScope.site.tenantid + "?q=" + new Date().getTime());
                $("#appmanagerframe").attr("src", studioUrl );

                $(".apppagecontainer").hide();
            }*/
            scope.loadAppManager = function() {
                FragmentLoaderService.loadFragments(['appstorePanel', 'appstore', 'myapps', 'createApp'], function() {
                    $(".submenucontainer").hide();
                    $("#appStorePanelContainer").removeClass("hide");
                    $("#appStorePanelContainer").show();
                    $("#appStorePanelContainer").addClass("animated");
                    $("#appStorePanelContainer").addClass("pulse");
                });
            }
            $rootScope.exitAppManager = function() {
                $rootScope.isappmanagerview = false;
                $("#appmanagerframe").attr("src", "");
                $(".apppagecontainer").show();
            }
            scope.loadUsers = function() {
                FragmentLoaderService.loadFragments(['userManagement'], function() {
                    $(".submenucontainer").hide();
                    $("#usermgmtcontainer").removeClass("hide");
                    $("#usermgmtcontainer").show();
                    $("#usermgmtcontainer").addClass("animated");
                    $("#usermgmtcontainer").addClass("pulse");
                });

            };

            //userandgroup
            //userandgroup
            scope.loadUserAndGroup = function() {
                FragmentLoaderService.loadFragments(['userAndGroup'], function() {
                    $("#userAndGroup").removeClass("hide");
                    $("#designpanelcontainer").hide();
                    $('#contentscontainer').hide();
                    $("#controlpanelcontainer").hide();
                    $("#appletpagescontainer").hide();
                    $('#rolebaseRbackModal').modal('hide');
                    $("#appmanagerframe").attr("src", "");
                });
            };

            //rback
            scope.loadRback = function() {
                FragmentLoaderService.loadFragments(['rolebaseRback'], function() {
                    $('#rolebaseRbackModal').modal('show');
                    $("#userAndGroup").hide();
                    $("#designpanelcontainer").hide();
                    $("#controlpanelcontainer").hide();
                    $("#appletpagescontainer").hide();
                });
            };

            /* Code for Design theme */
            scope.loadDesign = function() {
                    FragmentLoaderService.loadFragments(['designPanel'], function() {
                        //$("#siteSettingsModel").modal("show");
                        //$(".hideStudioMenuPage ").hide();
                        $("#appmanagerframe").attr("src", "");
                        $(".submenucontainer").hide();
                        $("#designpanelcontainer").removeClass("hide");
                        $("#designpanelcontainer").show();
                        $("#designpanelcontainer").addClass("animated");
                        $("#designpanelcontainer").addClass("pulse");
                    });
                    $(".cmssidebutton").removeClass("selected");
                }
                /* Code for chat theme */
            scope.loadChat = function() {
                    FragmentLoaderService.loadFragments(['chatsettings'], function() {
                        //$("#userContainer").show();
                        $(".submenucontainer").hide();
                        $("#chatsettingscontainer").removeClass("hide");
                        $("#chatsettingscontainer").show();
                        $("#chatsettingscontainer").addClass("animated");
                        $("#chatsettingscontainer").addClass("pulse");
                    });
                    $(".cmssidebutton").removeClass("selected");
                }
                /* Code for Design theme ends */
            var loadSite = function(callback) {
                $http.get('/sites/site/' + $rootScope.selSite._id).then(function(response) {
                    //alert(JSON.stringify(response.data));
                    $rootScope.site = response.data;
                    //$("header .navbar").css("background-color", $rootScope.site.header.bgcolor);
                    $rootScope.navmenu = response.data.pages;
                    try {
                        if ($('#tree1')) {
                            $('#tree1').tree('loadData', $rootScope.navmenu);
                            var tree_data = $('#tree1').tree('getTree');
                            //MM:console.log(tree_data);
                            //alert(tree_data);
                        }
                    } catch (ex) {
                        //alert(ex);
                    }
                    $rootScope.pagetransition = "pulse";
                    if (callback) {
                        callback();
                    }
                }, function(errorResponse) {
                    console.log('Error in loading site /sites/site ' + errorResponse);
                    return callback();
                });
            };

            var populatetenantdata = function(tenant, metadata) {
                if (!metadata.error) {
                    $('#brandingcss').html(metadata.customStyle);
                    var appGroups = [],
                        subApps = [];
                    $rootScope.otherApplets = [];
                    //$rootScope.dockApplets = [];
                    //alert(JSON.stringify(metadata));
                    $rootScope.tenantmetadata = {}
                    $rootScope.tenantmetadata.apps = metadata;
                    $rootScope.applets = $rootScope.tenantmetadata.apps;
                    //$rootScope.applets = $rootScope.tenantmetadata;
                    angular.forEach($rootScope.tenantmetadata.apps, function(value, key) {
                        /*if (value.showInDock) {
                            value.opacity = 0.4;
                            $rootScope.dockApplets.push(value);
                        }*/
                        value.tenantid = tenant;
                        //value.processor = value.pages[0].pageprocessor;
                        //value.datatemplate = value.pages[0].datatemplate;
                        //value.pageTemplate = value.pages[0].pageTemplate;
                        value.iconUrl = "https://studio.unifyed.com/metaData/appLogo/" + value.globalappletid;
                        value.url = "/app/" + value.appkey + "/" + value.appkey;
                        value.appletDisplayName = value.displayname;
                        value.categorykey = "";
                        value.author = "AppMaker";
                        value.target = "";
                        value.type = value.type;
                        value.orderVal = 0;
                        //alert(value.name);
                        if (value.showInHome) {
                            //var currentapp = _.find(value.pages, function (app) {
                            //    return app.pageid == value.name
                            //});
                            var appNames = _.find(value.pages, function(app) {
                                if (app.appnames) return app.appnames;
                            });
                            if (appNames && appNames.appnames) {
                                appGroups.push({
                                    "appFeatureType": value.appletDisplayName,
                                    "appFeatureTypeFormatted": value.appletDisplayName.replace(" ", "_"),
                                    "orderVal": 0,
                                    "iconUrl": value.iconUrl,
                                    "appNames": appNames.appnames.split(','),
                                    "expanded": false,
                                    "applets": []
                                });
                            } else {
                                $rootScope.otherApplets.push(value);
                            }
                        } else {
                            subApps.push(value);
                        }
                        value.pages = "";
                    });
                    console.log('$rootScope.tenantmetadata;', $rootScope.tenantmetadata);
                    angular.forEach(appGroups, function(value, key) {
                        angular.forEach(value.appNames, function(val1, key1) {
                            var myApp = _.find(subApps, function(app) {
                                return app.appletDisplayName == val1
                            });
                            if (myApp) {
                                value.applets.push(myApp);
                            }
                        });
                    });
                    $rootScope.appFeatureTypes = appGroups;
                }
            };
            var loadmetadata = function(tenantid, callback) {
                //MM: changed the metadata API endpoint for testing performance
                var url = '/studio/gettenantmetadata/' + tenantid;

                $http.get(url).then(function(response) {
                    if (!response.data) {
                        $http({ url: "/studio/updatestudiometadata/" + tenantid, method: "POST", data: {} }).then(function successCallback(resupdate) {
                            //alert(resupdate.data);
                            populatetenantdata(tenantid, resupdate.data.data.metadata);
                            if (callback) {
                                callback();
                            }
                        });
                    } else {
                        populatetenantdata(tenantid, response.data);
                        if (callback) {
                            console.log("loadmetadata execution completed time " + new Date());
                            callback();
                        }
                    }
                });
            };
            $rootScope.$on("launchsite", function(event, args) {
                alert("launchsite directive");
                $rootScope.selSite = args.site;
                $rootScope.site = args.site;
                //alert("Event triggered.. " + args.site);
                /*
                loadSite(function() {
                  loadmetadata($rootScope.site.tenantid, function() {
                      $("#customcsscms").html("");
                      $("#customcsscms").html($rootScope.site.customcss);
                      //alert($rootScope.selSite.customcss);
                      $rootScope.$broadcast('onAfterSiteFetched', {"site" : $rootScope.site});

                      if(args.pageid) {
                        $location.path("/" + $rootScope.site.sitebaseurl + "/" + args.pageid );
                      }else if(args.showfirstpage) {
                        $location.path("/" + $rootScope.site.sitebaseurl + "/"  + $rootScope.navmenu[0].pageid );
                      }
                  });
                });
                */
                async.parallel([
                    loadSite,
                    loadmetadata.bind(null, $rootScope.cmsapplication ? $rootScope.site.tenantid : $rootScope.user.tenant)
                ], function(err) {
                    $("#customcsscms").html("");
                    $("#customcsscms").html($rootScope.site.customcss);
                    console.log(JSON.stringify($rootScope.site));
                    $rootScope.$broadcast('onAfterSiteFetched', { "site": $rootScope.site });
                    if (args.pageid) {
                        $location.path("/" + $rootScope.site.sitebaseurl + "/" + args.pageid);
                    } else if (args.showfirstpage) {
                        $location.path("/" + $rootScope.site.sitebaseurl + "/" + $rootScope.navmenu[0].pageid);
                    } else {
                        //$rootScope.$broadcast('onAfterSiteFetched', {"site" : $rootScope.site});
                        $rootScope.$broadcast('onAfterSiteExecuted', { "site": $rootScope.site })
                    }
                });

            });
            $rootScope.studiomode = false;
            $rootScope.toggleStudio = function() {
                $rootScope.studiomode = !$rootScope.studiomode;
                !$rootScope.studiomode ? $rootScope.viewModeOn = false : '';
                console.log('$rootScope.viewModeOn', $rootScope.viewModeOn);
                if ($("body").hasClass("studiomode")) {
                    $("body").removeClass("studiomode");
                    $('.movingEdit').hide();
                    $rootScope.previewmode = true;
                    $(".toolbargroup").addClass("hide");
                    $('.hideStudioMenuPage').hide();
                    $('#contentscontainer').hide();
                    $('#controlpanelcontainer').hide();
                    $('#userAndGroup').hide();
                    $('#designpanelcontainer').hide();
                    $('#mycellSettingmodel').remove();
                    $('#myrowSettingmodel').remove();
                    $('#cmsrowaddcellsetting').remove();
                    $route.reload();
                } else {
                    $("body").addClass("studiomode");
                    $rootScope.previewmode = false;
                    FragmentLoaderService.loadFragments(['widgetSettings', 'addWidget', 'deleteWidget',
                        'aboutproject', 'pagePermissions'
                    ], function() {

                    });
                    $(".cmswidgetcontainer").removeClass("hide");
                }
                $rootScope.adjustMenuHeight();
                //$route.reload();
                $("#menu-block").getNiceScroll().remove();
                $("#menu-block").niceScroll({
                    cursorwidth: 4,
                    cursoropacitymin: 0.4,
                    cursorcolor: '#ffffff',
                    cursorborder: 'none',
                    cursorborderradius: 4,
                    autohidemode: 'leave',
                    horizrailenabled:false
                });
            }

            scope.openInstitutions = function() {
                $('#selectTenantModel').modal({ keyboard: false, backdrop: 'static' });
            }
            $(".submenucontainer").hide();
            /*alert("called");*/

            scope.loadSettings = function() {
                if ($("#jqtreejs").length == 0) {
                    $('<script id="jqtreejs" src="js/cmslib/tree.jquery.js"></script>').appendTo('head');
                }
                $rootScope.exitAppManager();
                //FragmentLoaderService.loadFragments(['menubuilder', 'controlpanel', 'sitesettings', 'landingPageConf' , 'newMenubuilder'], function() {
                //FragmentLoaderService.loadFragments(['controlpanel','sitesettings', 'landingPageConf' , 'updatedMenubuilder','newRolebaseRback'], function() {
                FragmentLoaderService.loadFragments(['controlpanel'], function() {
                    //$("#siteSettingsModel").modal("show");
                    //$(".hideStudioMenuPage ").hide();
                    $(".submenucontainer").hide();
                    $('#contentscontainer').hide();
                    $('#userAndGroup').hide();
                    $("#controlpanelcontainer").removeClass("hide");
                    $("#controlpanelcontainer").show();
                    $("#controlpanelcontainer").addClass("animated");
                    $("#controlpanelcontainer").addClass("pulse");
                });
                $(".cmssidebutton").removeClass("selected");
            }

            scope.loadIdentity = function() {
                $rootScope.exitAppManager();
                FragmentLoaderService.loadFragments(['identityManager'], function() {
                    //$("#siteSettingsModel").modal("show");
                    //$(".hideStudioMenuPage ").hide();

                    $(".submenucontainer").hide();
                    $("#identitymanagercontainer").removeClass("hide");
                    $("#identitymanagercontainer").show();
                    $("#identitymanagercontainer").addClass("animated");
                    $("#identitymanagercontainer").addClass("pulse");
                });
                $(".cmssidebutton").removeClass("selected");
            }



            scope.loadAppletPages = function() {
                $rootScope.exitAppManager();
                if ($("#jqtreejs").length == 0) {
                    $('<script id="jqtreejs" src="js/cmslib/tree.jquery.js"></script>').appendTo('head');
                }
                FragmentLoaderService.loadFragments(['sitespages', 'addPage',
                    'addExternalLink'
                ], function() {
                    $(".submenucontainer").hide();
                    $("#appletpagescontainer").removeClass("hide");
                    $('#contentscontainer').hide();
                    $('#userAndGroup').hide();
                    $("#appletpagescontainer").show();
                    $("#appletpagescontainer").addClass("animated");
                    $("#appletpagescontainer").addClass("pulse");
                    //MM:
                    $rootScope.loadAllImages();
                });
                $(".cmssidebutton").removeClass("selected");

            };
            scope.loadWidgets = function() {
                $rootScope.exitAppManager();
                if ($rootScope.pagedata.rows == undefined) {
                    $rootScope.pagedata.rows = [];
                }
                if ($rootScope.pagedata.rows.length == 0) {
                    $rootScope.pagedata.rows.push({ "cols": [{ "span": 12, "style": {}, "components": [] }] });
                }
                $rootScope.selcolforAdd = $rootScope.pagedata.rows[0].cols[0];
                $("#addWidgetsModal").modal("show");
            }
            scope.loadContent = function() {
                $rootScope.exitAppManager();
                FragmentLoaderService.loadFragments(['contentLibrary', 'manageImages'], function() {
                    $(".submenucontainer").hide();
                    $('#userAndGroup').hide();
                    $("#contentscontainer").removeClass("hide");
                    $("#contentscontainer").show();
                    $("#contentscontainer").addClass("animated");
                    $("#contentscontainer").addClass("pulse");
                });

            }
            scope.savePage = function() {
                scope.$emit("onSavePage", {});
            }
            scope.showmobileview = function() {

                $rootScope.exitAppManager();
                $("#previewframe").attr("src", window.location + "?q=" + new Date().getTime());
                $rootScope.iswebview = false;
                $rootScope.ismobileview = true;
                $("#devicesimulator").removeClass("tabletskin");
                $("#devicesimulator").addClass("mobileskin");
                $("#cmsdevicemobile").removeClass("cmstooliconblur");
                $("#cmsdevicedesktop").addClass("cmstooliconblur");
                $("#cmsdeviceipad").addClass("cmstooliconblur");

                //  $("#devicesimulator").removeClass("hide");
                $("body").addClass("simulatormode");
                $("body").addClass("simulatormode");
            }
            scope.showwebview = function() {
                $rootScope.exitAppManager();
                $rootScope.iswebview = true;
                $rootScope.ismobileview = false;
                $("body").removeClass("simulatormode");
                $("#cmsdevicedesktop").removeClass("cmstooliconblur");
                $("#cmsdeviceipad").addClass("cmstooliconblur");
                $("#cmsdevicemobile").addClass("cmstooliconblur");
            }
            scope.showtabletview = function() {
                $rootScope.exitAppManager();

                $("#previewframe").attr("src", window.location + "?q=" + new Date().getTime());
                $rootScope.iswebview = false;
                $rootScope.ismobileview = true;
                $("#devicesimulator").removeClass("mobileskin");

                $("#devicesimulator").addClass("tabletskin");
                $("#cmsdeviceipad").removeClass("cmstooliconblur");
                $("#cmsdevicedesktop").addClass("cmstooliconblur");
                $("#cmsdevicemobile").addClass("cmstooliconblur");
                $("body").addClass("simulatormode");
            }
        }
    };
}]).directive('cmswidget', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        scope: { image: '@image', title: '@title', comp: '=comp', info: '@info', type: '@type' },
        template: '<div class="cmswidget" >' +
            '<div class="clearfix">' +
            '<div class="widgetimgcontainer"  style="width:40px;float:left;margin: 5px 0px;padding: 5px;border-radius: 5px;"><img style="width:24px;height:24px;" ng-src="{{image}}"/></div>' +
            '<div style="width:110px;float:left;text-align: left;padding: 5px;" class="cmswidgettitle">{{title}}' +
            '<div style="font-size:10px;line-height:10px;color:#a1a1a1">{{info}}</div>' +
            '</div>' +
            '</div>' +
            '</div>',
        link: function(scope, element, attr) {
            console.log('cmswidget image', scope);
            var color = '#' + Math.floor(Math.random() * 16777215).toString(16);
            $(element).find(".widgetimgcontainer").css("background-color", color);
            element.on("click", function(event) {
                //alert(scope.title);
                $(".cmswidget").removeClass("selected");
                $(element).find(".cmswidget").addClass("selected");
                $rootScope.selWidgetType = scope.type;
                $rootScope.selWidgetForAdd = scope.comp;

                // $(".cmssidebutton").removeClass("selected");
                //$(element.children()[0]).addClass("selected");
                //angular.element()

            });

        }
    };
}]).directive('cmsrow', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'A',
        transclude: true,
        scope: { row: '=row' },
        template: '<div class="cmsrow" ng-style="row.style" style="background-size:cover;">' +
            '<div ng-transclude></div>' +
            '</div>',
        link: function(scope, element, attr) {
            element.on("click", function(event) {
                //alert("clicked Row");
                // $(".cmssidebutton").removeClass("selected");
                //$(element.children()[0]).addClass("selected");
                //angular.element()
            });

        }
    };
}]).directive('cmscell', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'A',
        replace: true,
        transclude: true,
        scope: { row: '=row', col: '=col', colindex: '=colindex', rows: '=rows', rowindex: '=rowindex' },
        template: '<div class="cmscell" ng-style="col.style" style="background-size:cover;">' +
            '<div class="clearfix hide toolbargroup">' +
            '<cmsrowtoolbar rowindex="rowindex" row="row" col="col" colindex="colindex" rows="rows" class="pull-left"></cmsrowtoolbar>' +
            '<cmscolumntoolbar rowindex="rowindex" row="row" col="col" colindex="colindex" rows="rows" indentifyerValue="indentifyerValue" class="pull-left"></cmscolumntoolbar>' +
            '</div>' +
            '<div ng-transclude ></div>' +
            '<div class="btn btn-primary cmswidbtn hide"  ng-click="showAddWidget();">+</div>' +
            '</div>',
        link: function(scope, element, attr) {
            //$(element).css("background-color",scope.col.color);
            scope.showAddWidget = function() {
                $rootScope.selcolforAdd = scope.col;
                $rootScope.rowindex = scope.rowindex;
                $rootScope.colindex = scope.colindex;
                $("#addWidgetsModal").modal("show");
            }
            element.on('mouseover', function(event) {
                if ($rootScope.previewmode == true) {
                    return;
                }
                //$(element).find(".toolbargroup").removeClass("hide");
                //$(element.children()[0]).children()[0].removeClass("hide");
                $(".toolbargroup").addClass("hide");
                $(element).find(".toolbargroup").removeClass("hide");
                $(element).addClass("activecell");
                $(element).find(".cmswidbtn").removeClass("hide");
            });
            element.on('mouseout', function(event) {
                if ($rootScope.previewmode == true) {
                    return;
                }
                //$(element.children()[0]).children()[0].addClass("hide");
                //$(element).find(".toolbargroup").addClass("hide");
                //$(element).find(".toolbargroup").addClass("hide");
                $(element).removeClass("activecell");
                $(element).find(".cmswidbtn").addClass("hide");
            });
            element.on("click", function(event) {
                $(".layout-cell").removeClass("activecell");
                $(".cmswidbtn").addClass("hide");
                //$(element).addClass("activecell");
                // $(".cmssidebutton").removeClass("selected");
                $(element.children()[0]).children().last().removeClass("hide");
                //angular.element()
                //alert(scope.row);
                //scope.$emit("onCmsCellClick", { row : scope.row});
            });
            if ($(window).width() <= 768) {

            } else {
                $('#themeCarosel').owlCarousel('destroy');
            }
        }
    };
}]).directive('cmsrowtoolbar', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        scope: { row: '=row', col: "=col", rows: "=rows", rowindex: '=rowindex', colindex: '=colindex', index: '=index' },
        template: '<div class="cmsrowtoolbarcontainer" row="row" >' +
            '<span class="pull-left cmsrowtoolbarmoveicon positionRelative">' +
            '<i class="fa fa-arrow-up positionAbsolute iconFixedTop" ng-click="moveRowUp()" title="Move Up"></i>' +
            '<i class="fa fa-arrow-down positionAbsolute iconFixedBottom" ng-click="moveRowDown()" title="Move Down"></i>' +
            '</span>' + //fa-arrows
            'Row' +
            '<span class="fa fa-times cmsrowtoolbararrowicon pull-right" ng-click="deleteRow()" ></span>' +
            '<span class="fa fa fa-pencil cmsrowtoolbararrowicon pull-right" ng-click="editRow()" ></span>' +
            '<span class="fa fa fa-plus cmsrowtoolbararrowicon pull-right" ng-click="addRow()" ></span>' +
            '<span class="fa fa-bars cmsrowtoolbararrowicon pull-right" ng-click="addcmscell()" ></span>' +
            '</div>',
        link: function(scope, element, attr) {
            scope.popup = {}
            scope.popup['addCmsCellPopupOpen'] = false;
            scope.popup['editCmsCellPopupOpen'] = false;
            /*element.on("click", function(event) {
                $(".layout-cell").removeClass("activecell");
                $(".cmswidbtn").addClass("hide");
                $(element).addClass("activecell");
               // $(".cmssidebutton").removeClass("selected");
                $(element.children()[0]).children().last().removeClass("hide");
                //angular.element()
                alert(scope.row);
                scope.$emit("onCmsCellClick", { row : scope.row});
            });*/
            scope.addRow = function() {
                $rootScope.pagedata.rows.push({ cols: [{ span: 12, style: {}, components: [] }], style: {}, identifier: "12" });
            }
            scope.addcmscell = function() {
                if (!scope.popup.addCmsCellPopupOpen) {
                    var dynahtml = '<cmsaddcell row="row" col="col" colindex="colindex" rows="rows" rowindex="rowindex" popup="popup" ></cmsaddcell>';
                    var data1 = $compile(dynahtml)(scope);
                    $("body").append(data1);
                    scope.popup.addCmsCellPopupOpen = true;
                }
            }
            scope.editRow = function() {
                if (!scope.popup['editCmsCellPopupOpen']) {
                    //$rootScope.row = scope.row;
                    $("#cellbgdisp").css('backgroundColor', 'transparent');
                    $("#cellfgdisp").css('backgroundColor', 'transparent');
                    if (scope.row && scope.row.style && scope.row.style['background-color'])
                        $("#cellbgdisp").css('backgroundColor', scope.row.style['background-color']);
                    if (scope.row && scope.row.style && scope.row.style['color'])
                        $("#cellfgdisp").css('backgroundColor', scope.row.style['color']);
                    $('#columnDesignModel').modal('show');
                    var dynahtml = "<cmsrowsettings popup='popup' row='row'></cmsrowsettings>";
                    var data1 = $compile(dynahtml)(scope);
                    $("body").append(data1);
                    scope.popup['editCmsCellPopupOpen'] = true;
                    //scope.$emit("onSavePage", {});
                }
            }
            scope.deleteRow = function() {
                if (scope.rows.length == 1) {
                    alert('Cannot delete last row in the webpage');
                } else {
                    scope.rows.splice(scope.rowindex, 1);
                    //scope.$emit("onSavePage", {});
                }
            }
            scope.moveRowUp = function() {
                if (0 < scope.rowindex) {
                    var tmp = scope.rows[scope.rowindex];
                    scope.rows[scope.rowindex] = scope.rows[scope.rowindex - 1];
                    scope.rows[scope.rowindex - 1] = tmp;
                    delete tmp;
                }
            }
            scope.moveRowDown = function() {
                if ((scope.rows.length - 1) > scope.rowindex) {
                    var tmp = scope.rows[scope.rowindex];
                    scope.rows[scope.rowindex] = scope.rows[scope.rowindex + 1];
                    scope.rows[scope.rowindex + 1] = tmp;
                    delete tmp;
                }
            }
        }
    };
}]).directive('cmscolumntoolbar', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        scope: { row: '=row', col: '=col', colindex: '=colindex', rowindex: '=rowindex', rows: '=rows' }, //, addCollFlag:'=addCollFlag'
        template: '<div class="cmscolumntoolbarcontainer" >' +
            '<span class="pull-left cmsrowtoolbarmoveicon positionRelative">' +
            '<i class="fa fa-arrow-left positionAbsolute iconFixedLeft" ng-click="moveColumLeft()" title="Move Left"></i>' +
            '<i class="fa fa-arrow-right positionAbsolute iconFixedRight" ng-click="moveColumRight()" title="Move Right"></i>' +
            '</span>' + //fa-arrows-alt-v
            'Column' +
            '<span ng-click="deleteColumn();" class="fa fa-times cmsrowtoolbararrowicon pull-right" ></span>' +
            '<span ng-click="editColumn();" class="fa fa-pencil cmsrowtoolbararrowicon pull-right" ></span>' +
            '<span ng-click="addColumn();" ng-if="indentifyerValue"  class="fa fa-plus cmsrowtoolbararrowicon pull-right" ></span>' + //ng-if=addCollFlag
            '</div>',
        link: function(scope, element, attr) {
            //show add button in toolbar
            scope.indentifyerValue = false;
            scope.resetAddCollFlag = function() {
                scope.$watch(function() {
                    if (scope.row.identifier == '12') {
                        scope.indentifyerValue = scope.row.cols.length < 1;
                        console.log(scope.indentifyerValue)
                    } else if (scope.row.identifier == '84' || scope.row.identifier == '48' || scope.row.identifier == '66') {
                        scope.indentifyerValue = scope.row.cols.length < 2;
                        console.log(scope.indentifyerValue)
                    } else if (scope.row.identifier == '444') {
                        scope.indentifyerValue = scope.row.cols.length < 3;
                        console.log(scope.indentifyerValue)
                    }
                })
            }
            scope.resetAddCollFlag();
            scope.deleteColumn = function() {
                if (scope.rows.length == 1 && scope.rows[0].cols.length == 1) {
                    alert('Cannot delete last column in the webpage');
                } else {
                    if (!scope.row.identifier) {
                        scope.row.identifier = scope.row.cols.map(function(col) { return col.span }).join('')
                    }
                    scope.row.cols.splice(scope.colindex, 1);
                    if (!scope.row.cols.length) scope.rows.splice(scope.rowindex, 1);
                }
                scope.resetAddCollFlag();
            }
            scope.addColumn = function() {
                if (!scope.row.identifier) {
                    scope.row.identifier = scope.row.cols.map(function(col) { return col.span }).join('')
                }
                switch (scope.row.identifier) {
                    case '444':
                        if (scope.row.cols.length < 3) scope.row.cols.push({ span: '4', components: [], style: {} })
                        break;
                    case '66':
                        if (scope.row.cols.length < 2) scope.row.cols.push({ span: '6', components: [], style: {} })
                        break;
                    case '84':
                    case '48':
                        if (scope.row.cols.length < 2) {
                            scope.row.cols.push({ span: ((scope.row.cols[0].span == '8') ? '4' : '8'), components: [], style: {} })
                            scope.row.identifier = scope.row.cols[0].span + '' + scope.row.cols[1].span
                        }
                        break;
                }
                scope.resetAddCollFlag();
            }
            scope.editColumn = function() {
                //$rootScope.col = scope.col;
                $("#cellbgdisp").css('backgroundColor', 'transparent');
                $("#cellfgdisp").css('backgroundColor', 'transparent');
                if (scope.col && scope.col.style && scope.col.style['background-color'])
                    $("#cellbgdisp").css('backgroundColor', scope.col.style['background-color']);
                if (scope.col && scope.col.style && scope.col.style['color'])
                    $("#cellfgdisp").css('backgroundColor', scope.col.style['color']);
                $('#columnDesignModel').modal('show');
                var dynahtml = '<cmscellsettings rowindex="rowindex" row="row" col="col" colindex="colindex" rows="rows" ></cmscellsettings>';
                var data1 = $compile(dynahtml)(scope);
                $("body").append(data1);
            }
            scope.moveColumLeft = function() {
                if (scope.colindex > 0) {
                    var tmp = scope.row.cols[scope.colindex];
                    scope.row.cols[scope.colindex] = scope.row.cols[scope.colindex - 1];
                    scope.row.cols[scope.colindex - 1] = tmp;
                    delete tmp;
                }
            }
            scope.moveColumRight = function() {
                    if (scope.colindex < (scope.row.cols.length - 1)) {
                        var tmp = scope.row.cols[scope.colindex];
                        scope.row.cols[scope.colindex] = scope.row.cols[scope.colindex + 1];
                        scope.row.cols[scope.colindex + 1] = tmp;
                        delete tmp;
                    }
                }
                /*element.on("click", function(event) {
                    $(".layout-cell").removeClass("activecell");
                    $(".cmswidbtn").addClass("hide");
                    $(element).addClass("activecell");
                   // $(".cmssidebutton").removeClass("selected");
                    $(element.children()[0]).children().last().removeClass("hide");
                    //angular.element()
                    alert(scope.row);
                    scope.$emit("onCmsCellClick", { row : scope.row});
                });*/
        }
    };
}]).directive('cmscellwidget', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'A',
        transclude: true,
        scope: { row: '@row', comp: '=comp', col: '=col', rowindex: '=rowindex', colindex: '=colindex', index: '=index' },
        template: '<div class="cmswidgetcontainer hide" data-title="{{comp.widget ? comp.widget.title  : comp.applet.displayname}}" >' +
            '<cmswidgettoolbar index="index" col="col" rowindex="rowindex" colindex="colindex" comp="comp" title="{{comp.widget ? comp.widget.title  : comp.applet.displayname}}" class="cmswidgettoolbar hide"></cmswidgettoolbar>' +
            '<div ng-transclude></div>' +
            '</div>',
        link: function(scope, element, attr) {
            if (scope.comp.widget) {
                $(element).find(".cmswidgetcontainer").attr("id", "wid-" + scope.comp.widgetid);
            } else if (scope.comp.applet) {
                $(element).find(".cmswidgetcontainer").attr("id", "applet-" + scope.comp.applet._id);
            }
            if(scope.comp.permissions && scope.comp.permissions.length > 0 && $rootScope.studiomode == false) {
                var found = false;
                if($rootScope.user && $rootScope.user.role) {
                    for(var i=0;i<scope.comp.permissions.length; i++) {
                        if($rootScope.user.role.indexOf(scope.comp.permissions[i]) != -1) {
                            found = true;
                        }
                    }
                }
                if(found) {
                    $(element).find(".cmswidgetcontainer").removeClass("hide");
                }else {
                    $(element).find(".cmswidgetcontainer").addClass("hide");
                }
            }else {
                $(element).find(".cmswidgetcontainer").removeClass("hide");
            }
            element.on('mouseover', function(event) {
                if ($rootScope.previewmode == true) {
                    return;
                }
                /*var test = document.getElementById("textwidth");
                if(!test) {
                    $("body").append("<div id='textwidth'></div>");
                }*/
                var test = document.getElementById("textwidth");
                if (scope.comp.widget) {
                    $("#textwidth").html(scope.comp.widget.title);
                } else {
                    //MM:console.log(JSON.stringify(scope.comp.applet.displayname));
                    $("#textwidth").html(scope.comp.applet.displayname);
                }

                test.style.fontSize = 12;
                //alert(test.clientWidth);
                //var height = (test.clientHeight + 1) + "px";
                var width = (test.clientWidth + 150) + "px";
                $(element).find(".cmswidgettoolbarcontainer").css("width", width);
                //MM:console.log(width);
                //$(element).find(".toolbargroup").removeClass("hide");
                //$(element.children()[0]).children()[0].removeClass("hide");
                //$(element).addClass("activecell");
                $(element).find(".cmswidgettoolbar").removeClass("hide");
                //var top = ($(element).parent().height() / 2)- 10;
                $(element).find(".cmswidgettoolbarcontainer").css("top", 10 + "px");
                //$(element).find(".cmswidgettoolbarcontainer").css("top", "20px");
                var left = ($(element).parent().width() / 2) - ($(element).find(".cmswidgettoolbarcontainer").width() / 2);
                $(element).find(".cmswidgettoolbarcontainer").css("left", left + "px");
                //$(element).find(".cmswidgettoolbarcontainer").css("left", "20px");
            });
            element.on('mouseout', function(event) {
                if ($rootScope.previewmode == true) {
                    return;
                }
                //$(element.children()[0]).children()[0].addClass("hide");
                //$(element).find(".toolbargroup").addClass("hide");
                //$(element).removeClass("activecell");
                $(element).find(".cmswidgettoolbar").addClass("hide");
            });
            /*element.on("mousemove", function(e) {
                console.log("X : " + e.clientX);
                console.log("Y : " + e.clientY);
                var top = e.clientY;
                var left = e.clientX;
                var x = e.pageX - this.offsetLeft;
                var y = e.pageY - this.offsetTop;
                $(element).find(".cmswidgettoolbarcontainer").css("top", top + "px");
                $(element).find(".cmswidgettoolbarcontainer").css("left", left + "px");
            });*/
            /*$(element).mousemove(function(e){
                console.log(e);
                var x = e.clientX - this.offsetLeft;
                var y = e.clientY - this.offsetTop;
                var offset = $(element).offset();
                var top = y - offset.top;
                var left = x - offset.left;
                var toolbarwidth = $(element).find(".cmswidgettoolbarcontainer").width();
                var toolbarheight = $(element).find(".cmswidgettoolbarcontainer").height();
                $(element).find(".cmswidgettoolbarcontainer").css("top", top - (toolbarheight / 2) + "px");
                $(element).find(".cmswidgettoolbarcontainer").css("left", left -(toolbarwidth / 2) + "px");
            });*/
            /*element.on("click", function(e) {
                console.log(e);
                var x = e.pageX - this.offsetLeft;
                var y = e.pageY - this.offsetTop;
                var offset = $(element).offset();
                var top = y - offset.top;
                var left = x - offset.left;
                var toolbarwidth = $(element).find(".cmswidgettoolbarcontainer").width();
                var toolbarheight = $(element).find(".cmswidgettoolbarcontainer").height();
                $(element).find(".cmswidgettoolbarcontainer").css("top", top  + "px");
                $(element).find(".cmswidgettoolbarcontainer").css("left", left -(toolbarwidth / 2) + "px");
            });*/

        }
    };
}]).directive('cmswidgettoolbar', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        scope: { title: '@title', comp: '=comp', col: '=col', rowindex: '=rowindex', colindex: '=colindex', index: '=index' },
        template: '<div class="cmswidgettoolbarcontainer"  >' +
            '<!--span title="Move" data-jqyoui-options="{revert: \'invalid\', helper: \'clone\'}"  data-drag="true" jqyoui-draggable="{animate: true, onStart:\'startDrag(comp, rowindex, colindex, index)\'}"  data-drag="true" title="{{comp.title}}"class="fa fa-arrows pull-left cmsrowtoolbardragicon"></span-->' +
            '{{title}}' +
            '<span title="Delete" ng-click="deleteWidget();" class="widgettoolbarbtn fa fa-times pull-right cmsrowtoolbararrowicon" ></span>' +
            /*'<span title="Share" class="widgettoolbarbtn fa fa-share-square-o pull-right cmsrowtoolbararrowicon"></span>' +*/
            '<span title="Duplicate" ng-click="duplicateWidget();" class="widgettoolbarbtn fa fa-copy pull-right cmsrowtoolbararrowicon"></span>' +
            '<span title="Edit" ng-hide={{comp.applet}} ng-click="editWidget();" class="widgettoolbarbtn fa fa-pencil pull-right cmsrowtoolbararrowicon" ></span>' +
            '</div>',
        link: function(scope, element, attr) {
            //$(element).draggable();
            scope.startDrag = function(event, ui, title, rowindex, colindex, index) {
                //MM:console.log(JSON.stringify(title) + " ------ " + rowindex + " ---  " + colindex + " -- " + index);
                $rootScope.curdrag = scope.comp.widget ? scope.comp.widget : scope.comp.applet; //title.widget;
                $rootScope.curdragwidgetid = scope.comp.widgetid;
                $rootScope.ismove = true;
                $rootScope.movelocation = (rowindex - 1) + ":" + colindex + ":" + index;
                $rootScope.col = scope.col;
                $rootScope.curindex = scope.index;
                //$("#widgetContainer").css("opacity","0.5");
            };
            scope.duplicateWidget = function() {
                var comp = { widget: angular.copy(scope.comp.widget) }
                $http.post('/sites/addwidget/' + $rootScope.site.tenantid + '/' + $rootScope.site._id, comp.widget).then(function(response) {
                    //$rootScope.widgetcategory = response.data;
                    comp.widgetid = response.data._id;
                    scope.col.components.push(comp);
                    if ($rootScope.pagedata.widgets == undefined) {
                        $rootScope.pagedata.widgets = [];
                    }
                    $rootScope.pagedata.widgets.push(comp.widgetid)
                        //$rootScope.$emit("onSavePage");
                });
            }
            scope.editWidget = function() {
                // alert("delete widget called " + scope.comp.widget.name);
                // scope.col.remove(scope.comp);


                $rootScope.$emit("onCmsWidgetEdit", { comp: scope.comp, col: scope.col, index: scope.index });
            }
            scope.deleteWidget = function() {
                // alert("delete widget called " + scope.comp.widget.name);
                // scope.col.remove(scope.comp);
                $rootScope.$emit("onCmsWidgetDelete", { comp: scope.comp, col: scope.col, index: scope.index });
            }
            $(element).mousemove(function(e) {
                return false;
            });
            /*element.on("click", function(event) {
                $(".layout-cell").removeClass("activecell");
                $(".cmswidbtn").addClass("hide");
                $(element).addClass("activecell");
               // $(".cmssidebutton").removeClass("selected");
                $(element.children()[0]).children().last().removeClass("hide");
                //angular.element()
                alert(scope.row);
                scope.$emit("onCmsCellClick", { row : scope.row});
            });
*/
        }
    };
}]).directive('cmscellsettings', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        template: '<div id="mycellSettingmodel" class="cellsetting cmsSetting ">' +
            '<div  class="mheader">Column Setting</div>' +
            '<div  class="mbody">' +
            '<ul class="nav nav-tabs" role="tablist">' +
            '<li role="presentation" class="active">' +
            '<a data-target="#cellSettingGernal" role="tab" data-toggle="tab">General</a>' +
            '</li>' +
            '<li role="presentation">' +
            '<a data-target="#cellSettingGDesign" role="tab" data-toggle="tab">Design Option</a>' +
            '</li>' +
            '</ul>' +
            '<div class="tab-content">' +
            '<div role="tabpanel" class="tab-pane modalCustomSCroll active" id="cellSettingGernal">' +
            '<div class="row">' +
            '<div class="col-xs-6 col-sm-5 col-md-5">' +
            '<div class="form-group" style="height:190px">' +
            '<label>Select Background Color</label>' +
            //'<div class="maincolorbackground color-picker-box"><div class="color-inner-div"></div>Select Color</div>'+
            '<cmscolorpickersetting value="col.style[\'background-color\']" class="cmscolorset"></cmscolorpickersetting>' +
            '<div  class="clearfix"></div>' +
            '</div>' +
            '</div>' +
            '<div class="col-xs-6 col-sm-5 col-md-7">' +
            '<div class="form-group positionRelative" style="height:190px">' +
            '<label>Select Background Image</label>' +
            '<cmsuploadimagepicker  label="Select Image"  cssurl="true" class="positionRelative cmsuploadPicker" value="col.style[\'background-image\']"></cmsuploadimagepicker>' +
            '<div  class="clearfix"></div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            /*'<div class="form-group">'+
                '<label>Column Height</label>'+
                '<input class="form-control" ng-model="col.style[\'height\']" id="colheight">'+
                '<div  class="clearfix"></div>'+
            '</div>'+*/
            '</div>' +
            '<div role="tabpanel" class="tab-pane modalCustomSCroll" id="cellSettingGDesign">' +
            '<div style="width:60%; float:left" id="setGapBox">' +
            '<div class="marginBox  positionRelative">' +
            '<div class="positionAbsolute settingTitle">Margin</div>' +
            '<input ng-model="col.style[\'margin-left\']" ng-blur="checkpx($event)"  data-key="margin-left"  placeholder="px" class=" text-center leftinput positionAbsolute    settinginput" id="leftmargin">' +
            '<input ng-model="col.style[\'margin-right\']" ng-blur="checkpx($event)" data-key="margin-right" placeholder="px" class="text-center rightinput positionAbsolute   settinginput" id="rightmargin">' +
            '<input ng-model="col.style[\'margin-top\']" ng-blur="checkpx($event)"  data-key="margin-top" placeholder="px" class="text-center topinput positionAbsolute   settinginput" id="topmargin">' +
            '<input ng-model="col.style[\'margin-bottom\']" ng-blur="checkpx($event)" data-key="margin-bottom" placeholder="px" class="text-center bottominput positionAbsolute   settinginput" id="bottommargin">' +
            '<div class="borderBox positionRelative">' +
            '<div class="positionAbsolute settingTitle">Border</div>' +
            '<input ng-model="col.style[\'border-left-width\']" ng-blur="checkpx($event)" data-key="border-left-width" placeholder="px" class="text-center leftinput positionAbsolute   settinginput" id="leftborder">' +
            '<input ng-model="col.style[\'border-right-width\']" ng-blur="checkpx($event)" data-key="border-right-width"  placeholder="px"class="text-center rightinput positionAbsolute   settinginput" id="rightborder">' +
            '<input ng-model="col.style[\'border-top-width\']" ng-blur="checkpx($event)" data-key="border-top-width" placeholder="px"class="text-center topinput positionAbsolute   settinginput" id="topborder">' +
            '<input ng-model="col.style[\'border-bottom-width\']" ng-blur="checkpx($event)" data-key="border-bottom-width" placeholder="px" class="text-center bottominput positionAbsolute   settinginput" id="bottomborder">' +
            '<div class="paddingBox positionRelative">' +
            '<div class="positionAbsolute settingTitle">Padding</div>' +
            '<input ng-model="col.style[\'padding-left\']" ng-blur="checkpx($event)" data-key="padding-left" placeholder="px" class="text-center leftinput positionAbsolute   settinginput" id="leftpadding">' +
            '<input ng-model="col.style[\'padding-right\']" ng-blur="checkpx($event)" data-key="padding-right" placeholder="px"class="text-center rightinput positionAbsolute   settinginput" id="rightpadding">' +
            '<input ng-model="col.style[\'padding-top\']" ng-blur="checkpx($event)" data-key="padding-top" placeholder="px" class="text-center topinput positionAbsolute   settinginput" id="toppadding">' +
            '<input ng-model="col.style[\'padding-bottom\']" ng-blur="checkpx($event)" data-key="padding-bottom" placeholder="px" class="text-center bottominput positionAbsolute settinginput" id="bottompadding">' +
            '<div class="blankBox positionRelative">' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div style="width:37%; float:left" class="settingLeftpanel">' +
            '<div class="form-group">' +
            '<label>Border Color</label>' +
            '<cmscolorpickersetting value="col.style[\'border-color\']" ></cmscolorpickersetting>' +
            //'<div class="colorBorder color-picker-box"><div class="color-inner-div"></div>Select Color</div>'+
            '<div class="clearfix"></div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label>Border style</label>' +
            '<input ng-model="col.style[\'border-style\']" type="text" class="form-control" style="display:none" />' +
            '<div class="dropdown dropdownMenuSelect border1px borderRadius4px">' +
            '<button class="btn dropdown-toggle" type="button" data-toggle="dropdown">' +
            '<span ng-if="!col.style[\'border-style\']">Select Type</span>' +
            '<span style="text-transform: capitalize;" ng-if="col.style[\'border-style\']">{{col.style[\'border-style\']}}</span>' +
            '<span class="fa fa-angle-down pull-right"></span>' +
            '</button>' +
            '<ul class="dropdown-menu">' +
            '<li  ng-click="selectStyle(\'none\')">' +
            '<a class="displayBlock">None</a>' +
            '</li>' +
            '<li  ng-click="selectStyle(\'dotted\')">' +
            '<a class="displayBlock">Dotted</a>' +
            '</li>' +
            '<li  ng-click="selectStyle(\'solid\')">' +
            '<a class="displayBlock">Solid</a>' +
            '</li>' +
            '<li  ng-click="selectStyle(\'double\')">' +
            '<a class="displayBlock">Double</a>' +
            '</li>' +
            '<li  ng-click="selectStyle(\'dashed\')">' +
            '<a class="displayBlock">Dashed</a>' +
            '</li>' +
            '</ul>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label>Border Radius</label>' +
            '<input ng-model="col.style[\'border-radius\']" ng-blur="checkBorderpx($event)" data-key="border-radius"  placeholder="Type Number" type="text" class="form-control" />' +
            '</div>' +
            '<div class="form-group">' +
            '<label>Text Color</label>' +
            '<cmscolorpickersetting value="col.style[\'color\']" ></cmscolorpickersetting>' +
            '</div>' +
            '</div>' +
            '<div  class="clearfix"></div>' +
            '</div>' +
            '</div>' +
            '<div  class="mfooter">' +
            '<button class="btn btn-default" ng-click="cancelCellSetting();" style="margin-right:10px">Close</button>' +
            '</div>' +
            '</div>',
        scope: { row: '=row', col: '=col', colindex: '=colindex', rows: '=rows', rowindex: '=rowindex' },
        link: function(scope, element, attr) {
            console.log('cmscellsettings-----', scope)
                //if(!$rootScope.col.style) $rootScope.col.style = {};
            if (!scope.col.style) scope.col.style = {};
            /*scope.saveCellSetting = function() {
                //scope.$emit("onSavePage", { });
                $('#mycellSettingmodel').remove();
            }*/
            /*scope.editColumn = function() {
                var dynahtml = "<cmscellsettings></cmscellsettings>";
                var data1 = $compile(dynahtml)(scope);
                $("body").append(data1);
            }*/
            $(element).draggable({
                handle: ".mheader"
            });
            $(element).css({
                "left": "40%",
                "top": "160px",
                "z-index": "99",
                "position": "fixed"
            });
            scope.cancelCellSetting = function() {
                $('#mycellSettingmodel').remove();
            };
            scope.checkpx = function(event) {
                var keyName = angular.element($(event.target)).data('key');
                var strt = angular.element($(event.target)).val();
                if ($(event.target).val() !== "") {
                    var str = parseInt($(event.target).val());
                    var checkVal = str + ($(event.target).val().match(/px|%|em/) || 'px');
                    scope.col.style[keyName] = checkVal;
                    if (keyName == "border-left-width" || keyName == "border-right-width" || keyName == "border-top-width" || keyName == "border-bottom-width") {
                        var str = parseInt(("" + ($(event.target).val())).replace(/\D/g, '')) || 0;
                        str = "" + str;
                        if (str.indexOf("px") == -1) {
                            scope.col.style[keyName] = str + "px"
                        }
                    }
                }
            }
            scope.checkBorderpx = function(event) {
                    var keyName = angular.element($(event.target)).data('key');
                    var strt = angular.element($(event.target)).val();
                    if ($(event.target).val() !== "") {
                        var str = parseInt(("" + ($(event.target).val())).replace(/\D/g, '')) || 0;
                        str = "" + str;
                        var keyName = $(event.target).attr('data-key');
                        if (str.indexOf("px") == -1) {
                            scope.col.style[keyName] = str + "px"
                        }
                    }
                }
                // element.on('focusout','#setGapBox input' , function(){
                //     if($(this).val() !== ""){
                //         var str = $(this).val();
                //         var custRex = str+"em|%|px";
                //         if(!str.match(custRex)){
                //         alert('Pease add px, % OR em after number' );
                //         return false;
                //         }
                //     }
                // });
            scope.selectStyle = function(borderType) {
                scope.col.style['border-style'] = borderType;
            }
            element.on('keypress', '.settinginput', function() {
                $(this).val().replace(/ /g, "");
            });
        }
    };
}]).directive('cmsrowsettings', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        template: '<div id="myrowSettingmodel" class="cellsetting cmsSetting ">' +
            '<div  class="mheader">Row Setting</div>' +
            '<div  class="mbody">' +
            '<ul class="nav nav-tabs" role="tablist">' +
            '<li role="presentation" class="active">' +
            '<a data-target="#cellSettingGernal" role="tab" data-toggle="tab">General</a>' +
            '</li>' +
            '<li role="presentation">' +
            '<a data-target="#cellSettingGDesign" role="tab" data-toggle="tab">Design Option</a>' +
            '</li>' +
            '</ul>' +
            '<div class="tab-content">' +
            '<div role="tabpanel" class="tab-pane modalCustomSCroll active" id="cellSettingGernal">' +
            '<div class="row">' +
            '<div class="col-xs-6 col-sm-6 col-md-5">' +
            '<div class="form-group" style="height:190px">' +
            '<label>Select Background Color</label>' +
            '<cmscolorpickersetting value="row.style[\'background-color\']" ></cmscolorpickersetting>' +
            //'<div class="maincolorbackground color-picker-box"><div class="color-inner-div"></div>Select Color</div>'+
            '<div  class="clearfix"></div>' +
            '</div>' +
            '</div>' +
            '<div class="col-xs-6 col-sm-6 col-md-7">' +
            '<div class="form-group positionRelative" style="height:190px">' +
            '<label>Select Background Image</label>' +
            '<cmsuploadimagepicker class="positionRelative cmsuploadPicker"   label="Select Image" cssurl="true" value="row.style[\'background-image\']"></cmsuploadimagepicker>' +
            '<div  class="clearfix"></div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            /*'<div class="form-group">'+
                '<label>Column Height</label>'+
                '<input class="form-control" ng-model="row.style[\'height\']" id="colheight">'+
                '<div  class="clearfix"></div>'+
            '</div>'+*/
            /*'<div class="form-group">'+
                '<label>Select Background Image</label>'+
                '<input type="file" class="form-control"/>'+
                '<div  class="clearfix"></div>'+
            '</div>'+*/
            '</div>' +
            '<div role="tabpanel" class="tab-pane modalCustomSCroll" id="cellSettingGDesign">' +
            '<div style="width:60%; float:left" id="setGapBox">' +
            '<div class="marginBox  positionRelative">' +
            '<div class="positionAbsolute settingTitle">Margin</div>' +
            '<input ng-model="row.style[\'margin-left\']" ng-blur="checkpx($event)"  data-key="margin-left"  placeholder="px" class=" text-center leftinput positionAbsolute    settinginput" id="leftmargin">' +
            '<input ng-model="row.style[\'margin-right\']" ng-blur="checkpx($event)" data-key="margin-right" placeholder="px" class="text-center rightinput positionAbsolute   settinginput" id="rightmargin">' +
            '<input ng-model="row.style[\'margin-top\']" ng-blur="checkpx($event)"  data-key="margin-top" placeholder="px"class="text-center topinput positionAbsolute   settinginput" id="topmargin">' +
            '<input ng-model="row.style[\'margin-bottom\']" ng-blur="checkpx($event)" data-key="margin-bototm" placeholder="px" class="text-center bottominput positionAbsolute   settinginput" id="bottommargin">' +
            '<div class="borderBox positionRelative">' +
            '<div class="positionAbsolute settingTitle">Border</div>' +
            '<input ng-model="row.style[\'border-left-width\']" ng-blur="checkpx($event)" data-key="border-left-width" placeholder="px" class="text-center leftinput positionAbsolute   settinginput" id="leftborder">' +
            '<input ng-model="row.style[\'border-right-width\']" ng-blur="checkpx($event)" data-key="border-right-width"  placeholder="px"class="text-center rightinput positionAbsolute   settinginput" id="rightborder">' +
            '<input ng-model="row.style[\'border-top-width\']" ng-blur="checkpx($event)" data-key="border-top-width" placeholder="px"class="text-center topinput positionAbsolute   settinginput" id="topborder">' +
            '<input ng-model="row.style[\'border-bottom-width\']" ng-blur="checkpx($event)" data-key="border-bottom-width" placeholder="px" class="text-center bottominput positionAbsolute   settinginput" id="bottomborder">' +
            '<div class="paddingBox positionRelative">' +
            '<div class="positionAbsolute settingTitle">Padding</div>' +
            '<input ng-model="row.style[\'padding-left\']" ng-blur="checkpx($event)" data-key="padding-left" placeholder="px" class="text-center leftinput positionAbsolute   settinginput" id="leftpadding">' +
            '<input ng-model="row.style[\'padding-right\']" ng-blur="checkpx($event)" data-key="padding-right" placeholder="px"class="text-center rightinput positionAbsolute   settinginput" id="rightpadding">' +
            '<input ng-model="row.style[\'padding-top\']" ng-blur="checkpx($event)" data-key="padding-top" placeholder="px" class="text-center topinput positionAbsolute   settinginput" id="toppadding">' +
            '<input ng-model="row.style[\'padding-bottom\']" ng-blur="checkpx($event)" data-key="padding-bottom" placeholder="px" class="text-center bottominput positionAbsolute settinginput" id="bottompadding">' +
            '<div class="blankBox positionRelative">' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div style="width:37%; float:left" class="settingLeftpanel">' +
            '<div class="form-group">' +
            '<label>Border Color</label>' +
            '<cmscolorpickersetting value="row.style[\'border-color\']" ></cmscolorpickersetting>' +
            //'<div class="colorBorder color-picker-box"><div class="color-inner-div"></div>Select Color</div>'+
            '<div class="clearfix"></div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label>Border style</label>' +
            '<input ng-model="row.style[\'border-style\']" type="text" class="form-control" style="display:none" />' +
            '<div class="dropdown dropdownMenuSelect border1px borderRadius4px">' +
            '<button class="btn dropdown-toggle" type="button" data-toggle="dropdown">' +
            '<span ng-if="!row.style[\'border-style\']">Select Type</span>' +
            '<span style="text-transform: capitalize;" ng-if="row.style[\'border-style\']">{{row.style[\'border-style\']}}</span>' +
            '<span class="fa fa-angle-down pull-right"></span>' +
            '</button>' +
            '<ul class="dropdown-menu">' +
            '<li  ng-click="selectStyle(\'none\')">' +
            '<a class="displayBlock">None</a>' +
            '</li>' +
            '<li  ng-click="selectStyle(\'dotted\')">' +
            '<a class="displayBlock">Dotted</a>' +
            '</li>' +
            '<li  ng-click="selectStyle(\'solid\')">' +
            '<a class="displayBlock">Solid</a>' +
            '</li>' +
            '<li  ng-click="selectStyle(\'double\')">' +
            '<a class="displayBlock">Double</a>' +
            '</li>' +
            '<li  ng-click="selectStyle(\'dashed\')">' +
            '<a class="displayBlock">Dashed</a>' +
            '</li>' +
            '</ul>' +
            '</div>' +
            '</div>' +
            '<div class="form-group">' +
            '<label>Border Radius</label>' +
            '<input ng-model="row.style[\'border-radius\']" ng-blur="checkBorderpx($event)" data-key="border-radius"  placeholder="Type Number" type="text" class="form-control" />' +
            '</div>' +
            '<div class="form-group">' +
            '<label>Text Color</label>' +
            '<cmscolorpickersetting value="row.style[\'color\']" ></cmscolorpickersetting>' +
            '</div>' +
            '</div>' +
            '<div  class="clearfix"></div>' +
            '</div>' +
            '</div>' +
            '<div  class="mfooter">' +
            '<button class="btn btn-default" ng-click="cancelCellrowSetting();" style="margin-right:10px">Close</button>' +
            '</div>' +
            '</div>',
        scope: { popup: '=popup', row: '=row' },
        link: function(scope, element, attr) {
            //if(!$rootScope.row.style) $rootScope.row.style = {};
            if (!scope.row.style) scope.row.style = {};
            /*scope.editColumn = function() {
                $('#myrowSettingmodel').show()
            }*/
            scope.saveRowsSetting = function() {
                    $('#myrowSettingmodel').remove();
                    scope.popup.editCmsCellPopupOpen = false;
                }
                /*scope.editColumn = function() {
                    var dynahtml = "<cmsrowsettings></cmsrowsettings>";
                    var data1 = $compile(dynahtml)(scope);
                    $("body").append(data1);
                }*/
            $(element).draggable({
                handle: ".mheader"
            });
            $(element).css({
                "left": "40%",
                "top": "160px",
                "z-index": "99",
                "position": "fixed"
            });
            scope.cancelCellrowSetting = function() {
                $('#myrowSettingmodel').remove()
                scope.popup.editCmsCellPopupOpen = false;
            };
            scope.checkpx = function(event) {
                var keyName = angular.element($(event.target)).data('key');
                var strt = angular.element($(event.target)).val();
                if ($(event.target).val() !== "") {
                    var str = parseInt($(event.target).val());
                    var checkVal = str + ($(event.target).val().match(/px|%|em/) || 'px');
                    scope.row.style[keyName] = checkVal;
                    if (keyName == "border-left-width" || keyName == "border-right-width" || keyName == "border-top-width" || keyName == "border-bottom-width") {
                        var str = parseInt(("" + ($(event.target).val())).replace(/\D/g, '')) || 0;
                        str = "" + str;
                        if (str.indexOf("px") == -1) {
                            scope.row.style[keyName] = str + "px"
                        }
                    }
                }
            }
            scope.checkBorderpx = function(event) {
                    var RadiuskeyName = angular.element($(event.target)).data('key');
                    var strt = angular.element($(event.target)).val();
                    if ($(event.target).val() !== "") {
                        var str = parseInt(("" + ($(event.target).val())).replace(/\D/g, '')) || 0;
                        str = "" + str;
                        var keyName = $(event.target).attr('data-key');
                        if (str.indexOf("px") == -1) {
                            scope.row.style[RadiuskeyName] = str + "px"
                        }
                    }
                }
                // element.on('blur','#setGapBox input' , function(){
                //     if($(this).val() !== ""){
                //         var str = $(this).val();
                //         var keyName = $(this).attr('data-key');
                //         if(str.indexOf("px") == -1){
                //             scope.row.style[keyName] = str+"px"
                //         }
                //     }
                // });
            scope.selectStyle = function(borderType) {
                scope.row.style['border-style'] = borderType;
            }
            element.on('keypress', '.settinginput', function() {
                $(this).val().replace(/ /g, "");
            });
        }
    };
}]).directive('cmsaddcell', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        scope: { row: '=row', col: '=col', colindex: '=colindex', rowindex: '=rowindex', rows: '=rows', popup: '=popup' },
        template: '<div id="cmsrowaddcellsetting" class="cellsetting cmsSetting cellSmallBox">' +
            '<div  class="mheader"><i class="fa fa-times pull-right" ng-click="cancelrowaddcellSetting();" ></i> Column Setting</div>' +
            '<div  class="mbody">' +
            '<div  class="padding15">' +
            '<div class="font16">Row Layout</div>' +
            '<div class="marginTop10 cmsCollum">' +
            '<span ng-click="chngColls(12)"><img src="/images/cmstemplates/1column.png" /></span>' +
            '<span ng-click="chngColls(66)"><img src="/images/cmstemplates/2column.png" /></span>' +
            '<span ng-click="chngColls(84)"><img src="/images/cmstemplates/2column7030.png" /></span>' +
            '<span ng-click="chngColls(48)"><img src="/images/cmstemplates/2column3070.png" /></span>' +
            '<span ng-click="chngColls(444)"><img src="/images/cmstemplates/3column.png" /></span>' +
            '</div>' +
            '</div>' +
            '</div>' +
            /*'<div  class="mfooter">'+
            '<button class="btn btn-default" ng-click="cancelrowaddcellSetting();" style="margin-right:10px">Cancel</button>'+
            '<button class="btn primary-btn " ng-click="saverowaddcellSetting();">Save</button>'+
            '</div>'+*/
            '</div>' +
            '</div>',
        link: function(scope, element, attr) {
            $(element).draggable({
                handle: ".mheader"
            });
            $(element).css({
                "left": "48%",
                "top": "160px",
                "position": "fixed",
                "z-index": "9999"
            });
            scope.cancelrowaddcellSetting = function() {
                $('#cmsrowaddcellsetting').remove()
                scope.popup.addCmsCellPopupOpen = false
            }
            scope.chngColls = function(meta) {
                var rows = meta.toString();
                var currentColls = JSON.parse(JSON.stringify($rootScope.pagedata.rows[scope.rowindex].cols));
                $rootScope.pagedata.rows[scope.rowindex].cols = [];
                $rootScope.pagedata.rows[scope.rowindex].identifier = rows;
                if (rows == "12") {
                    $rootScope.pagedata.rows[scope.rowindex].cols = [{ span: 12, components: [], style: {} }];
                } else {
                    for (var i = 0; i < rows.length; i++) {
                        $rootScope.pagedata.rows[scope.rowindex].cols[i] = { span: rows[i], components: [], style: {} };
                    }
                }
                if (currentColls.length > $rootScope.pagedata.rows[scope.rowindex].cols.length) {
                    //more to less
                    var lastColl = $rootScope.pagedata.rows[scope.rowindex].cols.length - 1;
                    var tmpComponents = [];
                    if (currentColls.length == 3) {
                        //3-->?
                        tmpComponents = currentColls[1].components.concat(currentColls[2].components);
                        if (!lastColl) {
                            //3-->1
                            tmpComponents = currentColls[0].components.concat(tmpComponents);
                        } else if (currentColls[0] && currentColls[0].components) {
                            //3-->2
                            $rootScope.pagedata.rows[scope.rowindex].cols[0].components = currentColls[0].components;
                        }
                    } else if (currentColls.length == 2) {
                        //2-->1
                        tmpComponents = currentColls[0].components.concat(currentColls[1].components)
                    }
                    $rootScope.pagedata.rows[scope.rowindex].cols[lastColl].components = tmpComponents;
                } else {
                    //less to more/equal
                    if (currentColls[0] && currentColls[0].components)
                        $rootScope.pagedata.rows[scope.rowindex].cols[0].components = currentColls[0].components;
                    if (currentColls[1] && currentColls[1].components)
                        $rootScope.pagedata.rows[scope.rowindex].cols[1].components = currentColls[1].components;
                    if (currentColls[2] && currentColls[2].components)
                        $rootScope.pagedata.rows[scope.rowindex].cols[2].components = currentColls[2].components;
                }
                if (currentColls[0] && currentColls[0].style && $rootScope.pagedata.rows[scope.rowindex].cols[0])
                    $rootScope.pagedata.rows[scope.rowindex].cols[0].style = currentColls[0].style;
                if (currentColls[1] && currentColls[1].style && $rootScope.pagedata.rows[scope.rowindex].cols[1])
                    $rootScope.pagedata.rows[scope.rowindex].cols[1].style = currentColls[1].style;
                if (currentColls[2] && currentColls[2].style && $rootScope.pagedata.rows[scope.rowindex].cols[2])
                    $rootScope.pagedata.rows[scope.rowindex].cols[2].style = currentColls[2].style;
            }
        }
    };
}]).directive('cmscontentimport', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        replace: true,
        template: '<div class="leftBoxbtnMargin"><button ng-click="openContentImport();" type="submit" class="btn primary-btn studioPrimaryBorder pull-right"><add-icon class="icon10"></add-icon> Import Content</button>',
        //scope:{row:'=row', col:'=col', colindex:'=colindex'},
        link: function(scope, element, attr) {
            scope.openContentImport = function() {
                $rootScope.showcontentimportsearch = true;
                $rootScope.showcontentimportresult = false;
                $rootScope.showcontentimportsuccess = false;
                $("#contentImportModel").modal("show");
            }
        }
    };
}]).directive('cmsimagesettings', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        replace: true,
        template: '<div><button class="btn primary-btn studioPrimaryBorder pull-right" ng-click="openContentImport();" type="submit" ><add-icon class="icon10"></add-icon> Import Content</button>',
        //scope:{row:'=row', col:'=col', colindex:'=colindex'},
        link: function(scope, element, attr) {
            scope.openContentImport = function() {
                $("#contentImportModel").modal("show");
            }
        }
    };
}]).directive('cmstexteditor', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'AE',
        transclude: false,
        scope: { attribute: '=compval', type: '@type' },
        replace: true,
        link: function(scope, element, attr) {
            //alert("uniApplet directive " + scope.id);
            //alert(attr.cid);
            //scope.appletname = scope.comp.applet.displayname;
            //alert(element.data.cid);
            if (scope.type == 'editor') {
                if ($("#ckeditorjs").length == 0) {
                    //$('<script id="ckeditorjs" src="ckeditor/ckeditor.js"></script>').appendTo('head');
                    $.fn.modal.Constructor.prototype.enforceFocus = function() {
                        modal_this = this
                        $(document).on('focusin.modal', function(e) {
                            if (modal_this.$element[0] !== e.target && !modal_this.$element.has(e.target).length &&
                                !$(e.target.parentNode).hasClass('cke_dialog_ui_input_select') &&
                                !$(e.target.parentNode).hasClass('cke_dialog_ui_input_text')) {
                                modal_this.$element.focus()
                            }
                        })
                    };
                };

                setTimeout(function() {
                    var editor = CKEDITOR.instances['texteditor'];
                    if (editor) {
                        editor.destroy(true);
                    }
                    CKEDITOR.config.enterMode = CKEDITOR.ENTER_BR;
                    var editor = CKEDITOR.replace('texteditor', {
                        allowedContent: {
                            script: true,
                            $1: {
                                // Use the ability to specify elements as an object.
                                elements: CKEDITOR.dtd,
                                attributes: true,
                                styles: true,
                                classes: true
                            }
                        },
                        //disallowedContent :'ssscript; *[sson*]',
                        autoUpdateElement: false,
                        removeButtons: 'Save,NewPage,Templates,Form,Checkbox,Radio,TextField,Textarea,Select,Button,ImageButton,HiddenField,Flash,Iframe,sourcedialog',
                        removePlugins: 'sourcedialog,emogi,base64image',
                        height: 250,
                        a11ychecker_quailParams: {
                            // Override Accessibility Checker gudielines from the default configuration.
                            guideline: [
                                'imgNonDecorativeHasAlt',
                                'imgImportantNoSpacerAlt',
                                'aTitleDescribesDestination',
                                'aAdjacentWithSameResourceShouldBeCombined',
                                'aImgAltNotRepetitive',
                                'aMustNotHaveJavascriptHref',
                                'aSuspiciousLinkText',
                                'blockquoteNotUsedForIndentation',
                                'documentVisualListsAreMarkedUp',
                                'headerH1',
                                'headerH2',
                                'headerH3',
                                'headerH4',
                                'imgAltIsDifferent',
                                'imgAltIsTooLong',
                                'imgAltNotEmptyInAnchor',
                                'imgAltTextNotRedundant',
                                'imgHasAlt',
                                'imgShouldNotHaveTitle',
                                'linkHasAUniqueContext',
                                'pNotUsedAsHeader',
                                'tableDataShouldHaveTh',
                                'imgWithEmptyAlt'
                            ]
                        },
                        contentsCss: [
                            'ckeditor/contents.css',
                        ]
                    });

                    editor.on('change', function(evt) {
                        scope.attribute.value = editor.getData();
                        scope.$apply();
                    });

                    editor.on('key', function(evt) {
                        scope.attribute.value = editor.getData();
                        scope.$apply();
                    });
                }, 100);
            }

        }
    };
}]).directive('cmscolorpicker', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        replace: true,
        scope: { 'value': '=value' },
        template: '<div class="colorcompcontainer">' +
            '<div class="colorcompdisp"></div>' +
            '<div class="colorcompselect">Select color</div>' +
            '</div>',
        link: function(scope, element, attr) {
            $(element).ColorPicker({
                color: '#fff',
                onShow: function(colpkr) {
                    $(colpkr).fadeIn(500);
                    return false;
                },
                onHide: function(colpkr) {
                    $(colpkr).fadeOut(500);
                    return false;
                },
                onSubmit: function(hsb, hex, rgb, el) {
                    $(el).val(hex);
                    $(el).ColorPickerHide();
                },
                onChange: function(hsb, hex, rgb) {
                    $(element).find(".colorcompdisp").css('backgroundColor', '#' + hex);
                    scope.value = '#' + hex;
                    scope.$apply();
                }
            });
        }
    };
}]).directive('cmscolorpickersetting', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        replace: true,
        scope: { 'value': '=value' },
        template: '<div class="colorcompcontainer">' +
            '<div class="customcolorpicker positionRelative">' +
            '<div class="colorInner">' +
            '<div class="selectPickerColor text-center">' +
            '<img src="images/color-picker.svg" class="icon50" >' +
            '<span class="displayBlock marginTop10px">Select Color</span>' +
            '</div>' +
            '<div class="colorcompdisp" style="Background:{{value}}"></div>' +
            '<div ng-if="!value" class="colorcompselect">Select color</div>' +
            '<div ng-if="value" class="colorcompselect">Change color</div>' +
            '</div>' +
            '<div class="selectetdColr">' +
            '<span>{{value}}</span>' +
            '<span class="pull-right cmsColor cursorPointer" ng-if="value" ng-click="removeColor()">' +
            '<i class="fa fa-times"></i>' +
            '</span>' +
            '</div>' +
            '</div>' +
            '</div>',
        //scope:{row:'=row', col:'=col', colindex:'=colindex'},
        link: function(scope, element, attr) {
            $(element).ColorPicker({
                color: '#fff',
                onShow: function(colpkr) {
                    $(colpkr).fadeIn(500);
                    return false;
                },
                onHide: function(colpkr) {
                    $(colpkr).fadeOut(500);
                    return false;
                },
                onSubmit: function(hsb, hex, rgb, el) {
                    $(el).val(hex);
                    $(el).ColorPickerHide();
                },
                onChange: function(hsb, hex, rgb) {
                    $(element).find(".colorcompdisp").css('backgroundColor', '#' + hex);
                    scope.value = '#' + hex;
                    scope.$apply();
                }
            });
            scope.removeColor = function() {
                $(element).find(".colorcompdisp").css('backgroundColor', '');
                scope.value = '';
                scope.$apply();
            }
        }
    };
}]).directive('sidebar', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', '$timeout', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location, $timeout) {
    return {
        restrict: 'E',
        transclude: false,
        replace: true,
        //scope : {'appFeatures1' : '=appFeatures', 'navmenu' : '=navmenu', 'sitelogo' : '=sitelogo',  'otherApplets' : '=otherApplets'},
        template: '<nav id="sidebar">' +
            '<div class="sidebar-header text-center active tabFocusHighlighter cursorPointer" tabindex="0" ng-click="goHome();">' +
            '<a href="javascript:void(0)">' +
            '<img class="logo tenantbig" ng-src="{{logoUrl}}" alt="tenant big logo">' +
            '<img class="logo tenantsmall" ng-src="{{smallLogoUrl}}"  alt="tenant small logo">' +
            '</a>' +
            '<div class="separator"></div>' +
            '</div>' +
            '<div class="applets-heading active">' +
            '<div class="searchbox-container proximaFont clearfix" >' +
            '<img class="searchicon convertsvg pull-right" src="/images/search.svg" alt="search" ng-click="showSearchText()">' +
            '<input class="proximaFont ng-pristine ng-valid" aria-label="search input" id="searchBox" name="q" ng-model="searchMenu" placeholder="Search apps.." type="text">' +
            '<img class="remove-search" ng-click="searchMenu = &quot;&quot;; isSearchActive = false;" src="/images/cross.svg" alt="cross icon" ng-show="isSearchActive">' +
            '</div>' +
            '<div class="searchbox-container proximaFont clearfix ng-hide" ng-show="isSearchActive">' +
            '<input class="proximaFont ng-pristine ng-valid" aria-label="search" name="q" ng-model="searchMenu" placeholder="Search apps.." type="text">' +
            '<img class="remove-search" ng-click="searchMenu = &quot;&quot;; isSearchActive = false;" src="images/cross.svg" alt="cross icon">' +
            '</div>' +
            '</div>' +
            '<ul class="list-unstyled components overflowYScroll mCSB_container" id="menu-block" aria-label="Navigation lists" >' +
            '<li ng-if="site.leftnavconfig.leftnavql && !site.leftnavconfig.leftnaverp" ng-show="user.accessToken" class="panel"><div quicklaunchmenu ></div> </li>' +
            '<li ng-if="appletList != undefined  && appletList.length != 0"  >' +
            '<div favappletmenu >  </div> </li>' +
            '<li  ng-hide="nav.hideOnSidebar" ng-repeat="nav in rbacnavmenu | filter: IsChildObjectVisible" class="panel">' +
            //'<a id="{{nav._id}}" ng-if= "nav.children.length > 0" title="{{nav.label}}" class="menu-item group-menu cursorPointer"  data-parent=".mCSB_container" data-target="#grp{{nav.id}}" data-toggle="collapse" aria-expanded="false" ng-click="menuClick(nav)">' +
            '<a id="{{nav._id}}" ng-if= "nav.children.length > 0 && checkGroupElement(nav)" tabindex="0" title="{{nav.label}}" class="menu-item group-menu cursorPointer"  data-parent=".mCSB_container" data-target="#grp{{nav.id}}" data-toggle="collapse" aria-expanded="false" ng-click="menuClick(nav)">' +
            '<img class=" sidebar-menu-icon" ng-src="{{nav.image}}" alt=""><span class="innertitle">{{nav.label}}</span>' +
            '</a>' +
            '<ul ng-if= "nav.children.length > 0" class="list-unstyled collapse" ng-class="openChild" id="grp{{nav.id}}" aria-expanded="false" style="">' +
            '<li ng-hide="page.hideOnSidebar" ng-repeat="page in nav.children" id="sidebarGroup{{$index}}{{nav.id}}">' +

            '<a id="{{page._id}}" title="{{page.label}}" ng-if= "page.url != null && page.target == null" class="menu-item" ng-href="{{page.url}}" ng-click="menuClick(page);">' +
            '<img class="hide sidebar-menu-icon" alt="" ng-src="{{page.image}}">{{page.label}}' +
            '</a>' +
            '<a id="{{page._id}}" title="{{page.label}}" ng-if= "page.url != null && page.target != null " class="menu-item" ng-href="{{page.url}}" target="_blank" ng-click="menuClick(page);">' +
            '<img class="hide sidebar-menu-icon" alt="" ng-src="{{page.image}}">{{page.label}}' +
            '</a>' +

            '<a id="{{page._id}}" ng-if= "page.children.length > 0 && page.url == null" tabindex="0" title="{{page.label}}" class="menu-item group-menu cursorPointer"  data-parent="#sidebarGroup{{$index}}{{page.id}}" data-target="#grp{{page.id}}" data-toggle="collapse" aria-expanded="false" ng-click="menuClick(nav)">' +
            '<!--<img class=" sidebar-menu-icon" ng-src="{{page.image}}">--><span class="innertitle">{{page.label}}</span>' +
            '</a>' +
            '<ul ng-if= "page.children.length > 0" class="list-unstyled collapse" ng-class="openChild" id="grp{{page.id}}" aria-expanded="false" style="">' +
            '<li ng-hide="page.hideOnSidebar" ng-repeat="subPage in page.children" >' +
            '<a id="{{subPage._id}}" title="{{subPage.label}}" ng-if= "subPage.url == null" class="menu-item" ng-href="{{(subPage.url.split(\'/\')[2])}}" ng-click="menuClick(subPage)">' +
            '<img class="hide sidebar-menu-icon" ng-src="{{subPage.image}}" alt="">' +
            '{{subPage.label}}' +
            '</a>' +
            '<a id="{{subPage._id}}" title="{{subPage.label}}" ng-if= "subPage.url != null && subPage.target == null && !subPage.hideOnSidebar" class="menu-item" ng-href="{{subPage.url}}"   ng-click="menuClick(subPage);">' +
            '<img class="hide sidebar-menu-icon" alt="" ng-src="{{subPage.image}}">{{subPage.label}}' +
            '</a>' +
            '<a id="{{subPage._id}}" title="{{subPage.label}}" ng-if= "subPage.url != null && subPage.target != null && !subPage.hideOnSidebar" class="menu-item" ng-href="{{subPage.url}}"   ng-click="menuClick(subPage);">' +
            '<img class="hide sidebar-menu-icon" alt="" ng-src="{{subPage.image}}">{{subPage.label}}' +
            '</a>' +
            '</li>' +
            '</ul>' +

            '</li>' +
            '</ul>' +
            '<a id="{{nav._id}}" title="{{nav.label}}" ng-if= "nav.children.length == 0 && nav.target == null && nav.type != \'group\'" class="menu-item  cursorPointer" ng-href="{{nav.url}}" ng-click="menuClick(nav)">' +
            '<img class=" sidebar-menu-icon" alt="" ng-src="{{nav.image}}"><span class="innertitle">{{nav.label}}</span>' +
            '</a>' +
            '<a id="{{nav._id}}" title="{{nav.label}}" ng-if= "nav.children.length == 0 && nav.target != null && nav.type != \'group\'" class="menu-item  cursorPointer" ng-href="{{nav.url}}"  target="_blank" ng-click="menuClick(nav);">' +
            '<img class=" sidebar-menu-icon" alt="" ng-src="{{nav.image}}"><span class="innertitle">{{nav.label}}</span>' +
            '</a>' +
            '</li>' +
            '</ul>' +
            '<div id="contactSupport" class="contact-support text-center lightgreytext">' +
            '<a class="menu-item text-center" href="{{site.contactsupporturl}}" target="_blank">' +
            '<img class="sidebar-menu-icon" src="cmsGallery/contact_support.svg">' +
            'Contact Support' +
            '</a>' + '<span class="fontSize12"><span class="showPowerBy">Powered by</span> Unifyed<span class="showPowerBy">. © {{curyear}}</span></span>' + //'<span ng-click="openAbout();" class="version fontSize12" style="display:inline-block; margin-left:3px" title="Build : {{tenantmetadata.version}}">V<span class="showPowerBy">er</span> : {{projversion}} </span>' +
            '</div>' +
            '</nav>',
        //scope:{row:'=row', col:'=col', colindex:'=colindex'},
        link: function(scope, element, attr) {
            $rootScope.showSearchGlobalText = function(event, key) {
                if (event.keyCode == 13) {
                    var searchTxt = $("#globalSearchInput").val();
                    if (searchTxt && searchTxt.trim().length >= 0) {
                        $location.path('/globalsearch');
                    }
                }
            };
            scope.checkGroupElement = function(nav) {
                //console.log('checkGroupElement',nav);
                var hasAppletItem = false;
                angular.forEach(nav.children, function(value, key) {
                    if (value.type != 'group') {
                        hasAppletItem = true;
                    }
                });
                if (!hasAppletItem) {
                    angular.forEach(nav.children, function(value, key) {
                        if (value.type == 'group') {
                            if (value.children) {
                                angular.forEach(value.children, function(item, key) {
                                    if (item.type != 'group') {
                                        console.log(item);
                                        hasAppletItem = true;
                                    }
                                });
                            }
                        }
                    });
                }

                if (hasAppletItem) { return true } else { return false };
            }
            var getMenu = function(menus, root) {
                var menu = null;
                //console.log(root);
                try {
                    angular.forEach(menus, function(value, key) {
                        if (value.root == root) {
                            menu = value;
                        }
                        //console.log("Value : " + value.root + " ---- >" + root);
                    });
                } catch (ex) {
                    console.log(ex);
                }
                //console.log("Menu : " + menu);
                return menu;
            }
            var finalLoadGlobalRbac = function(response, callback) {
                $rootScope.dockApplets = response && response.data && response.data.docks ? response.data.docks : scope.dockAppletsFallBack;
                scope.compare = function(a, b) {
                    var genreA = a.precedence;
                    var genreB = b.precedence;

                    var comparison = 0;
                    if (genreA > genreB) {
                        comparison = 1;
                    } else if (genreA < genreB) {
                        comparison = -1;
                    }
                    return comparison;
                }
                $rootScope.dockApplets.sort(scope.compare);
                console.log('$rootScope.dockApplets', $rootScope.dockApplets);
                /*remove duplicate from array of object function */
                function removeDuplicates(arr) {
                    var unique_array = []
                    var unique_object = [];
                    for (var i = 0; i < arr.menus.length; i++) {
                        if (unique_array.indexOf(arr.menus[i].id) == -1) {
                            unique_array.push(arr.menus[i].id)
                            unique_object.push(arr.menus[i]);
                        } else {
                            for (var j = 0; j < unique_object.length; j++) {
                                if (unique_object[j].id == arr.menus[i].id) {
                                    for (var permission in arr.menus[i].actions) {
                                        if (!unique_object[j].actions.hasOwnProperty(permission)) {
                                            unique_object[j].actions[permission] = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    return unique_object
                }
                var menudata = response.data ? response.data : scope.menudataFallBack;
                menudata.menus = removeDuplicates(menudata);
                if (menudata && menudata.landingPages.length > 0) {
                    $rootScope.rbacFirstLanding = menudata.landingPages[0];
                }
                var rbacnavmenu = []
                scope.buildMenuTree = function(menuRanks) {
                    scope.masterMenuTree = [];
                    var pushEleInGroup = function(tree, ele) {
                        angular.forEach(tree, function(node, key) {
                            //tree.forEach(node => {
                            if ($rootScope.rbacFirstLanding && node.id == $rootScope.rbacFirstLanding.pageId) {
                                $rootScope.rbacFirstLanding.menu = node;
                                $rootScope.site.landingpage = $rootScope.rbacFirstLanding.menu.url;
                            }
                            if (node.path.split('/')[node.path.split('/').length - 1] == ele.root) {
                                node.children = node.children || [];
                                node.children.push(ele);
                            } else if (node.children) {
                                pushEleInGroup(node.children, ele);
                            }
                        });
                    }

                    //menuRanks.forEach(node => {
                    angular.forEach(menuRanks, function(node, key) {

                        if ($rootScope.rbacFirstLanding && node.id == $rootScope.rbacFirstLanding.pageId) {
                            $rootScope.rbacFirstLanding.menu = node;
                            $rootScope.site.landingpage = $rootScope.rbacFirstLanding.menu.url;
                        }
                        if (node.path == node.root) {
                            node.children = [];
                            scope.masterMenuTree.push(node)
                        } else {
                            pushEleInGroup(scope.masterMenuTree, node);
                        }
                    });
                }
                scope.buildMenuTree(menudata.menus);
                /*angular.forEach(menudata.menus, function(value, key) {
                    if ($rootScope.rbacFirstLanding && value.id == $rootScope.rbacFirstLanding.pageId) {
                        $rootScope.rbacFirstLanding.menu = value;
                        $rootScope.site.landingpage = $rootScope.rbacFirstLanding.menu.url;
                    }
                    if (!value.path) {
                        rbacnavmenu.push({
                            "_id": value.id,
                            "name": value.label,
                            "path": value.url,
                            "url": value.url,
                            "icon": value.image,
                            "root": value.root,
                            "type": value.type,
                            "target": value.target == "" ? null : value.target,
                            "hideOnSidebar": value.hideOnSidebar,
                            "children": []
                        });
                    } else {
                        var paths = value.path.split("/");
                        var rootmenu = getMenu(rbacnavmenu, paths[0]);
                        if (rootmenu && rootmenu.children) {
                            rootmenu.children.push({
                                "_id": value.id,
                                "name": value.label,
                                "path": value.url,
                                "url": value.url,
                                "icon": value.image,
                                "root": value.root,
                                "type": value.type,
                                "target": value.target == "" ? null : value.target,
                                "hideOnSidebar": value.hideOnSidebar,
                                "children": []
                            });
                        }
                    }
                });*/
                $rootScope.rbacnavmenu = scope.masterMenuTree;
                $rootScope.rbacallmenus = menudata.menus;
                console.log('$rootScope.rbacnavmenu', $rootScope.rbacnavmenu);
                console.log('$rootScope.rbacallmenus', $rootScope.rbacallmenus);
                if ($rootScope.user.accessToken) { //Load favourites only if user is logged in, else its a public page
                    $rootScope.getFavList();
                }
                if (callback) {
                    callback();
                }
                //Do it here..!!
                setTimeout(function() {
                    $('.group-menu').keyup(function(e) {
                        if (e.keyCode === 13) {
                            $('.list-unstyled').removeClass('in').attr("aria-expanded", "false");
                            $('.group-menu').removeClass('collapsed').attr('aria-expanded', "false");
                            if ($(this).parent('.panel').length) {
                                $(this).addClass('collapsed').attr('aria-expanded', "true");
                                $(this).parent().children('.list-unstyled').addClass('in').attr("aria-expanded", "true");
                            } else {
                                $(this).addClass('collapsed').attr('aria-expanded', "true");
                                $(this).parent().children('.list-unstyled').addClass('in').attr("aria-expanded", "true");
                                $(this).parent().parent().parent('.panel').children('.group-menu').addClass('collapsed').attr('aria-expanded', "true");
                                $(this).parent().parent('.list-unstyled').addClass('in').attr("aria-expanded", "true");
                            }
                        }
                    })
                    $('.dropdown.user-profile').keyup(function(e) {
                        if (e.keyCode == 13) {
                            $(this).toggleClass('open')
                        }
                    });

                    jQuery('img.sidebar-menu-icon , img.convertsvg , img.dock-menu-icon').each(function() {
                        var $img = jQuery(this);
                        var imgID = $img.attr('id');
                        var imgClass = $img.attr('class');
                        var imgURL = $img.attr('src');
                        jQuery.get(imgURL, function(data) {
                            // Get the SVG tag, ignore the rest
                            var $svg = jQuery(data).find('svg');
                            // Add replaced image's ID to the new SVG
                            if (typeof imgID !== 'undefined') {
                                $svg = $svg.attr('id', imgID);
                            }
                            // Add replaced image's classes to the new SVG
                            if (typeof imgClass !== 'undefined') {
                                $svg = $svg.attr('class', imgClass + ' replaced-svg');
                            }
                            // Remove any invalid XML tags as per http://validator.w3.org
                            $svg = $svg.removeAttr('xmlns:a');
                            // Check if the viewport is set, else we gonna set it if we can.
                            if (!$svg.attr('viewBox') && $svg.attr('height') && $svg.attr('width')) {
                                $svg.attr('viewBox', '0 0 ' + $svg.attr('height') + ' ' + $svg.attr('width'))
                            }
                            // Replace image with new SVG
                            $img.replaceWith($svg);
                        }, 'xml');
                    });
                }, 1000)
            }
            $rootScope.loadGlobalRbac = function(callback) {
                var roles = ["Public"];
                var url = "/unifyedrbac/rbac/open/menus";
                var method = "POST";
                roles = roles.concat($rootScope.user.role);
                var postdata = { "roles": roles, "product": "global" };
                var postbody = [postdata];
                //Handle public user and authenticated user. Make the decision based on Accesstoken.
                //If access token not present, treat this as a public page access.
                if ($rootScope.user.accessToken) {
                    roles.push("AllUsers");
                    url = "/unifyedrbac/rbac/user?user=" + $rootScope.user.email+"&device=mobile";
                    method = "GET";
                    postbody = {};
                }

                //$rootScope.callAPI("/unifyedrbac/rbac/open/menus", 'POST', [postdata], function (response) {
                $rootScope.callAPI(url, method, postbody, function(response) {
                    scope.dockAppletsFallBack = [];
                    scope.menudataFallBack = [];
                    //in case /unifyedrbac/rbac/user fails
                    if (response.status == 2) {
                        $rootScope.callAPI("/unifyedrbac/rbac/open/menus", 'POST', [postdata], function(response) {
                            if (!response) { //RBAC is not yet defined. Brand new tenant.
                                $rootScope.rbacnavmenu = [];
                                $rootScope.rbacallmenus = [];
                            } else if (response && response.data) {
                                scope.menudataFallBack = response.data;
                                if (response.data.docks)
                                    scope.dockAppletsFallBack = response.data.docks;
                            }
                            finalLoadGlobalRbac(response, callback);
                        }, 3);
                    } else if (!response) { //RBAC is not yet defined. Brand new tenant.
                        $rootScope.rbacnavmenu = [];
                        $rootScope.rbacallmenus = [];
                        finalLoadGlobalRbac(response, callback);
                    } else {
                        finalLoadGlobalRbac(response, callback);
                    }
                }, 2);
            }
            var waitAndCallRBac = function() {
                if (!$rootScope.user) {
                    setTimeout(function() {
                        waitAndCallRBac();
                    }, 10);
                    return;
                }
                if (!$rootScope.site || !$rootScope.site.leftnavconfig) {
                    setTimeout(function() {
                        waitAndCallRBac();
                    }, 10);
                    return;
                }
                /*if(!$rootScope.site.leftnavconfig.leftnaverp) {
                    return;
                }*/
                try {
                    $rootScope.loadGlobalRbac(function() {
                        $timeout(function() {
                            var urlPath = $location.path();
                            var path = attr;
                            console.log(urlPath, 'current url')
                            console.log(path, 'attr url')
                            scope.$watch('urlPath', function(newPath) {
                                if (path === newPath) {
                                    console.log(path, 'linkPath')
                                    console.log(element, 'element path')
                                } else {
                                    console.log(path, 'linkPath1')
                                    console.log(newPath, 'current url1')
                                    console.log(element, 'element path1')
                                }
                            });
                        }, 1000)

                    });
                } catch (ex) {
                    console.log(ex);
                }
            }
            waitAndCallRBac();
            scope.menuClick = function(nav) {
                $rootScope.$broadcast("onMenuClick", { "type": nav.type, "menu": nav });
                //$(event.target).addClass('highlightNav');
                try {
                    //$('.menu-item').removeClass('active');
                    //$('a[href^="' + nav.url + '"]').addClass('active').addClass('highlightNav');
                    //$('a[href^="' + nav.url + '"]').parent().parent().siblings().addClass('active');
                } catch (ex) {
                    console.log("Error");
                    console.log(ex);
                }
                $("#menu-block").getNiceScroll().remove();
                $("#menu-block").niceScroll({
                    cursorwidth: 4,
                    cursoropacitymin: 0.4,
                    cursorcolor: '#ffffff',
                    cursorborder: 'none',
                    cursorborderradius: 4,
                    autohidemode: 'leave',
                    horizrailenabled:false
                });
            }
            scope.goHome = function() {
                    if (window.siteGroupId) {
                        $window.location.href = "/";
                    } else {
                        if ($rootScope.site.landingpage) {
                            $location.path($rootScope.site.landingpage);
                        } else {
                            $location.path('/app/Settings2/Settings2Page9');
                        }
                    }

                }
                /*********function for serarch chile nodes in sidebar **********/
            scope.openChild = "";
            scope.IsChildObjectVisible = function(navmenu) {
                var searchKey = scope.searchMenu;
                var returnVal = true;
                if (undefined != searchKey && null != searchKey && searchKey.length > 0) {
                    scope.openChild = "in";
                    returnVal = (navmenu.label.toLowerCase().indexOf(searchKey.toLowerCase()) > -1);
                    if (typeof navmenu.children != 'undefined') {
                        angular.forEach(navmenu.children, function(value, key) {
                            if (value.label.toLowerCase().indexOf(searchKey.toLowerCase()) > -1) {
                                returnVal = true;
                            }
                            if (typeof value.children != 'undefined') {
                                angular.forEach(value.children, function(item, key) {
                                    if (item.label.toLowerCase().indexOf(searchKey.toLowerCase()) > -1) {
                                        returnVal = true;
                                    }
                                });
                            }
                        });
                    }
                } else {
                    scope.openChild = "";
                }
                return returnVal;
            }
            scope.IsChildAppletVisible = function(navmenu) {
                var searchKey = scope.searchMenu;
                var returnVal = true;
                if (undefined != searchKey && null != searchKey && searchKey.length > 0) {
                    scope.openChild = "in";
                    returnVal = (navmenu.appFeatureType.toLowerCase().indexOf(searchKey.toLowerCase()) > -1);
                    if (typeof navmenu.applets != 'undefined') {
                        angular.forEach(navmenu.applets, function(value, key) {
                            if (value.appletDisplayName.toLowerCase().indexOf(searchKey.toLowerCase()) > -1) {
                                returnVal = true;
                            }
                            if (typeof value.applets != 'undefined') {
                                angular.forEach(value.applets, function(item, key) {
                                    if (item.appletDisplayName.toLowerCase().indexOf(searchKey.toLowerCase()) > -1) {
                                        returnVal = true;
                                    }
                                });
                            }
                        });
                    }
                } else {
                    scope.openChild = "";
                }
                return returnVal;
            }
            scope.$watch('searchMenu', function(value) {
                scope.IsChildAppletVisible(value)
                scope.IsChildObjectVisible(value)
                scope.searchSvg();
            });
            scope.searchSvg = function() {
                //Do it here..!!
                setTimeout(function() {
                    jQuery('img.sidebar-menu-icon , img.convertsvg').each(function() {
                        var $img = jQuery(this);
                        var imgID = $img.attr('id');
                        var imgClass = $img.attr('class');
                        var imgURL = $img.attr('src');
                        jQuery.get(imgURL, function(data) {
                            // Get the SVG tag, ignore the rest
                            var $svg = jQuery(data).find('svg');
                            // Add replaced image's ID to the new SVG
                            if (typeof imgID !== 'undefined') {
                                $svg = $svg.attr('id', imgID);
                            }
                            // Add replaced image's classes to the new SVG
                            if (typeof imgClass !== 'undefined') {
                                $svg = $svg.attr('class', imgClass + ' replaced-svg');
                            }
                            // Remove any invalid XML tags as per http://validator.w3.org
                            $svg = $svg.removeAttr('xmlns:a');
                            // Check if the viewport is set, else we gonna set it if we can.
                            if (!$svg.attr('viewBox') && $svg.attr('height') && $svg.attr('width')) {
                                $svg.attr('viewBox', '0 0 ' + $svg.attr('height') + ' ' + $svg.attr('width'))
                            }
                            // Replace image with new SVG
                            $img.replaceWith($svg);
                        }, 'xml');
                    });
                }, 800)
            }
            scope.openAbout = function() {
                $("#aboutproductModal").modal("show");
            }
            $http.get('/about')
                .then(function(response) {
                    $rootScope.aboutproj = response.data;
                    scope.projversion = response.data.version;
                }, function(errorResponse) {
                    console.log('Error in loading /about URl : ' + errorResponse);
                });
            scope.curyear = new Date().getFullYear();
            scope.extenalClick = function(nav) {
                $rootScope.$broadcast("onMenuClick", { "type": "elink", "menu": nav });
            }
            scope.internalClick = function(nav) {
                $rootScope.$broadcast("onMenuClick", { "type": "ilink", "menu": nav });
                try {
                    console.log("Applet clicked.." + nav);
                    // $('.menu-item').removeClass('active');
                    // $('a').addClass('active').addClass('highlightNav');
                    // $('a').parent().parent().siblings().addClass('active');
                } catch (ex) {
                    console.log("Error");
                    console.log(ex);
                }
            }
            scope.appletClick = function(nav) {
                $rootScope.$broadcast("onMenuClick", { "type": "applet", "menu": nav });
                try {
                    console.log("Applet clicked.." + nav);
                    $('.menu-item').removeClass('active');
                    $('a[href^="' + nav.url + '"]').addClass('active').addClass('highlightNav');
                    $('a[href^="' + nav.url + '"]').parent().parent().siblings().addClass('active');
                } catch (ex) {
                    console.log("Error");
                    console.log(ex);
                }
            }
            setTimeout(function() {
                $('#sidebarCollapse').on('click', function() {
                    $('#sidebar').addClass('active');
                    $('.overlay').fadeIn();
                    $('#sidebar .collapse.in').toggleClass('in');
                    $('a[aria-expanded=true]').attr('aria-expanded', 'false');
                });
                $('#addToggleMode').on('click', function() {
                    $('body.sidebar-mini').addClass('toggleMode');
                    $('#addToggleMode').hide();
                    $('#removeToggleMode').show();
                });
                $('#removeToggleMode').on('click', function() {
                    $('body.sidebar-mini').removeClass('toggleMode');
                    $('#addToggleMode').show();
                    $('#removeToggleMode').hide();
                });
            }, 1000);
            scope.openContentImport = function() {
                $("#contentImportModel").modal("show");
            }
            $rootScope.adjustMenuHeight = function() {
                // var viewportHeight = $(window).height();
                // var menuHeight = null;
                // if ($("body").hasClass("studiomode")) {
                //     var menuHeight = (viewportHeight - 310);
                // } else {
                //     var menuHeight = (viewportHeight - 210);
                // }
                // var a = $('#menu-block').height(menuHeight);
                if ($(window).width() > 768) {
                    $('#sidebar').removeClass('active');
                    $('.overlay').fadeOut();
                }
            }

            $rootScope.getFavList = function() {
                $rootScope.rbacAppletListFav = [];
                if ($rootScope.rbacallmenus != undefined) {
                    console.log("$rootScope.rbacallmenus", $rootScope.rbacallmenus);
                    /*  for (var i = 0; i < $rootScope.rbacnavmenu.length; i++) {
                          if ($rootScope.rbacnavmenu[i].children == undefined || $rootScope.rbacnavmenu[i].children.length == 0) {
                              $rootScope.rbacAppletListFav.push($rootScope.rbacnavmenu[i]);
                          } else {
                              for (var j = 0; j < $rootScope.rbacnavmenu[i].children.length; j++) {
                                  $rootScope.rbacAppletListFav.push($rootScope.rbacnavmenu[i].children[j]);
                              }
                          }
                      } */

                    for (var i = 0; i < $rootScope.rbacallmenus.length; i++) {
                        if ($rootScope.rbacallmenus.type != 'group') {
                            $rootScope.rbacAppletListFav.push($rootScope.rbacallmenus[i]);
                        }
                    }

                    console.log("$rootScope.rbacAppletListFav", $rootScope.rbacAppletListFav);
                    //  console.log("$rootScope.rbacnavmenu", $rootScope.rbacnavmenu);
                    scope.email = $rootScope.user.email;
                    var url = "/unifydidentity/user/search/findOneByEmail?email=" + scope.email;
                    $rootScope.callAPI(url, 'GET', '', function(response) {
                        $rootScope.appletList = response.data.appletList;
                        console.log("before scope.appletList", $rootScope.appletList);
                        if ($rootScope.appletList != undefined && $rootScope.appletList.length != 0) {
                            for (var i = 0; i < $rootScope.appletList.length; i++) {
                                if ($rootScope.rbacAppletListFav.map(function(e) { return e.url; }).indexOf($rootScope.appletList[i].url) == -1) {
                                    $rootScope.appletList.splice(i, 1);
                                }
                            }
                        }
                        console.log("scope.appletList", $rootScope.appletList);
                    }, function(errorResponse) {
                        console.log('Error in populating AppletList ' + errorResponse);
                    });
                }
            }
            var addScroll = function(){
                        $("#menu-block").niceScroll({
                            cursorwidth: 4,
                            cursoropacitymin: 0.4,
                            cursorcolor: '#ffffff',
                            cursorborder: 'none',
                            cursorborderradius: 4,
                            autohidemode: 'leave',
                            horizrailenabled:false
                        });
                     }
            $rootScope.adjustMenuHeight();
            $(window).resize(function() {
                $("#menu-block").getNiceScroll().remove();
                addScroll()
                $rootScope.adjustMenuHeight();
            });


        }
    };
}]).directive('topbar', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        replace: true,
        /*scope : {'dockApplets' : '=dockApplets'},*/
        template: '' +

            '<div class="navbar navbar-default" >' +
            '<div class="container-fluid">' +
            '<div class="navbar-header">' +
            '<div id="sidebarCollapse" class="active">' +
            '<div class="hamburger-menu-icon">' +
            '<img src="images/menu.png" alt="menu icon">' +
            '</div>' +
            '</div>' +
            '<div class="hidden-xs-hidden-sm fontSize18 app-title  active">{{pagetitle}}</div>' +
            '<ul class="pull-right">' +
            '<li class="navbar-menu-item hidden-xs pull-left" ng-repeat="app in dockApplets">' +
            '<a class="dockicons"  ng-if="app.appletDisplayName != \'Menu\'" target="{{app.target}}">' +
            '<img id="{{app.name}}" ng-src="{{app.iconUrl}}" ng-style="{opacity : app.opacity}" >' +
            '</a>' +
            '</li>' +
            '<li class="pull-right">' +
            '<div class="dropdown user-profile">' +
            '<a class="dropdown-toggle displayTable cursorPointer active" type="button" data-toggle="dropdown" aria-expanded="false">' +
            'Name ' +
            '</a>' +
            '<ul class="dropdown-menu">' +
            '<li><a ng-href="/app/Profile306/Profile306" href="/app/Profile306/Profile306"> Your Profile</a></li>' +
            '<li><a ng-click="toggleStudio();"> Studio</a></li>' +
            '<li><a ng-href="/app/Settings2/Settings2" href="/app/Settings2/Settings2" class="active"> Settings &amp; Notifications</a></li>' +
            '<li><a ng-href="/setting" href="/setting"> Developer Settings</a></li>' +
            '<li><a ng-href="/logout" href="/logout"> Logout</a></li>' +
            '</ul>' +
            '</div>' +
            '</li>' +
            '</ul>' +
            '</div>' +
            '</div>' +
            '',

        //scope:{row:'=row', col:'=col', colindex:'=colindex'},

        link: function(scope, element, attr) {
            scope.openContentImport = function() {
                $("#contentImportModel").modal("show");
            }

        }
    };
}]).directive('contentarea', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: true,

        template: '<section class="content clearfix" style="padding:0px;margin:0px;" >' +
            '<div class="row1 clearfix">' +
            '<div class="col-xs-12" style="padding:0px;">' +
            '<div class="center-block">' +
            '<div id="centercontent" style="padding:0px;">' +
            '<div ng-transclude></div>' +
            '<div class="overlay"></div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</section>',
        link: function(scope, element, attr) {

            element.on("click", function(event) {
                //alert("clicked Row");

                // $(".cmssidebutton").removeClass("selected");
                //$(element.children()[0]).addClass("selected");
                //angular.element()

            });

        }
    };
}]).directive('unifyedmarque', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: true,
        scope: { "message": "=message" },
        template: '<div class="cmsmarquee" ng-show="message.length > 0"><div class="marquee" ng-bind-html="trustHtml(message)"></div></div>',
        link: function(scope, element, attr) {
            scope.trustHtml = function(html) {
                return $sce.trustAsHtml(html);
            }

        }
    };
}]).directive('unifyedrsswidget', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: true,
        scope: { "feedurl": "@feedurl", "maxentries": "@maxentries" },
        template: '<style>.activity-feed { ' +
            'padding: 15px;' +
            '}' +
            '.activity-feed .feed-item {' +
            'position: relative;' +
            'padding-bottom: 20px;' +
            'padding-left: 30px;' +
            'border-left: 2px solid #e4e8eb;' +
            '}' +
            '.activity-feed .feed-item:last-child {' +
            'border-color: transparent;' +
            '}' +
            '.activity-feed .feed-item:after {' +
            'content: "";' +
            'display: block;' +
            'position: absolute;' +
            'top: 0;' +
            'left: -6px;' +
            'width: 10px;' +
            'height: 10px;' +
            'border-radius: 6px;' +
            'background: #fff;' +
            'border: 1px solid #f37167;' +
            '}' +
            '.activity-feed .feed-item .date {' +
            'position: relative;' +
            'top: -5px;' +
            'color: #8c96a3;' +
            'text-transform: uppercase;' +
            'font-size: 13px;' +
            '}' +
            '.activity-feed .feed-item .text {' +
            'position: relative;' +
            'top: -3px;' +
            '}</style>' +
            '<div class="activity-feed">' +
            '<div ng-if="$index < maxentries || showall" class=" feed-item" ng-repeat="feed in feeds">' +
            '<div  class="date">{{feed.date | date }}</div>' +
            '<div  class="text">{{feed.title}}</div>' +
            '<div  style="font-size:10px;" ng-bind-html = "trustHtml(feed.content)"></div>' +
            '</div>' +
            '<div ng-if="maxentries < feeds.length"><a class="pull-right badge" ng-click="loadAll();">Show All</a></div>' +
            '</div>',
        link: function(scope, element, attr) {
            scope.showall = false;
            scope.loadAll = function() {
                scope.showall = true;
            }
            scope.trustHtml = function(html) {
                return $sce.trustAsHtml(html);
            }

            var rssreaderUrl = "https://kryptosda.kryptosmobile.com/kryptosds/rss/rssreader";
            var param = {
                "url": scope.feedurl
            };

            $http.post(rssreaderUrl, param, '').then(function(response) {
                var data = response.data;
                try {
                    for (var i = 0; i < data.feed.entries.length; i++) {
                        var date = data.feed.entries[i]['pubDate'] || data.feed.entries[i]['published'];
                        data.feed.entries[i]['date'] = new Date(date);
                    }
                } catch (e) {}
                scope.feeds = data.feed.entries;
            });
        }
    };
}]).directive('cmsimagepicker', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        replace: true,
        scope: { 'value': '=value', 'cssurl': '=cssurl', 'label': '@label' },
        template: '<div>' +
            '<style>.imggallery {position:absolute;}</style>' +
            '<span ng-click="closeGallery();" class="fa fa-times pull-right hide" style="margin-top:-20px;cursor:pointer;"></span>' +
            '<div class=" hide imggallery galleryContainer" >' +
            '<div ng-click="selectImage(img);" ng-repeat= "img in gallary" class="cmsImageGallery">' +
            '<img style="width:60px;height:60px;" ng-src="{{img.imageurl}}"/>' +
            '</div>' +
            '</div>' +
            '<div class="form-control">' +
            '<button ng-click="openImages();" class="openImageGallery">{{label}}</button>' +
            '</div>' +
            '<div class="thumbnail thumbnainImage" ng-if="value">' +
            '<span class="removeThumb cmsColor"  ng-click="removeBackground()"><i class="fa fa-times"></i></span>' +
            '<img ng-if="!cssurl" ng-src="{{value}}"/>' +
            '<div ng-if="cssurl" class="uploadedBackimage" style="background-image:{{value}};background-size:cover;"></div>' +
            '</div>' +
            '</div>',
        link: function(scope, element, attr) {
            scope.closeGallery = function() {
                $(element).find(".imggallery").addClass("hide");
            }
            scope.selectImage = function(img) {
                scope.value = img.imageurl;
                if (scope.cssurl) scope.value = "url(" + img.imageurl + ")";
                $(element).find(".imggallery").addClass("hide");
                $(element).find(".fa-times").addClass("hide");
            }
            scope.openImages = function() {
                $http.post('/content/myimages/' + $rootScope.site.tenantid, {}).then(function(response) {
                    scope.gallary = response.data;
                    $(element).find(".imggallery").removeClass("hide");
                    $(element).find(".fa-times").removeClass("hide");
                });
            }
            scope.removeBackground = function() {
                scope.value = false;
            };
            setTimeout(function() {
                $(".galleryContainer").mCustomScrollbar({ theme: "appletContainer" });
            }, 100);
        }
    };
}]).directive('cmsuploadimagepicker', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        transclude: false,
        replace: true,
        scope: { 'value': '=value', 'cssurl': '=cssurl', 'label': '@label' },
        template: '<div>' +
            '<style>.imggallery {position:absolute;}</style>' +
            '<span ng-click="closeGallery();" class="fa fa-times removeGallery pull-right hide" style="margin-top:-20px;cursor:pointer;"></span>' +
            '<div class=" hide imggallery galleryContainer" >' +
            '<div ng-click="selectImage(img);" ng-repeat= "img in gallary" class="cmsImageGallery">' +
            '<img style="width:55px;height:55px;" ng-src="{{img.imageurl}}"/>' +
            '<div class="colorDarkGrey fontSize12 marginTop5px">{{img.width}} X {{img.height}}</div>' +
            '</div>' +
            '<div ng-if="!gallary.length" class="noImage" style="text-align:center;padding:24px;margin:auto;">' +
            '<svg viewBox="0 0 512 512.00099" xmlns="http://www.w3.org/2000/svg" style="width:24px;height:auto;display:block;margin:0 auto;margin-bottom:10px;"><path d="m373.410156 0h-234.816406c-76.421875 0-138.59375 62.171875-138.59375 138.59375v234.8125c0 76.421875 62.171875 138.59375 138.59375 138.59375h234.816406c76.417969 0 138.589844-62.171875 138.589844-138.59375v-234.8125c0-76.421875-62.171875-138.59375-138.589844-138.59375zm108.574219 373.40625c0 59.871094-48.707031 108.578125-108.578125 108.578125h-234.8125c-59.871094 0-108.578125-48.707031-108.578125-108.578125v-1.316406l86.089844-79.25c2.4375-2.242188 6.257812-2.242188 8.695312-.003906l65.875 60.476562c7.640625 7.015625 17.941407 10.441406 28.269531 9.414062 10.324219-1.03125 19.742188-6.4375 25.847657-14.828124l116.25-159.847657c1.542969-2.117187 3.65625-2.558593 4.777343-2.632812 1.121094-.066407 3.273438.085937 5.078126 1.988281l111.082031 117.050781v68.949219zm0-112.550781-89.3125-94.109375c-7.472656-7.875-17.960937-11.984375-28.808594-11.277344-10.832031.707031-20.707031 6.148438-27.09375 14.929688l-116.253906 159.847656c-1.472656 2.023437-3.488281 2.507812-4.558594 2.613281-1.066406.105469-3.136719.035156-4.980469-1.660156l-65.875-60.472657c-13.839843-12.710937-35.503906-12.691406-49.324218.03125l-65.761719 60.535157v-192.699219c0-59.871094 48.707031-108.578125 108.578125-108.578125h234.816406c59.867188 0 108.574219 48.707031 108.574219 108.578125zm0 0"/><path d="m142.910156 86.734375c-29.082031 0-52.746094 23.664063-52.746094 52.75 0 29.082031 23.664063 52.746094 52.746094 52.746094 29.085938 0 52.746094-23.664063 52.746094-52.746094.003906-29.085937-23.660156-52.75-52.746094-52.75zm0 75.476563c-12.53125 0-22.730468-10.195313-22.730468-22.730469 0-12.53125 10.199218-22.730469 22.730468-22.730469 12.535156 0 22.730469 10.195312 22.730469 22.730469 0 12.535156-10.195313 22.730469-22.730469 22.730469zm0 0"/></svg>' +
            'No image found</div>' +
            '</div>' +
            '<div class=" cmsImageUpload">' +
            '<div ng-click="openImages();" class="openImageGallery text-center">' +
            '<img src="images/upload.svg" class="icon50" >' +
            '<span class="displayBlock marginTop10px">Upload Image</span>' +
            '</div>' +
            '</div>' +
            '<div class="thumbnail thumbnainImage" ng-if="value">' +
            '<img ng-if="!cssurl" ng-src="{{value}}"/>' +
            '<div ng-if="cssurl" class="uploadedBackimage" style="background-image:{{value}};background-size:cover;"></div>' +
            '</div>' +
            '<div class="selectedBackground">' +
            '<span class="removeThumb cmsColor pull-right" ng-if="value" ng-click="removeBackground()"><i class="fa fa-times"></i></span>' +
            '</div>' +
            '</div>',
        link: function(scope, element, attr) {
            scope.closeGallery = function() {
                $(element).find(".imggallery").addClass("hide");
                $(element).find(".removeGallery").addClass("hide");
            }
            scope.selectImage = function(img) {
                scope.value = img.imageurl;
                if (scope.cssurl) scope.value = "url(" + img.imageurl + ")";
                $(element).find(".imggallery").addClass("hide");
                $(element).find(".removeGallery").addClass("hide");
            }
            scope.openImages = function() {
                $http.post('/content/myimages/' + $rootScope.site.tenantid, {}).then(function(response) {
                    scope.gallary = response.data;
                    $(element).find(".imggallery").removeClass("hide");
                    $(element).find(".removeGallery").removeClass("hide");
                });
            }
            scope.removeBackground = function() {
                scope.value = false;
            };
            setTimeout(function() {
                $(".galleryContainer").mCustomScrollbar({ theme: "appletContainer" });
            }, 100);
        }
    };
}]).directive('clickcapture', ['$document', '$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($document, $routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'A',
        link: function(scope, element, attr) {
            $document.on('click', function(event) {
                if (!((event.target).id == 'dropdownMenu1')) {
                    $rootScope.toggle = true;
                    $('#tree1').find('.jqtree-element').removeClass('active');
                }
                $('.movingEdit').hide();
            });
        }
    };
}]).directive('quicklaunchmenu', ['$document', '$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($document, $routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'A',
        transclude: false,
        replace: true,
        template: '<a id="qlleftmenu"  class="menu-item group-menu cursorPointer" data-parent=".mCSB_container" tabindex="0" title="Quick Launch" data-target="#grpqlleftmenu" data-toggle="collapse" aria-expanded="true">' +
            '<img class="sidebar-menu-icon replaced-svg" src="cmsGallery/quick_lunch.svg"><span class="innertitle">Quick Launch</span>' +
            '</a>',
        link: function(scope, element, attr) {
            scope.trustHtml = function(html) {
                return $sce.trustAsHtml(html);
            }
            scope.user = $rootScope.user;
            var submenu = '<ul  class="list-unstyled collapse in" id="grpqlleftmenu" aria-expanded="true" style="">' +
                '<li ng-repeat="apps in applications |filter: {name: searchMenu}" >' +
                '<a id="{{apps.id}}" title="{{apps.name}}" class="menu-item" ng-href="{{apps.launchUrl}}"  target="_blank" ng-click="extenalClick(apps);">' +
                '<img class=" sidebar-menu-icon" alt="{{apps.name}} icon" ng-src="{{apps.imageUrl}}"><span ng-bind-html="trustHtml(apps.name)"></span>' +
                '</a>' +
                '</li>' +
                '</ul>';
            var data1 = $compile(submenu)(scope);
            $(data1).insertAfter($(element));

            var populateQLApps = function() {
                setTimeout(function() {
                    if ($rootScope.user) {
                        scope.qlssoUrl = $rootScope.user.qlssoUrl;
                        scope.qlTenantid = $rootScope.user.qlId;
                        var qlurl = scope.qlssoUrl + "/admin/secured/" + scope.qlTenantid + "/api/list/applications";
                        var url = "/websimulator/json?url=" + encodeURIComponent(qlurl);

                        $http({ method: 'GET', url: qlurl, withCredentials: true }).then(function(response) {
                            scope.applications = response.data.applicationDefinitions;
                            //console.log("AK...Response from QL : " + JSON.stringify(response.data));
                            //console.log(JSON.stringify(response.data));
                            setTimeout(function() {
                                //remove extra data from qlurl
                                $('#grpqlleftmenu li span').children('span').removeAttr('style');
                                $('#grpqlleftmenu li span').children('div').remove();
                            }, 500)
                        }, function(errorResponse) {
                            console.log('Error in populating QL Apps ' + errorResponse);
                        });
                    } else {
                        populateQLApps();
                    }
                }, 200);
            }
            populateQLApps();

            scope.printQldata = function(id) {
                var qlTitle = $('#' + id + ':last-child').text();
                $('#' + id).attr('title', qlTitle);
                $('#' + id).children('img').attr('alt', qlTitle);
            };

        }
    };
}]).directive('favappletmenu', ['$document', '$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($document, $routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'A',
        transclude: false,
        replace: true,

        template: '<a id=""  class="menu-item group-menu cursorPointer" data-parent=".mCSB_container" title="Favorite Menu" tabindex="0" data-target="#favleftmenu" data-toggle="collapse" aria-expanded="true">' +
            '<img class="sidebar-menu-icon replaced-svg" src="cmsGallery/Favorite.svg" alt="Favorite icon"><span class="innertitle">Favorite Menu</span>' +
            '</a>',
        link: function(scope, element, attr) {
            scope.trustHtml = function(html) {
                return $sce.trustAsHtml(html);
            }

            var submenu = '<ul  class="list-unstyled collapse in" id="favleftmenu" aria-expanded="true" style="">' +
                '<li ng-repeat="apps in appletList |filter: {name: searchMenu}">' +

                '<a id="{{apps.id}}" class="menu-item" ng-href="{{apps.url}}"  title="{{apps.name}}" target={{apps.target}}  ng-click="menuClick(apps);">' +
                '<span ng-bind-html="trustHtml(apps.name)"></span>' +
                '</a>' +
                '</li>' +
                '</ul>';
            var data1 = $compile(submenu)(scope);
            $(data1).insertAfter($(element));

        }
    };
}]).directive('rbacmenutree', ['$document', '$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', function($document, $routeParams, $compile, $http, $rootScope, $sce, $window, $location) {
    return {
        restrict: 'E',
        scope: { 'menudata': '=menudata' },
        link: function(scope, element, attr) {
            console.log("menudata in tree");
            console.log(scope.menudata);
            setTimeout(function() {
                $(element).jstree({
                    'core': {
                        'multiple': true,
                        'data': scope.menudata,
                        "check_callback": true
                    },
                    "ui": {
                        "select_multiple_modifier": "on"
                    },
                    "plugins": [
                        "contextmenu",
                        "dnd",
                        "massload",
                        "search",
                        "state",
                        "types",
                        "changed",
                        "conditionalselect",
                        "checkbox",
                        "crrm"
                    ],
                    "deleteItem": {
                        "label": "Delete component",
                        "action": function(obj) {
                            alert(obj);
                        }
                    }
                });
            }, 100);

        }
    };
}])

var unifyedActionIconDirectives = angular.module('UnifyedActionIcon', []);
unifyedActionIconDirectives.directive('searchIcon', function() {
    return {
        restrict: 'E',
        template: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M39.51,37.16l-9.62-9.62a16.84,16.84,0,1,0-2.36,2.36l9.62,9.61a1.67,1.67,0,0,0,2.36-2.35Zm-22.65-6.8a13.51,13.51,0,1,1,13.51-13.5A13.52,13.52,0,0,1,16.86,30.36Z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('addIcon', function() {
    return {
        restrict: 'E',
        template: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><g data-name="Layer 2"><g><path d="M17.14,0h5.72a.31.31,0,0,1,.07.2V16.7c0,.37,0,.37.37.37H39.6a.57.57,0,0,1,.4.07v5.72a.41.41,0,0,1-.3.07H23.3c-.37,0-.37,0-.37.37V39.6a.57.57,0,0,1-.07.4H17.14a.31.31,0,0,1-.07-.2V23.3c0-.37,0-.37-.37-.37H.4a.57.57,0,0,1-.4-.07V17.14a.31.31,0,0,1,.2-.07H16.7c.37,0,.37,0,.37-.37V.4A.57.57,0,0,1,17.14,0Z"/></g></g></svg>'
    };
});
unifyedActionIconDirectives.directive('crossIcon', function() {
    return {
        restrict: 'E',
        template: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><g data-name="Layer 2"><g data-name="cross"><path d="M17.65,15,29.45,3.2A1.87,1.87,0,1,0,26.8.55L15,12.35,3.2.55A1.87,1.87,0,0,0,.55,3.2L12.35,15,.55,26.8A1.88,1.88,0,0,0,1.88,30a1.83,1.83,0,0,0,1.32-.55L15,17.65l11.8,11.8a1.83,1.83,0,0,0,1.32.55,1.88,1.88,0,0,0,1.33-3.2Z"/></g></g></svg>'
    };
});
unifyedActionIconDirectives.directive('leftarrowIcon', function() {
    return {
        restrict: 'E',
        template: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21.83 40"><g data-name="Layer 2"><g><path d="M.57,18.83a2.08,2.08,0,0,0,0,2.86L18.33,39.38a2,2,0,0,0,1.43.62,2.09,2.09,0,0,0,1.5-.62,2,2,0,0,0,0-2.82L4.89,20.19,21.26,3.38A2,2,0,0,0,21.19.56a2,2,0,0,0-2.86.07Z"/></g></g></svg>'
    };
});
unifyedActionIconDirectives.directive('rightarrowIcon', function() {
    return {
        restrict: 'E',
        template: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21.83 40"><g data-name="Layer 2"><g><path d="M21.26,21.17a2.08,2.08,0,0,0,0-2.86L3.5.62A2,2,0,0,0,2.07,0,2.09,2.09,0,0,0,.57.62a2,2,0,0,0,0,2.82L16.94,19.81.57,36.62a2,2,0,0,0,.07,2.82,2,2,0,0,0,2.86-.07Z"/></g></g></svg>'
    };
});
unifyedActionIconDirectives.directive('deleteIcon', function() {
    return {
        restrict: 'E',
        template: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32.55 40"><g data-name="Layer 2"><g><path d="M29.74,4.71h-5.5V1.24A1.26,1.26,0,0,0,23,0a.17.17,0,0,0-.14.05.16.16,0,0,0-.1,0H9.61A1.24,1.24,0,0,0,8.33,1.24V4.71H2.81A2.73,2.73,0,0,0,0,7.44V11.9H2.44V37.3A2.69,2.69,0,0,0,5.22,40H27.33a2.71,2.71,0,0,0,2.81-2.7V11.9h2.41V7.44A2.73,2.73,0,0,0,29.74,4.71ZM10.88,2.48H21.67V4.71H10.88ZM27.56,37.3c0,.15-.07.22-.23.22H5.22c-.16,0-.23-.07-.23-.22V11.9H27.56ZM30,9.42H2.58v-2c0-.16.07-.25.23-.25H29.74c.17,0,.24.09.24.25v2Z"/><path d="M21,14.81h2.58v20.5H21Z"/><path d="M15,14.81h2.58v20.5H15Z"/><path d="M9.07,14.81h2.58v20.5H9.07Z"/></g></g></svg>'
    };
});
unifyedActionIconDirectives.directive('deletewasteIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 498.383 498.383" style="enable-background:new 0 0 498.383 498.383;" xml:space="preserve"><path d="M38.108,149.883h34v331.5c0,9.35,7.65,17,17,17h311.667c9.35,0,17-7.65,17-17v-331.5h42.5c9.35,0,17-7.65,17-17s-7.65-17-17-17h-81.033c-0.567-14.733-4.25-50.15-30.883-78.2C324.842,12.75,290.558,0,246.075,0s-77.917,12.75-99.167,37.967c-23.517,27.767-24.65,62.333-23.8,77.917h-85c-9.35,0-17,7.65-17,17S28.758,149.883,38.108,149.883z M172.408,59.783C186.858,42.5,211.508,34,245.792,34c34.567,0,60.633,9.067,77.35,26.633c18.417,19.267,21.25,45.05,21.817,55.25h-187.85C156.258,107.1,155.692,79.9,172.408,59.783z M383.775,149.883v314.5H106.108v-314.5H383.775z"/><path d="M191.108,416.217c9.35,0,17-7.65,17-17v-195.5c0-9.35-7.65-17-17-17c-9.35,0-17,7.65-17,17v195.5C174.108,408.567,181.758,416.217,191.108,416.217z"/><path d="M298.775,416.217c9.35,0,17-7.65,17-17v-195.5c0-9.35-7.65-17-17-17s-17,7.65-17,17v195.5C281.775,408.567,289.425,416.217,298.775,416.217z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('gearIcon', function() {
    return {
        restrict: 'E',
        template: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><g data-name="Layer 2"><g><path d="M39.62,16.8a2.65,2.65,0,0,0-1.8-1.08l-2.4-.4a.34.34,0,0,1-.31-.28,14.72,14.72,0,0,0-.92-2.21.36.36,0,0,1,0-.44c.5-.69,1-1.38,1.47-2.06a2.52,2.52,0,0,0-.19-3.19c-.87-.88-1.73-1.74-2.61-2.6a2.44,2.44,0,0,0-1.73-.71,2.67,2.67,0,0,0-1.6.57c-.66.48-1.33.95-2,1.42a.26.26,0,0,1-.32,0,13.39,13.39,0,0,0-2.38-1,.36.36,0,0,1-.28-.33c-.12-.77-.26-1.55-.38-2.32A2.75,2.75,0,0,0,23.75,1,2.35,2.35,0,0,0,22,0H17.78a2.74,2.74,0,0,0-.55.13A2.49,2.49,0,0,0,15.68,2c-.16.84-.29,1.69-.43,2.54a.41.41,0,0,1-.33.38,12.27,12.27,0,0,0-2.15.91.36.36,0,0,1-.45,0l-2-1.46a2.42,2.42,0,0,0-1.55-.5A2.51,2.51,0,0,0,7,4.66L4.55,7.08a2.53,2.53,0,0,0-.27,3.35c.51.7,1,1.4,1.5,2.1a.29.29,0,0,1,0,.34,14.65,14.65,0,0,0-.93,2.29.33.33,0,0,1-.29.25c-.83.14-1.67.27-2.5.42a2.47,2.47,0,0,0-1.7,1.09,2.19,2.19,0,0,0-.38,1v4.36a3.13,3.13,0,0,0,.16.6,2.55,2.55,0,0,0,2.05,1.5c.81.13,1.62.29,2.44.41a.32.32,0,0,1,.29.25,14.79,14.79,0,0,0,1,2.29.29.29,0,0,1,0,.33c-.48.67-1,1.36-1.45,2A2.56,2.56,0,0,0,4.65,33l2.44,2.44a2.5,2.5,0,0,0,1.19.68,2.45,2.45,0,0,0,2.05-.37c.72-.49,1.43-1,2.13-1.51a.36.36,0,0,1,.42-.06,15.5,15.5,0,0,0,2.19.9.33.33,0,0,1,.25.31c.14.85.28,1.69.43,2.54a2.51,2.51,0,0,0,.69,1.35,2.3,2.3,0,0,0,1.38.7H22.1c.14,0,.3,0,.44-.07a2.48,2.48,0,0,0,1.7-2c.16-.85.3-1.71.44-2.57a.32.32,0,0,1,.25-.31,14.79,14.79,0,0,0,2.25-.93.36.36,0,0,1,.42,0c.73.53,1.46,1.07,2.21,1.57a2.41,2.41,0,0,0,1.33.4A2.5,2.5,0,0,0,33,35.4c.82-.8,1.63-1.61,2.43-2.44a2.49,2.49,0,0,0,.29-3.27q-.7-1-1.44-2a.44.44,0,0,1-.06-.53,13.6,13.6,0,0,0,.91-2.2.33.33,0,0,1,.29-.25L38,24.25A2.5,2.5,0,0,0,39,23.78a2.34,2.34,0,0,0,1-1.64V17.86A2.13,2.13,0,0,0,39.62,16.8Zm-1.85,4.83c0,.26-.05.32-.29.36l-3.41.58a1.06,1.06,0,0,0-.91.83,13.69,13.69,0,0,1-1.44,3.47,1.11,1.11,0,0,0,.08,1.3l1.94,2.74c.18.25.17.29,0,.5l-2.3,2.3c-.21.21-.24.21-.48,0l-2.71-1.93a1.16,1.16,0,0,0-1.38-.07,13.65,13.65,0,0,1-3.4,1.41,1.07,1.07,0,0,0-.86.93c-.19,1.13-.39,2.27-.58,3.41,0,.2-.13.26-.32.26H18.33c-.19,0-.29-.06-.32-.26-.19-1.15-.38-2.29-.58-3.44a1.05,1.05,0,0,0-.81-.89,14.81,14.81,0,0,1-3.45-1.41,1.09,1.09,0,0,0-1.22.07l-2.79,2c-.25.17-.29.17-.5,0L6.35,31.47c-.07-.07-.15-.13-.14-.23a.33.33,0,0,1,.1-.23C7,30.1,7.59,29.2,8.24,28.3a1.17,1.17,0,0,0,.06-1.4,12.94,12.94,0,0,1-1.41-3.37,1.15,1.15,0,0,0-1-.88l-3.39-.58a.27.27,0,0,1-.26-.3c0-1.12,0-2.25,0-3.37,0-.2.09-.28.28-.31l3.31-.55a1.15,1.15,0,0,0,1-.92,13.07,13.07,0,0,1,1.38-3.37,1.14,1.14,0,0,0-.07-1.35l-2-2.76c-.16-.23-.16-.28,0-.48C7,7.88,7.78,7.11,8.56,6.34c.19-.19.24-.2.46,0l2.69,1.91a1.19,1.19,0,0,0,1.42.07,13.07,13.07,0,0,1,3.34-1.4,1.16,1.16,0,0,0,.91-1L18,2.53c0-.24.09-.28.34-.28h3.3c.26,0,.31,0,.35.3.18,1.12.37,2.24.56,3.35a1.08,1.08,0,0,0,.82.92A14.37,14.37,0,0,1,26.93,8.3a1.12,1.12,0,0,0,1.28-.09l2.68-1.93c.29-.21.3-.21.56,0L33.7,8.58c.22.22.22.27,0,.51-.64.91-1.29,1.81-1.94,2.72a1.16,1.16,0,0,0-.06,1.35,12.57,12.57,0,0,1,1.39,3.32,1.23,1.23,0,0,0,1.11,1c1.09.17,2.17.36,3.26.54a.28.28,0,0,1,.27.32C37.77,19.43,37.77,20.53,37.77,21.63Z"/><path d="M20,11.36A8.64,8.64,0,1,0,28.63,20,8.65,8.65,0,0,0,20,11.36Zm0,15A6.38,6.38,0,1,1,26.38,20,6.38,6.38,0,0,1,20,26.37Z"/></g></g></svg>'
    };
});
unifyedActionIconDirectives.directive('chatIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 477.6 477.6" style="enable-background:new 0 0 477.6 477.6;" xml:space="preserve"><path d="M407.583,70c-45.1-45.1-105-70-168.8-70s-123.7,24.9-168.8,70c-87,87-93.3,226-15.8,320.2c-10.7,21.9-23.3,36.5-37.6,43.5c-8.7,4.3-13.6,13.7-12.2,23.3c1.5,9.7,8.9,17.2,18.6,18.7c5.3,0.8,11,1.3,16.9,1.3l0,0c29.3,0,60.1-10.1,85.8-27.8c34.6,18.6,73.5,28.4,113.1,28.4c63.8,0,123.7-24.8,168.8-69.9s69.9-105.1,69.9-168.8S452.683,115.1,407.583,70z M388.483,388.5c-40,40-93.2,62-149.7,62c-37.8,0-74.9-10.1-107.2-29.1c-2.1-1.2-4.5-1.9-6.8-1.9c-2.9,0-5.9,1-8.3,2.8c-30.6,23.7-61.4,27.2-74.9,27.5c16.1-12,29.6-30.6,40.9-56.5c2.1-4.8,1.2-10.4-2.3-14.4c-74-83.6-70.1-211,8.9-290c40-40,93.2-62,149.7-62s109.7,22,149.7,62C471.083,171.6,471.083,306,388.483,388.5z"/><path d="M338.783,160h-200c-7.5,0-13.5,6-13.5,13.5s6,13.5,13.5,13.5h200c7.5,0,13.5-6,13.5-13.5S346.183,160,338.783,160z"/><path d="M338.783,225.3h-200c-7.5,0-13.5,6-13.5,13.5s6,13.5,13.5,13.5h200c7.5,0,13.5-6,13.5-13.5S346.183,225.3,338.783,225.3z"/><path d="M338.783,290.6h-200c-7.5,0-13.5,6-13.5,13.5s6,13.5,13.5,13.5h200c7.5,0,13.5-6,13.5-13.5S346.183,290.6,338.783,290.6z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('paperclipIcon', function() {
    return {
        restrict: 'E',
        template: '<svg viewBox="-25 0 510 510.25747"  xmlns="http://www.w3.org/2000/svg"><path d="m427.828125 314.484375-37.738281-37.738281-169.816406-169.808594c-31.296876-31.0625-81.816407-30.96875-112.996094.210938-31.179688 31.179687-31.273438 81.699218-.210938 112.996093l169.808594 169.859375c6.945312 6.949219 18.210938 6.949219 25.160156 0 6.945313-6.949218 6.945313-18.210937 0-25.160156l-169.808594-169.859375c-17.367187-17.367187-17.367187-45.519531 0-62.886719 17.367188-17.367187 45.519532-17.367187 62.886719 0l169.859375 169.808594 37.738282 37.734375c31.265624 31.277344 31.253906 81.976563-.019532 113.238281-31.277344 31.261719-81.972656 31.253906-113.238281-.023437l-31.441406-31.453125-176.101563-176.101563-12.582031-12.578125c-43.976563-45.351562-43.417969-117.601562 1.25-162.273437 44.671875-44.667969 116.921875-45.226563 162.273437-1.25l188.679688 188.683593c4.496094 4.492188 11.046875 6.246094 17.183594 4.601563 6.140625-1.644531 10.9375-6.4375 12.582031-12.578125s-.113281-12.6875-4.605469-17.183594l-188.679687-188.679687c-59.089844-58.820313-154.640625-58.710938-213.59375.246093-58.957031 58.953126-59.066407 154.503907-.246094 213.59375l188.679687 188.679688 31.488282 31.453125c45.410156 43.617187 117.375 42.890625 161.890625-1.640625 44.519531-44.527344 45.226562-116.492188 1.597656-161.890625zm0 0"/></svg>'
    };
});
unifyedActionIconDirectives.directive('sendIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 488.721 488.721" style="enable-background:new 0 0 488.721 488.721;" xml:space="preserve"><path d="M483.589,222.024c-5.022-10.369-13.394-18.741-23.762-23.762L73.522,11.331C48.074-0.998,17.451,9.638,5.122,35.086C-1.159,48.052-1.687,63.065,3.669,76.44l67.174,167.902L3.669,412.261c-10.463,26.341,2.409,56.177,28.75,66.639c5.956,2.366,12.303,3.595,18.712,3.624c7.754,0,15.408-1.75,22.391-5.12l386.304-186.982C485.276,278.096,495.915,247.473,483.589,222.024z M58.657,446.633c-8.484,4.107-18.691,0.559-22.798-7.925c-2.093-4.322-2.267-9.326-0.481-13.784l65.399-163.516h340.668L58.657,446.633z M100.778,227.275L35.379,63.759c-2.722-6.518-1.032-14.045,4.215-18.773c5.079-4.949,12.748-6.11,19.063-2.884l382.788,185.173H100.778z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('tickIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"  viewBox="0 0 448.8 448.8" style="enable-background:new 0 0 448.8 448.8;" xml:space="preserve"><polygon points="142.8,323.85 35.7,216.75 0,252.45 142.8,395.25 448.8,89.25 413.1,53.55 "/></svg>'
    };
});
unifyedActionIconDirectives.directive('tickdoubleIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 594.149 594.149" style="enable-background:new 0 0 594.149 594.149;" xml:space="preserve"><g><path d="M448.8,161.925l-35.7-35.7l-160.65,160.65l35.7,35.7L448.8,161.925z M555.899,126.225l-267.75,270.3l-107.1-107.1l-35.7,35.7l142.8,142.8l306-306L555.899,126.225z M0,325.125l142.8,142.8l35.7-35.7l-142.8-142.8L0,325.125z"/></g></svg>'
    };
});
unifyedActionIconDirectives.directive('photocameraIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 515.667 515.667" style="enable-background:new 0 0 515.667 515.667;" xml:space="preserve"><path d="M446.533,119.425l-54.117-0.283l-51.85-77.35c-3.117-4.817-8.5-7.933-14.167-7.933H186.717c-5.667,0-10.767,3.117-13.883,7.65l-53.55,77.633l-50.15,0.283C31.167,119.425,0,150.592,0,188.558v223.55c0,37.967,31.167,69.7,69.133,69.7h377.4c37.967,0,69.133-31.733,69.133-69.7v-223.55C515.667,150.592,484.5,119.425,446.533,119.425z M481.667,412.108c0,19.267-15.867,35.7-35.133,35.7h-377.4c-19.267,0-35.133-16.433-35.133-35.7v-223.55c0-19.267,15.867-35.133,35.133-35.133h59.217c5.667,0,10.767-3.117,13.883-7.65l53.55-77.633h121.55l51.567,77.067c3.117,4.533,8.5,7.65,13.883,7.65l63.467,0.567c19.267,0,35.133,15.867,35.133,35.133v223.55H481.667z"/><path d="M259.25,160.225c-66.583,0-120.417,54.117-120.417,120.417S192.95,401.058,259.25,401.058s120.417-54.117,120.417-120.417S325.55,160.225,259.25,160.225z M259.25,367.058c-47.6,0-86.417-38.817-86.417-86.417s38.817-86.417,86.417-86.417s86.417,38.817,86.417,86.417S306.85,367.058,259.25,367.058z"/><circle cx="420.467" cy="210.092" r="6.517"/><path d="M420.467,186.575c-13.033,0-23.517,10.483-23.517,23.517s10.483,23.517,23.517,23.517s23.517-10.483,23.517-23.517S433.5,186.575,420.467,186.575z M420.467,220.575c-5.95,0-10.483-4.817-10.483-10.483s4.817-10.483,10.483-10.483c5.667,0,10.483,4.817,10.483,10.483S426.417,220.575,420.467,220.575z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('photographyIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 464.667 464.667" style="enable-background:new 0 0 464.667 464.667;" xml:space="preserve"><path d="M464.667,53.833c0-9.35-7.65-17-17-17H17c-9.35,0-17,7.65-17,17v357c0,9.35,7.65,17,17,17h430.667c9.35,0,17-7.65,17-17V53.833z M430.667,70.833v217.6l-99.733-69.983c-6.8-4.533-15.583-3.967-21.25,1.7l-51.85,49.867L150.167,166.033c-3.4-3.4-8.217-5.1-13.033-4.817c-4.817,0.283-9.35,2.833-12.183,6.517l-90.667,116.45V70.833H430.667z M34,393.833v-54.4l105.967-135.717L245.933,306c6.517,6.233,17,6.233,23.517,0l53.267-51.567l107.95,75.65v63.75H34z"/><path d="M273.983,200.033c18.133,0,32.867-14.733,32.867-32.867S292.117,134.3,273.983,134.3s-32.867,14.733-32.867,32.867S255.85,200.033,273.983,200.033z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('userIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 563.43 563.43" style="enable-background:new 0 0 563.43 563.43;" xml:space="preserve"><path d="M280.79,314.559c83.266,0,150.803-67.538,150.803-150.803S364.055,13.415,280.79,13.415S129.987,80.953,129.987,163.756S197.524,314.559,280.79,314.559z M280.79,52.735c61.061,0,111.021,49.959,111.021,111.021S341.851,274.776,280.79,274.776s-111.021-49.959-111.021-111.021S219.728,52.735,280.79,52.735z"/><path d="M19.891,550.015h523.648c11.102,0,19.891-8.789,19.891-19.891c0-104.082-84.653-189.198-189.198-189.198H189.198C85.116,340.926,0,425.579,0,530.124C0,541.226,8.789,550.015,19.891,550.015z M189.198,380.708h185.034c75.864,0,138.313,56.436,148.028,129.524H41.17C50.884,437.607,113.334,380.708,189.198,380.708z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('adduserIcon', function() {
    return {
        restrict: 'E',
        template: '<svg viewBox="0 0 511.99981 511" xmlns="http://www.w3.org/2000/svg"> <path d="m296.464844 336.097656c-12.519532-8.734375-25.898438-15.851562-39.890625-21.289062 18.613281-16.917969 30.960937-40.617188 33.109375-67.148438 28.226562-27.503906 65.226562-42.582031 104.890625-42.582031 30.964843 0 60.695312 9.324219 85.984375 26.960937 9.0625 6.320313 21.523437 4.101563 27.84375-4.960937 6.316406-9.058594 4.097656-21.523437-4.960938-27.839844-12.519531-8.734375-25.902344-15.847656-39.894531-21.289062 20.539063-18.667969 33.453125-45.585938 33.453125-75.460938 0-56.238281-45.75-101.988281-101.988281-101.988281-56.234375 0-101.984375 45.75-101.984375 101.988281 0 29.753907 12.808594 56.574219 33.207031 75.234375-2.792969 1.074219-5.570313 2.210938-8.320313 3.421875-12.515624 5.507813-24.28125 12.28125-35.222656 20.234375-15.089844-37.488281-51.828125-64.019531-94.652344-64.019531-56.234374 0-101.988281 45.75-101.988281 101.984375 0 29.671875 12.738281 56.417969 33.027344 75.070312-54.246094 20.324219-98.230469 63.976563-116.136719 119.648438-5.9375 18.460938-2.792968 38.039062 8.628906 53.714844 11.421876 15.671875 29.09375 24.660156 48.484376 24.660156h173.980468c11.042969 0 19.996094-8.953125 19.996094-20 0-11.042969-8.953125-19.996094-19.996094-19.996094h-173.980468c-6.464844 0-12.355469-2.996094-16.164063-8.222656s-4.855469-11.753906-2.878906-17.910156c19.765625-61.453125 80.046875-104.371094 146.589843-104.371094 30.960938 0 60.695313 9.324219 85.984376 26.960938 9.058593 6.320312 21.523437 4.097656 27.84375-4.960938 6.316406-9.058594 4.097656-21.523438-4.964844-27.839844zm98.546875-295.601562c34.183593 0 61.992187 27.808594 61.992187 61.992187 0 34.179688-27.808594 61.992188-61.992187 61.992188-34.179688 0-61.992188-27.8125-61.992188-61.992188 0-34.183593 27.8125-61.992187 61.992188-61.992187zm-206.972657 136.855468c34.183594 0 61.992188 27.8125 61.992188 61.992188 0 34.183594-27.808594 61.992188-61.992188 61.992188-34.183593 0-61.992187-27.808594-61.992187-61.992188 0-34.179688 27.808594-61.992188 61.992187-61.992188zm323.960938 240.097657c0 11.042969-8.953125 19.996093-20 19.996093h-54.992188v54.992188c0 11.046875-8.953124 20-19.996093 20-11.046875 0-20-8.953125-20-20v-54.992188h-54.992188c-11.042969 0-19.996093-8.953124-19.996093-19.996093 0-11.046875 8.953124-20 19.996093-20h54.992188v-54.992188c0-11.042969 8.953125-19.996093 20-19.996093 11.042969 0 19.996093 8.953124 19.996093 19.996093v54.992188h54.992188c11.046875 0 20 8.953125 20 20zm0 0"></path></svg>'
    };
});
unifyedActionIconDirectives.directive('addgroupIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 508 508" style="enable-background:new 0 0 508 508;" xml:space="preserve"><path d="M108.6,143.45c-30.2,0-54.7,24.5-54.7,54.7c0,30.1,24.5,54.7,54.7,54.7c30.2,0,54.7-24.5,54.7-54.7C163.3,167.95,138.8,143.45,108.6,143.45z M108.6,224.65c-14.6,0-26.5-11.9-26.5-26.5c-0.1-14.6,11.8-26.5,26.5-26.5c14.6,0,26.5,11.9,26.5,26.5C135.1,212.75,123.2,224.65,108.6,224.65z"/><path d="M254,113.55c-31.3,0-56.8,25.5-56.8,56.8s25.5,56.8,56.8,56.8s56.8-25.5,56.8-56.8S285.3,113.55,254,113.55z M254,197.85c-15.2,0-27.5-12.4-27.5-27.5c0-15.1,12.3-27.5,27.5-27.5s27.5,12.4,27.5,27.5C281.5,185.55,269.1,197.85,254,197.85z"/><path d="M399.5,143.45c-30.2,0-54.7,24.5-54.7,54.7c0,30.1,24.5,54.7,54.7,54.7s54.7-24.5,54.7-54.7C454.2,167.95,429.7,143.45,399.5,143.45z M399.5,224.65c-14.6,0-26.5-11.9-26.5-26.5c0-14.6,11.9-26.5,26.5-26.5c14.6,0,26.5,11.9,26.5,26.5C426,212.75,414.1,224.65,399.5,224.65z"/><path d="M399.5,271.85c-17.7,0-35.2,4.4-50.8,12.7c-12.1-15.3-29.3-26.4-49.4-30.4c-29.7-5.9-60.7-5.9-90.4,0c-20,4-37.3,15.1-49.4,30.4c-15.6-8.3-33.1-12.7-50.8-12.7c-60,0-108.7,48.7-108.7,108.5c0,7.8,6.3,14.1,14.1,14.1h479.8c7.8,0,14.1-6.3,14.1-14.1C508,320.55,459.3,271.85,399.5,271.85z M140.8,338.15v28.2H29.5c6.7-37.6,39.6-66.2,79.1-66.2c13,0,25.7,3.3,37.1,9.2C142.5,318.35,140.8,328.05,140.8,338.15z M339,366.25H169v-28.2c0-27.4,19.1-51,45.3-56.3c26.1-5.2,53.4-5.2,79.5,0c26.2,5.3,45.2,29,45.2,56.4V366.25z M367.3,366.25v-28.2c0-10-1.7-19.7-4.9-28.8c11.4-6,24.2-9.2,37.2-9.2c39.5,0,72.4,28.6,79.1,66.2H367.3z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('folderIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 612 612" style="enable-background:new 0 0 612 612;" xml:space="preserve"><path d="M535.5,76.5H267.75c0-42.247-34.253-76.5-76.5-76.5H76.5C34.253,0,0,34.253,0,76.5v459C0,577.747,34.253,612,76.5,612h459c42.247,0,76.5-34.253,76.5-76.5V153C612,110.753,577.747,76.5,535.5,76.5z M573.75,535.5c0,21.133-17.117,38.25-38.25,38.25h-459c-21.133,0-38.25-17.136-38.25-38.25v-306h535.5V535.5z M573.75,191.25H38.25V76.5c0-21.133,17.117-38.25,38.25-38.25h114.75c21.133,0,38.25,17.117,38.25,38.25v38.25h306c21.133,0,38.25,17.136,38.25,38.25V191.25z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('unreadIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 612 612" style="enable-background:new 0 0 612 612;" xml:space="preserve"><path d="M400.669,211.331c-7.479-7.478-19.584-7.478-27.043,0L306,278.957l-67.626-67.626c-7.478-7.478-19.584-7.478-27.043,0c-7.478,7.478-7.478,19.584,0,27.043L278.957,306l-67.626,67.626c-7.478,7.478-7.478,19.584,0,27.043c7.478,7.478,19.584,7.478,27.043,0L306,333.043l67.626,67.606c7.478,7.479,19.584,7.479,27.043,0c7.478-7.478,7.478-19.584,0-27.043L333.043,306l67.626-67.607C408.128,230.915,408.128,218.809,400.669,211.331z M535.5,0h-459C34.253,0,0,34.253,0,76.5v459C0,577.747,34.253,612,76.5,612h459c42.247,0,76.5-34.253,76.5-76.5v-459C612,34.253,577.747,0,535.5,0z M573.75,535.5c0,21.133-17.117,38.25-38.25,38.25h-459c-21.133,0-38.25-17.117-38.25-38.25v-459c0-21.133,17.117-38.25,38.25-38.25h459c21.133,0,38.25,17.136,38.25,38.25V535.5z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('verticalthreedotIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 60 60" style="enable-background:new 0 0 60 60;" xml:space="preserve"> <path d="M30,16c4.411,0,8-3.589,8-8s-3.589-8-8-8s-8,3.589-8,8S25.589,16,30,16z"></path> <path d="M30,44c-4.411,0-8,3.589-8,8s3.589,8,8,8s8-3.589,8-8S34.411,44,30,44z"></path> <path d="M30,22c-4.411,0-8,3.589-8,8s3.589,8,8,8s8-3.589,8-8S34.411,22,30,22z"></path> </svg>'
    };
});
unifyedActionIconDirectives.directive('threedotIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 612 612" style="enable-background:new 0 0 612 612;" xml:space="preserve"> <path d="M55.636,250.364C24.907,250.364,0,275.27,0,306c0,30.73,24.907,55.636,55.636,55.636S111.273,336.73,111.273,306 C111.273,275.27,86.366,250.364,55.636,250.364z M315.273,250.364c-30.73,0-55.636,24.907-55.636,55.636 c0,30.729,24.907,55.636,55.636,55.636c30.729,0,55.636-24.905,55.636-55.636C370.909,275.27,346.003,250.364,315.273,250.364z M556.364,250.364c-30.73,0-55.636,24.907-55.636,55.636c0,30.729,24.906,55.636,55.636,55.636 C587.093,361.636,612,336.73,612,306C612,275.27,587.093,250.364,556.364,250.364z"></path> </svg>'
    };
});
unifyedActionIconDirectives.directive('setupIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><path d="M405.344,378.656c2.422,0,4.812,0.422,7.094,1.219l14.219,5.031V288H224v-75.578l-14.219,5.023c-2.289,0.812-4.68,1.219-7.117,1.219c-11.758,0-21.328-9.57-21.328-21.328c0-11.766,9.57-21.336,21.328-21.336c2.438,0,4.828,0.406,7.117,1.219L224,182.25V85.336H121.75l5.031,14.219c0.812,2.289,1.219,4.68,1.219,7.109C128,118.43,118.43,128,106.664,128c-11.758,0-21.328-9.57-21.328-21.336c0-2.43,0.406-4.82,1.219-7.109l5.023-14.219H0V288v21.344v75.562l14.219-5.031c2.289-0.797,4.68-1.219,7.117-1.219c11.758,0,21.328,9.578,21.328,21.344s-9.57,21.344-21.328,21.344c-2.438,0-4.828-0.422-7.117-1.219L0,415.094V512h202.664H224h202.656v-96.906l-14.219,5.031c-2.281,0.797-4.672,1.219-7.094,1.219C393.562,421.344,384,411.766,384,400S393.562,378.656,405.344,378.656z M21.336,106.664H64c0,23.531,19.141,42.672,42.664,42.672c23.531,0,42.672-19.141,42.672-42.672h53.328v48c-23.523,0-42.664,19.141-42.664,42.672C160,220.859,179.141,240,202.664,240v48h-75.578l5.031,14.219c0.805,2.281,1.219,4.688,1.219,7.125c0,11.75-9.57,21.312-21.336,21.312s-21.336-9.562-21.336-21.312c0-2.438,0.414-4.844,1.219-7.125L96.914,288H21.336V106.664z M216.891,420.125l-14.227-5.031v75.562H21.336v-48C44.859,442.656,64,423.531,64,400s-19.141-42.656-42.664-42.656v-48h24.883h23.117C69.336,332.859,88.477,352,112,352s42.664-19.141,42.664-42.656h48v75.562l14.227-5.031c2.281-0.797,4.68-1.219,7.109-1.219c11.766,0,21.336,9.578,21.336,21.344s-9.57,21.344-21.336,21.344C221.57,421.344,219.172,420.922,216.891,420.125z M405.344,442.656v48H224v-48c23.523,0,42.664-19.125,42.664-42.656S247.523,357.344,224,357.344v-48h181.344v48c-23.531,0-42.688,19.125-42.688,42.656S381.812,442.656,405.344,442.656z"></path><path d="M490.656,90.664c2.438,0,4.844,0.414,7.125,1.219L512,96.914V0H288v69.336c-23.523,0-42.664,19.141-42.664,42.664s19.141,42.664,42.664,42.664V224h69.344c0,23.523,19.125,42.664,42.656,42.664s42.656-19.141,42.656-42.664H512v-96.914l-14.219,5.031c-2.281,0.805-4.688,1.219-7.125,1.219c-11.75,0-21.312-9.57-21.312-21.336S478.906,90.664,490.656,90.664z M490.656,154.664v48h-75.562l5.031,14.227c0.797,2.281,1.219,4.68,1.219,7.109c0,11.766-9.578,21.336-21.344,21.336s-21.344-9.57-21.344-21.336c0-2.43,0.422-4.828,1.219-7.109l5.031-14.227h-75.562v-75.578l-14.234,5.031c-2.281,0.805-4.672,1.219-7.109,1.219c-11.766,0-21.336-9.57-21.336-21.336s9.57-21.336,21.336-21.336c2.438,0,4.828,0.414,7.109,1.219l14.234,5.031V21.336h181.312v48C467.141,69.336,448,88.477,448,112S467.141,154.664,490.656,154.664z"></path></svg>'
    };
});
unifyedActionIconDirectives.directive('uploadIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 471.2 471.2" xml:space="preserve"> <g> <g> <path d="M457.7,230.15c-7.5,0-13.5,6-13.5,13.5v122.8c0,33.4-27.2,60.5-60.5,60.5H87.5c-33.4,0-60.5-27.2-60.5-60.5v-124.8 c0-7.5-6-13.5-13.5-13.5s-13.5,6-13.5,13.5v124.8c0,48.3,39.3,87.5,87.5,87.5h296.2c48.3,0,87.5-39.3,87.5-87.5v-122.8 C471.2,236.25,465.2,230.15,457.7,230.15z"></path> <path d="M159.3,126.15l62.8-62.8v273.9c0,7.5,6,13.5,13.5,13.5s13.5-6,13.5-13.5V63.35l62.8,62.8c2.6,2.6,6.1,4,9.5,4 c3.5,0,6.9-1.3,9.5-4c5.3-5.3,5.3-13.8,0-19.1l-85.8-85.8c-2.5-2.5-6-4-9.5-4c-3.6,0-7,1.4-9.5,4l-85.8,85.8 c-5.3,5.3-5.3,13.8,0,19.1C145.5,131.35,154.1,131.35,159.3,126.15z"></path> </g> </g> </svg>'
    };
});
unifyedActionIconDirectives.directive('clockIcon', function() {
    return {
        restrict: 'E',
        template: '<svg xmlns="http://www.w3.org/2000/svg" width="41" height="48" viewBox="0 0 41 48"> <path data-name="Forma 1 copy" class="cls-1" d="M22.077,22.694V14.4a1.577,1.577,0,1,0-3.154,0v8.293A4.732,4.732,0,1,0,22.077,22.694ZM22.061,6.482c0-.027.015-0.051,0.015-0.08V3.2h6.308a1.589,1.589,0,0,0,1.577-1.6A1.589,1.589,0,0,0,28.385,0H12.614a1.589,1.589,0,0,0-1.577,1.6,1.589,1.589,0,0,0,1.577,1.6h6.308V6.4c0,0.029.014,0.053,0.016,0.08A20.8,20.8,0,0,0,20.5,47.995,20.8,20.8,0,0,0,22.061,6.482ZM20.5,44.8A17.6,17.6,0,0,1,20.5,9.6,17.6,17.6,0,0,1,20.5,44.8Z"/> <path data-name="Forma 1" d="M372.408-17.54L346.692,8.17a1.768,1.768,0,0,0-.5,1.135L346,22.395a1.549,1.549,0,0,0,.5,1.162,1.655,1.655,0,0,0,1.163.443h0.027l12.706-.111a1.608,1.608,0,0,0,1.163-.442L387.5-2.485a1.687,1.687,0,0,0,0-2.352l-12.734-12.73A1.716,1.716,0,0,0,372.408-17.54ZM359.675,20.624l-10.326.139,0.166-10.738L366.678-7.134,377.059,3.244Zm19.709-19.7L369.031-9.459l4.568-4.566L383.952-3.647Z"/> <path data-name="Forma 1" d="M-369.064-25.874a1.313,1.313,0,0,0,1.312-1.313v-5.249a1.312,1.312,0,0,0-1.312-1.312,1.313,1.313,0,0,0-1.312,1.312v5.249A1.313,1.313,0,0,0-369.064-25.874ZM-357.253-39h-31.5A5.249,5.249,0,0,0-394-33.749V-2.254a5.249,5.249,0,0,0,5.249,5.249h31.5A5.249,5.249,0,0,0-352-2.254V-33.749A5.249,5.249,0,0,0-357.253-39ZM-383.5-36.373h21v11.811a1.312,1.312,0,0,1-1.312,1.312h-18.372a1.313,1.313,0,0,1-1.312-1.312V-36.373Zm28.87,34.119A2.623,2.623,0,0,1-357.253.371h-31.5a2.624,2.624,0,0,1-2.625-2.625V-33.749a2.625,2.625,0,0,1,2.625-2.624h2.625V-23.25a2.625,2.625,0,0,0,2.624,2.625h21a2.626,2.626,0,0,0,2.625-2.625V-36.373h2.625a2.624,2.624,0,0,1,2.624,2.624V-2.254Z"/> <path d="M-393.949,190.012a2.028,2.028,0,0,0,1.457,1.832l15.385,4.627,0.566,10.549a1.046,1.046,0,0,0,.711.92,0.957,0.957,0,0,0,.342.06,1.043,1.043,0,0,0,.789-0.35l5.439-5.99,7.71,5.309a2.036,2.036,0,0,0,1.165.366,2.066,2.066,0,0,0,2.014-1.636l6.4-32.439a1.044,1.044,0,0,0-.36-1.006,1.044,1.044,0,0,0-1.062-.162l-39.321,15.917A2.056,2.056,0,0,0-393.949,190.012Zm19.361,14.392-0.351-6.655,3.94,2.71Zm14.169,0.809-14.032-9.663,19.678-18.933Zm3.487-29.431-19.455,18.72-15.369-4.618Z"/> <path data-name="Forma 1" d="M-352.875,105.25h-40.25a0.875,0.875,0,0,0-.875.875,0.875,0.875,0,0,0,.875.875h40.25a0.875,0.875,0,0,0,.875-0.875A0.875,0.875,0,0,0-352.875,105.25Zm-33.25-10.5h-5.25a0.875,0.875,0,0,0-.875.875v10.5a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875v-10.5A0.875,0.875,0,0,0-386.125,94.75ZM-387,105.25h-3.5V96.5h3.5v8.75h0ZM-375.625,86h-5.25a0.875,0.875,0,0,0-.875.875v19.25a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875V86.875A0.875,0.875,0,0,0-375.625,86Zm-0.875,19.25H-380V87.75h3.5v17.5h0Zm11.375-15.75h-5.25a0.875,0.875,0,0,0-.875.875v15.75a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875V90.375A0.875,0.875,0,0,0-365.125,89.5ZM-366,105.25h-3.5v-14h3.5v14ZM-354.625,79h-5.25a0.875,0.875,0,0,0-.875.875v26.25a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875V79.875A0.875,0.875,0,0,0-354.625,79Zm-0.875,26.25H-359V80.75h3.5v24.5Zm-33.25-24.5a3.5,3.5,0,0,0-3.5,3.5,3.5,3.5,0,0,0,3.5,3.5,3.5,3.5,0,0,0,3.5-3.5A3.5,3.5,0,0,0-388.75,80.75Zm0,5.25a1.752,1.752,0,0,1-1.75-1.75,1.752,1.752,0,0,1,1.75-1.75A1.752,1.752,0,0,1-387,84.25,1.752,1.752,0,0,1-388.75,86Zm10.5-14a3.5,3.5,0,0,0-3.5,3.5,3.5,3.5,0,0,0,3.5,3.5,3.5,3.5,0,0,0,3.5-3.5A3.5,3.5,0,0,0-378.25,72Zm0,5.25A1.752,1.752,0,0,1-380,75.5a1.752,1.752,0,0,1,1.75-1.75,1.752,1.752,0,0,1,1.75,1.75A1.752,1.752,0,0,1-378.25,77.25Zm10.5-1.75a3.5,3.5,0,0,0-3.5,3.5,3.5,3.5,0,0,0,3.5,3.5,3.5,3.5,0,0,0,3.5-3.5A3.5,3.5,0,0,0-367.75,75.5Zm0,5.25A1.752,1.752,0,0,1-369.5,79a1.752,1.752,0,0,1,1.75-1.75A1.752,1.752,0,0,1-366,79,1.752,1.752,0,0,1-367.75,80.75ZM-357.25,65a3.5,3.5,0,0,0-3.5,3.5,3.5,3.5,0,0,0,3.5,3.5,3.5,3.5,0,0,0,3.5-3.5A3.5,3.5,0,0,0-357.25,65Zm0,5.25A1.752,1.752,0,0,1-359,68.5a1.752,1.752,0,0,1,1.75-1.75,1.752,1.752,0,0,1,1.75,1.75A1.752,1.752,0,0,1-357.25,70.25Zm-1.236-.514a0.875,0.875,0,0,0-1.237,0l-6.79,6.79a0.876,0.876,0,0,0,0,1.237,0.881,0.881,0,0,0,.62.255,0.868,0.868,0,0,0,.617-0.255l6.79-6.79A0.874,0.874,0,0,0-358.486,69.735Zm-11.38,7.245-5.621-1.6a0.867,0.867,0,0,0-1.08.6,0.875,0.875,0,0,0,.6,1.082l5.621,1.6a0.87,0.87,0,0,0,.239.033,0.875,0.875,0,0,0,.842-0.635A0.875,0.875,0,0,0-369.866,76.98Zm-9.749-.39a0.876,0.876,0,0,0-1.229-.14l-6.6,5.261a0.874,0.874,0,0,0-.138,1.23,0.872,0.872,0,0,0,.684.329,0.882,0.882,0,0,0,.544-0.189l6.6-5.26A0.874,0.874,0,0,0-379.615,76.59Z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('calendarIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><path d="M452,40h-24V0h-40v40H124V0H84v40H60C26.916,40,0,66.916,0,100v352c0,33.084,26.916,60,60,60h392c33.084,0,60-26.916,60-60V100C512,66.916,485.084,40,452,40z M472,452c0,11.028-8.972,20-20,20H60c-11.028,0-20-8.972-20-20V188h432V452z M472,148H40v-48c0-11.028,8.972-20,20-20h24v40h40V80h264v40h40V80h24c11.028,0,20,8.972,20,20V148z"/><rect x="76" y="230" width="40" height="40"/><rect x="156" y="230" width="40" height="40"/><rect x="236" y="230" width="40" height="40"/><rect x="316" y="230" width="40" height="40"/><rect x="396" y="230" width="40" height="40"/><rect x="76" y="310" width="40" height="40"/><rect x="156" y="310" width="40" height="40"/><rect x="236" y="310" width="40" height="40"/><rect x="316" y="310" width="40" height="40"/><rect x="76" y="390" width="40" height="40"/><rect x="156" y="390" width="40" height="40"/><rect x="236" y="390" width="40" height="40"/><rect x="316" y="390" width="40" height="40"/><rect x="396" y="310" width="40" height="40"/></svg>'
    };
});
unifyedActionIconDirectives.directive('editIcon', function() {
    return {
        restrict: 'E',
        template: '<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42"> <path data-name="Forma 1 copy" d="M-323.923,40.694V32.4a1.589,1.589,0,0,0-1.577-1.6,1.589,1.589,0,0,0-1.577,1.6v8.293a4.778,4.778,0,0,0-3.154,4.5A4.765,4.765,0,0,0-325.5,50a4.765,4.765,0,0,0,4.731-4.8A4.778,4.778,0,0,0-323.923,40.694Zm-0.016-16.211c0-.027.016-0.051,0.016-0.08V21.2h6.308a1.589,1.589,0,0,0,1.577-1.6,1.589,1.589,0,0,0-1.577-1.6h-15.771a1.59,1.59,0,0,0-1.577,1.6,1.589,1.589,0,0,0,1.577,1.6h6.309v3.2c0,0.029.014,0.053,0.016,0.08A20.666,20.666,0,0,0-346,45.2a20.65,20.65,0,0,0,20.5,20.8A20.65,20.65,0,0,0-305,45.2,20.666,20.666,0,0,0-323.939,24.482ZM-325.5,62.8a17.474,17.474,0,0,1-17.348-17.6A17.474,17.474,0,0,1-325.5,27.6a17.474,17.474,0,0,1,17.348,17.6A17.474,17.474,0,0,1-325.5,62.8Z"/> <path data-name="Forma 1" d="M26.408,0.46L0.692,26.17a1.773,1.773,0,0,0-.5,1.135L0,40.395a1.549,1.549,0,0,0,.5,1.162A1.653,1.653,0,0,0,1.661,42H1.688l12.706-.111a1.608,1.608,0,0,0,1.163-.442L41.495,15.515a1.687,1.687,0,0,0,0-2.352L28.761,0.432A1.716,1.716,0,0,0,26.408.46ZM13.675,38.624l-10.325.139L3.515,28.024,20.678,10.866,31.059,21.244Zm19.709-19.7L23.031,8.541,27.6,3.975,37.952,14.353Z"/> <path data-name="Forma 1" d="M-715.064-7.874a1.313,1.313,0,0,0,1.312-1.313v-5.249a1.312,1.312,0,0,0-1.312-1.312,1.313,1.313,0,0,0-1.312,1.312v5.249A1.313,1.313,0,0,0-715.064-7.874ZM-703.253-21h-31.5A5.249,5.249,0,0,0-740-15.749V15.746A5.249,5.249,0,0,0-734.748,21h31.5A5.249,5.249,0,0,0-698,15.746V-15.749A5.249,5.249,0,0,0-703.253-21ZM-729.5-18.373h21V-6.562a1.312,1.312,0,0,1-1.312,1.312h-18.372A1.313,1.313,0,0,1-729.5-6.562V-18.373Zm28.87,34.119a2.623,2.623,0,0,1-2.624,2.625h-31.5a2.624,2.624,0,0,1-2.625-2.625V-15.749a2.625,2.625,0,0,1,2.625-2.624h2.625V-5.25A2.625,2.625,0,0,0-729.5-2.625h21a2.626,2.626,0,0,0,2.625-2.625V-18.373h2.625a2.624,2.624,0,0,1,2.624,2.624V15.746Z"/> <path d="M-739.949,208.012a2.028,2.028,0,0,0,1.457,1.832l15.385,4.627,0.566,10.549a1.046,1.046,0,0,0,.711.92,0.957,0.957,0,0,0,.342.06,1.043,1.043,0,0,0,.789-0.35l5.439-5.99,7.71,5.309a2.036,2.036,0,0,0,1.165.366,2.066,2.066,0,0,0,2.014-1.636l6.4-32.439a1.044,1.044,0,0,0-.36-1.006,1.044,1.044,0,0,0-1.062-.162l-39.321,15.917A2.056,2.056,0,0,0-739.949,208.012Zm19.361,14.392-0.351-6.655,3.94,2.71Zm14.169,0.809-14.032-9.663,19.678-18.933Zm3.487-29.431-19.455,18.72-15.369-4.618Z"/> <path data-name="Forma 1" d="M-698.875,123.25h-40.25a0.875,0.875,0,0,0-.875.875,0.875,0.875,0,0,0,.875.875h40.25a0.875,0.875,0,0,0,.875-0.875A0.875,0.875,0,0,0-698.875,123.25Zm-33.25-10.5h-5.25a0.875,0.875,0,0,0-.875.875v10.5a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875v-10.5A0.875,0.875,0,0,0-732.125,112.75ZM-733,123.25h-3.5V114.5h3.5v8.75h0ZM-721.625,104h-5.25a0.875,0.875,0,0,0-.875.875v19.25a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875v-19.25A0.875,0.875,0,0,0-721.625,104Zm-0.875,19.25H-726v-17.5h3.5v17.5h0Zm11.375-15.75h-5.25a0.875,0.875,0,0,0-.875.875v15.75a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875v-15.75A0.875,0.875,0,0,0-711.125,107.5ZM-712,123.25h-3.5v-14h3.5v14ZM-700.625,97h-5.25a0.875,0.875,0,0,0-.875.875v26.25a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875V97.875A0.875,0.875,0,0,0-700.625,97Zm-0.875,26.25H-705V98.75h3.5v24.5Zm-33.25-24.5a3.5,3.5,0,0,0-3.5,3.5,3.5,3.5,0,0,0,3.5,3.5,3.5,3.5,0,0,0,3.5-3.5A3.5,3.5,0,0,0-734.75,98.75Zm0,5.25a1.752,1.752,0,0,1-1.75-1.75,1.752,1.752,0,0,1,1.75-1.75,1.752,1.752,0,0,1,1.75,1.75A1.752,1.752,0,0,1-734.75,104Zm10.5-14a3.5,3.5,0,0,0-3.5,3.5,3.5,3.5,0,0,0,3.5,3.5,3.5,3.5,0,0,0,3.5-3.5A3.5,3.5,0,0,0-724.25,90Zm0,5.25A1.752,1.752,0,0,1-726,93.5a1.752,1.752,0,0,1,1.75-1.75,1.752,1.752,0,0,1,1.75,1.75A1.752,1.752,0,0,1-724.25,95.25Zm10.5-1.75a3.5,3.5,0,0,0-3.5,3.5,3.5,3.5,0,0,0,3.5,3.5,3.5,3.5,0,0,0,3.5-3.5A3.5,3.5,0,0,0-713.75,93.5Zm0,5.25A1.752,1.752,0,0,1-715.5,97a1.752,1.752,0,0,1,1.75-1.75A1.752,1.752,0,0,1-712,97,1.752,1.752,0,0,1-713.75,98.75ZM-703.25,83a3.5,3.5,0,0,0-3.5,3.5,3.5,3.5,0,0,0,3.5,3.5,3.5,3.5,0,0,0,3.5-3.5A3.5,3.5,0,0,0-703.25,83Zm0,5.25A1.752,1.752,0,0,1-705,86.5a1.752,1.752,0,0,1,1.75-1.75,1.752,1.752,0,0,1,1.75,1.75A1.752,1.752,0,0,1-703.25,88.25Zm-1.236-.514a0.875,0.875,0,0,0-1.237,0l-6.79,6.79a0.876,0.876,0,0,0,0,1.237,0.881,0.881,0,0,0,.62.255,0.868,0.868,0,0,0,.617-0.255l6.79-6.79A0.874,0.874,0,0,0-704.486,87.735Zm-11.38,7.245-5.621-1.6a0.867,0.867,0,0,0-1.08.6,0.875,0.875,0,0,0,.6,1.082l5.621,1.6a0.87,0.87,0,0,0,.239.033,0.875,0.875,0,0,0,.842-0.635A0.875,0.875,0,0,0-715.866,94.98Zm-9.749-.39a0.876,0.876,0,0,0-1.229-.14l-6.6,5.261a0.874,0.874,0,0,0-.138,1.23,0.873,0.873,0,0,0,.684.329,0.882,0.882,0,0,0,.544-0.189l6.6-5.261A0.874,0.874,0,0,0-725.615,94.59Z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('analyticsIcon', function() {
    return {
        restrict: 'E',
        template: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42"> <path data-name="Forma 1 copy" class="cls-1" d="M416.077-42.306V-50.6a1.589,1.589,0,0,0-1.577-1.6,1.589,1.589,0,0,0-1.577,1.6v8.293a4.778,4.778,0,0,0-3.154,4.5A4.765,4.765,0,0,0,414.5-33a4.765,4.765,0,0,0,4.731-4.8A4.778,4.778,0,0,0,416.077-42.306Zm-0.016-16.211c0-.027.016-0.051,0.016-0.08v-3.2h6.308a1.589,1.589,0,0,0,1.577-1.6,1.589,1.589,0,0,0-1.577-1.6H406.614a1.59,1.59,0,0,0-1.577,1.6,1.589,1.589,0,0,0,1.577,1.6h6.309v3.2c0,0.029.014,0.053,0.016,0.08A20.666,20.666,0,0,0,394-37.8a20.65,20.65,0,0,0,20.5,20.8A20.65,20.65,0,0,0,435-37.8,20.666,20.666,0,0,0,416.061-58.518ZM414.5-20.2a17.474,17.474,0,0,1-17.348-17.6A17.474,17.474,0,0,1,414.5-55.4a17.474,17.474,0,0,1,17.348,17.6A17.474,17.474,0,0,1,414.5-20.2Z"/> <path data-name="Forma 1" class="cls-2" d="M766.408-82.54L740.692-56.83a1.768,1.768,0,0,0-.5,1.135L740-42.605a1.549,1.549,0,0,0,.5,1.162,1.655,1.655,0,0,0,1.163.443h0.027l12.706-.111a1.608,1.608,0,0,0,1.163-.442L781.5-67.485a1.687,1.687,0,0,0,0-2.352L768.761-82.568A1.716,1.716,0,0,0,766.408-82.54ZM753.675-44.376l-10.326.139,0.166-10.738,17.163-17.159,10.381,10.378Zm19.709-19.7L763.031-74.459l4.568-4.567,10.353,10.378Z"/> <path data-name="Forma 1" d="M24.936-90.874a1.313,1.313,0,0,0,1.312-1.313v-5.249a1.313,1.313,0,0,0-1.312-1.312,1.313,1.313,0,0,0-1.312,1.312v5.249A1.313,1.313,0,0,0,24.936-90.874ZM36.747-104H5.252A5.249,5.249,0,0,0,0-98.749v31.495A5.249,5.249,0,0,0,5.252-62H36.747A5.249,5.249,0,0,0,42-67.254V-98.749A5.249,5.249,0,0,0,36.747-104ZM10.5-101.373h21v11.811a1.313,1.313,0,0,1-1.312,1.312H11.813A1.313,1.313,0,0,1,10.5-89.562v-11.811Zm28.87,34.119a2.624,2.624,0,0,1-2.624,2.625H5.252a2.624,2.624,0,0,1-2.625-2.625V-98.749a2.624,2.624,0,0,1,2.625-2.624H7.877V-88.25A2.625,2.625,0,0,0,10.5-85.625h21a2.625,2.625,0,0,0,2.625-2.625v-13.123h2.625a2.625,2.625,0,0,1,2.624,2.624v31.495Z"/> <path d="M0.051,125.012a2.027,2.027,0,0,0,1.456,1.832l15.386,4.627,0.565,10.549a1.048,1.048,0,0,0,.711.92,0.96,0.96,0,0,0,.343.06,1.041,1.041,0,0,0,.788-0.35l5.44-5.99,7.71,5.309a2.034,2.034,0,0,0,1.165.366,2.065,2.065,0,0,0,2.013-1.636l6.4-32.439a1.046,1.046,0,0,0-1.422-1.168L1.285,123.009A2.056,2.056,0,0,0,.051,125.012ZM19.412,139.4l-0.351-6.655L23,135.459Zm14.169,0.809L19.549,130.55l19.678-18.933Zm3.487-29.431L17.613,129.5,2.244,124.884Z"/> <path data-name="Forma 1" d="M41.125,40.25H0.875a0.875,0.875,0,0,0,0,1.75h40.25A0.875,0.875,0,1,0,41.125,40.25ZM7.875,29.75H2.625a0.875,0.875,0,0,0-.875.875v10.5A0.875,0.875,0,0,0,2.625,42h5.25a0.875,0.875,0,0,0,.875-0.875v-10.5A0.875,0.875,0,0,0,7.875,29.75ZM7,40.25H3.5V31.5H7v8.75H7ZM18.375,21h-5.25a0.875,0.875,0,0,0-.875.875v19.25a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875V21.875A0.875,0.875,0,0,0,18.375,21ZM17.5,40.25H14V22.75h3.5v17.5h0ZM28.875,24.5h-5.25a0.875,0.875,0,0,0-.875.875v15.75a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875V25.375A0.875,0.875,0,0,0,28.875,24.5ZM28,40.25H24.5v-14H28v14ZM39.375,14h-5.25a0.875,0.875,0,0,0-.875.875v26.25a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875V14.875A0.875,0.875,0,0,0,39.375,14ZM38.5,40.25H35V15.75h3.5v24.5ZM5.25,15.75a3.5,3.5,0,1,0,3.5,3.5A3.5,3.5,0,0,0,5.25,15.75Zm0,5.25A1.75,1.75,0,1,1,7,19.25,1.752,1.752,0,0,1,5.25,21ZM15.75,7a3.5,3.5,0,1,0,3.5,3.5A3.5,3.5,0,0,0,15.75,7Zm0,5.25A1.75,1.75,0,1,1,17.5,10.5,1.752,1.752,0,0,1,15.75,12.25Zm10.5-1.75a3.5,3.5,0,1,0,3.5,3.5A3.5,3.5,0,0,0,26.25,10.5Zm0,5.25A1.75,1.75,0,1,1,28,14,1.752,1.752,0,0,1,26.25,15.75ZM36.75,0a3.5,3.5,0,1,0,3.5,3.5A3.5,3.5,0,0,0,36.75,0Zm0,5.25A1.75,1.75,0,1,1,38.5,3.5,1.752,1.752,0,0,1,36.75,5.25Zm-1.235-.514a0.875,0.875,0,0,0-1.237,0l-6.79,6.79a0.875,0.875,0,0,0,1.237,1.237l6.79-6.79A0.876,0.876,0,0,0,35.514,4.735ZM24.134,11.98l-5.621-1.6a0.875,0.875,0,0,0-.48,1.684l5.621,1.6A0.875,0.875,0,1,0,24.134,11.98Zm-9.749-.39a0.876,0.876,0,0,0-1.229-.14l-6.6,5.261a0.875,0.875,0,0,0,1.09,1.37l6.6-5.26A0.874,0.874,0,0,0,14.385,11.59Z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('saveIcon', function() {
    return {
        restrict: 'E',
        template: '<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42"> <path data-name="Forma 1 copy" d="M416.077,61.694V53.4a1.577,1.577,0,1,0-3.154,0v8.293A4.731,4.731,0,1,0,416.077,61.694Zm-0.016-16.211c0-.027.016-0.051,0.016-0.08V42.2h6.308a1.6,1.6,0,0,0,0-3.2H406.614a1.6,1.6,0,0,0,0,3.2h6.309v3.2c0,0.029.014,0.053,0.016,0.08A20.5,20.5,0,1,0,416.061,45.482ZM414.5,83.8a17.6,17.6,0,1,1,17.348-17.6A17.474,17.474,0,0,1,414.5,83.8Z"/> <path data-name="Forma 1" d="M766.408,21.46L740.692,47.17a1.768,1.768,0,0,0-.5,1.135L740,61.395a1.549,1.549,0,0,0,.5,1.162,1.655,1.655,0,0,0,1.163.443h0.027l12.706-.111a1.608,1.608,0,0,0,1.163-.442L781.5,36.515a1.687,1.687,0,0,0,0-2.352l-12.734-12.73A1.716,1.716,0,0,0,766.408,21.46ZM753.675,59.624l-10.326.139,0.166-10.738,17.163-17.159,10.381,10.378Zm19.709-19.7L763.031,29.541l4.568-4.567,10.353,10.378Z"/> <path data-name="Forma 1" d="M24.936,13.126a1.313,1.313,0,0,0,1.312-1.313V6.564a1.312,1.312,0,0,0-2.624,0v5.249A1.313,1.313,0,0,0,24.936,13.126ZM36.747,0H5.252A5.249,5.249,0,0,0,0,5.251V36.746A5.249,5.249,0,0,0,5.252,42H36.747A5.249,5.249,0,0,0,42,36.746V5.251A5.249,5.249,0,0,0,36.747,0ZM10.5,2.627h21V14.438a1.313,1.313,0,0,1-1.312,1.312H11.813A1.313,1.313,0,0,1,10.5,14.438V2.627Zm28.87,34.119a2.624,2.624,0,0,1-2.624,2.625H5.252a2.624,2.624,0,0,1-2.625-2.625V5.251A2.624,2.624,0,0,1,5.252,2.627H7.877V15.75A2.625,2.625,0,0,0,10.5,18.375h21a2.625,2.625,0,0,0,2.625-2.625V2.627h2.625a2.624,2.624,0,0,1,2.624,2.624V36.746Z"/> <path d="M0.051,229.012a2.027,2.027,0,0,0,1.456,1.832l15.386,4.627,0.565,10.549a1.048,1.048,0,0,0,.711.92,0.96,0.96,0,0,0,.343.06,1.041,1.041,0,0,0,.788-0.35l5.44-5.99,7.71,5.309a2.034,2.034,0,0,0,1.165.366,2.065,2.065,0,0,0,2.013-1.636l6.4-32.439a1.046,1.046,0,0,0-1.422-1.168L1.285,227.009A2.056,2.056,0,0,0,.051,229.012ZM19.412,243.4l-0.351-6.655L23,239.459Zm14.169,0.809L19.549,234.55l19.678-18.933Zm3.487-29.431L17.613,233.5,2.244,228.884Z"/> <path data-name="Forma 1" d="M41.125,144.25H0.875a0.875,0.875,0,1,0,0,1.75h40.25A0.875,0.875,0,1,0,41.125,144.25Zm-33.25-10.5H2.625a0.875,0.875,0,0,0-.875.875v10.5a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875v-10.5A0.875,0.875,0,0,0,7.875,133.75ZM7,144.25H3.5V135.5H7v8.75H7ZM18.375,125h-5.25a0.875,0.875,0,0,0-.875.875v19.25a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875v-19.25A0.875,0.875,0,0,0,18.375,125ZM17.5,144.25H14v-17.5h3.5v17.5h0ZM28.875,128.5h-5.25a0.875,0.875,0,0,0-.875.875v15.75a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875v-15.75A0.875,0.875,0,0,0,28.875,128.5ZM28,144.25H24.5v-14H28v14ZM39.375,118h-5.25a0.875,0.875,0,0,0-.875.875v26.25a0.875,0.875,0,0,0,.875.875h5.25a0.875,0.875,0,0,0,.875-0.875v-26.25A0.875,0.875,0,0,0,39.375,118ZM38.5,144.25H35v-24.5h3.5v24.5ZM5.25,119.75a3.5,3.5,0,1,0,3.5,3.5A3.5,3.5,0,0,0,5.25,119.75Zm0,5.25A1.75,1.75,0,1,1,7,123.25,1.752,1.752,0,0,1,5.25,125Zm10.5-14a3.5,3.5,0,1,0,3.5,3.5A3.5,3.5,0,0,0,15.75,111Zm0,5.25a1.75,1.75,0,1,1,1.75-1.75A1.752,1.752,0,0,1,15.75,116.25Zm10.5-1.75a3.5,3.5,0,1,0,3.5,3.5A3.5,3.5,0,0,0,26.25,114.5Zm0,5.25A1.75,1.75,0,1,1,28,118,1.752,1.752,0,0,1,26.25,119.75ZM36.75,104a3.5,3.5,0,1,0,3.5,3.5A3.5,3.5,0,0,0,36.75,104Zm0,5.25a1.75,1.75,0,1,1,1.75-1.75A1.752,1.752,0,0,1,36.75,109.25Zm-1.235-.515a0.876,0.876,0,0,0-1.237,0l-6.79,6.79a0.875,0.875,0,0,0,1.237,1.237l6.79-6.789A0.876,0.876,0,0,0,35.514,108.735Zm-11.38,7.245-5.621-1.6a0.875,0.875,0,0,0-.48,1.684l5.621,1.6A0.875,0.875,0,0,0,24.134,115.98Zm-9.749-.39a0.876,0.876,0,0,0-1.229-.14l-6.6,5.261A0.875,0.875,0,0,0,7.1,122.27a0.883,0.883,0,0,0,.544-0.189l6.6-5.261A0.874,0.874,0,0,0,14.385,115.59Z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('groupIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 489.9 489.9" style="enable-background:new 0 0 489.9 489.9;" xml:space="preserve"><path d="M340.6,209.05v37.7c0,7.1,2.8,13.7,7.6,18.7v12.8c0,5.5,4.4,9.9,9.9,9.9s9.9-4.4,9.9-9.9v-17.4c0-3.3-1.7-6.4-4.4-8.2c-2-1.3-3.2-3.5-3.2-5.9v-37.7c0-13.2,10.8-24,24-24h8.1c13.2,0,24,10.8,24,24v37.7c0,2.4-1.2,4.6-3.2,5.9c-2.8,1.8-4.4,4.9-4.4,8.2v36.3c0,4.4,2.6,8.5,6.5,10.4c4.7,2.3,29.1,14.6,51.7,33.1c1.9,1.6,3,3.9,3,6.5v15.9h-69.4c-5.5,0-9.9,4.4-9.9,9.9s4.4,9.9,9.9,9.9H480c5.5,0,9.9-4.4,9.9-9.9v-25.8c0-8.5-3.7-16.4-10.3-21.8c-19.9-16.3-41.2-28.2-50.9-33.3v-26.7c4.8-5,7.6-11.6,7.6-18.7v-37.7c0-24.2-19.7-43.8-43.8-43.8h-8.1C360.3,165.25,340.6,184.85,340.6,209.05z"/><path d="M9.9,382.85h80.5c5.5,0,9.9-4.4,9.9-9.9s-4.4-9.9-9.9-9.9H19.8v-15.9c0-2.5,1.1-4.9,3-6.5c22.5-18.5,47-30.9,51.7-33.1c4-1.9,6.5-6,6.5-10.4v-36.3c0-3.3-1.7-6.4-4.4-8.2c-2-1.3-3.2-3.5-3.2-5.9v-37.7c0-13.2,10.8-24,24-24h8.1c13.2,0,24,10.8,24,24v37.7c0,2.4-1.2,4.6-3.2,5.9c-2.8,1.8-4.4,4.9-4.4,8.2v18.2c0,5.5,4.4,9.9,9.9,9.9s9.9-4.4,9.9-9.9v-13.6c4.8-5,7.6-11.6,7.6-18.7v-37.7c0-24.2-19.7-43.8-43.8-43.8h-8.1c-24.2,0-43.8,19.7-43.8,43.8v37.7c0,7.1,2.8,13.7,7.6,18.7v26.7c-9.8,5.1-31,16.9-50.9,33.3c-6.5,5.4-10.3,13.3-10.3,21.8v25.7C0,378.45,4.4,382.85,9.9,382.85z"/><path d="M304.4,209.55v-48.7c0-29.7-24.1-53.8-53.8-53.8h-10.5c-29.7,0-53.8,24.1-53.8,53.8v48.7c0,8.8,3.6,17,9.8,23v37.5c-11.7,6-40.3,21.6-67,43.6c-7.8,6.4-12.2,15.8-12.2,25.9v33.4c0,5.5,4.4,9.9,9.9,9.9h237c5.5,0,9.9-4.4,9.9-9.9v-33.4c0-10.1-4.4-19.5-12.2-25.9c-26.7-21.9-55.3-37.6-67-43.6v-37.5C300.8,226.65,304.4,218.35,304.4,209.55z M349,328.95c3.2,2.6,5,6.5,5,10.6v23.5H136.8v-23.5c0-4.1,1.8-8,5-10.6c29.4-24.2,61.3-40.3,67.4-43.3c4.1-2,6.8-6.3,6.8-10.8v-47c0-3.3-1.7-6.4-4.4-8.2c-3.4-2.3-5.4-6-5.4-10v-48.7c0-18.8,15.3-34,34-34h10.5c18.8,0,34,15.3,34,34v48.7c0,4-2,7.8-5.4,10c-2.8,1.8-4.4,4.9-4.4,8.2v47c0,4.6,2.7,8.8,6.8,10.8C287.7,288.65,319.6,304.85,349,328.95z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('undoIcon', function() {
    return {
        restrict: 'E',
        template: '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m154.667969 213.332031h-138.667969c-8.832031 0-16-7.167969-16-16v-138.664062c0-8.832031 7.167969-16 16-16s16 7.167969 16 16v122.664062h122.667969c8.832031 0 16 7.167969 16 16s-7.167969 16-16 16zm0 0"/><path d="m256 512c-68.351562 0-132.628906-26.644531-180.96875-75.03125-6.253906-6.25-6.253906-16.382812 0-22.632812 6.269531-6.273438 16.402344-6.230469 22.632812 0 42.304688 42.347656 98.515626 65.664062 158.335938 65.664062 123.519531 0 224-100.480469 224-224s-100.480469-224-224-224c-105.855469 0-200.257812 71.148438-224.449219 169.171875-2.132812 8.597656-10.75 13.824219-19.371093 11.714844-8.574219-2.132813-13.800782-10.796875-11.710938-19.371094 27.691406-112.148437 135.148438-193.515625 255.53125-193.515625 141.164062 0 256 114.835938 256 256s-114.835938 256-256 256zm0 0"/></svg>'
    };
});
unifyedActionIconDirectives.directive('redoIcon', function() {
    return {
        restrict: 'E',
        template: '<svg viewBox="0 0 512.02043 512" xmlns="http://www.w3.org/2000/svg"><path d="m496 213.34375h-138.667969c-8.832031 0-16-7.167969-16-16s7.167969-16 16-16h122.667969v-122.667969c0-8.832031 7.167969-16 16-16s16 7.167969 16 16v138.667969c0 8.832031-7.167969 16-16 16zm0 0"/><path d="m256 512.011719c-141.164062 0-256-114.839844-256-256 0-141.164063 114.835938-256.0000002 256-256.0000002 120.382812 0 227.839844 81.3632812 255.550781 193.4921872 2.113281 8.574219-3.113281 17.257813-11.710937 19.371094-8.574219 2.109375-17.257813-3.117188-19.371094-11.710938-24.210938-98.007812-118.613281-169.152343-224.46875-169.152343-123.519531 0-224 100.476562-224 224 0 123.519531 100.480469 224 224 224 59.820312 0 116.03125-23.320313 158.355469-65.644531 6.253906-6.25 16.386719-6.25 22.636719 0s6.25 16.382812 0 22.636718c-48.363282 48.359375-112.640626 75.007813-180.992188 75.007813zm0 0"/></svg>'
    };
});
unifyedActionIconDirectives.directive('mobileIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 480 480" style="enable-background:new 0 0 480 480;" xml:space="preserve"><path d="M328,0H152c-22.08,0.026-39.974,17.92-40,40v400c0.026,22.08,17.92,39.974,40,40h176c22.08-0.026,39.974-17.92,40-40V40C367.974,17.92,350.08,0.026,328,0z M208.208,464H152c-13.255,0-24-10.745-24-24v-24h80.208C197.267,430.13,197.267,449.87,208.208,464z M240,464c-13.255,0-24-10.745-24-24s10.745-24,24-24s24,10.745,24,24S253.255,464,240,464z M352,440c0,13.255-10.745,24-24,24h-56.208c10.941-14.13,10.941-33.87,0-48H352V440z M352,400H128V88h224V400z M352,72H128V40c0-13.255,10.745-24,24-24h176c13.255,0,24,10.745,24,24V72z"/><rect x="184" y="40" width="80" height="16"/><path d="M208,160h-32c-13.255,0-24,10.745-24,24v32c0,13.255,10.745,24,24,24h32c13.255,0,24-10.745,24-24v-32C232,170.745,221.255,160,208,160z M216,216c0,4.418-3.582,8-8,8h-32c-4.418,0-8-3.582-8-8v-32c0-4.418,3.582-8,8-8h32c4.418,0,8,3.582,8,8V216z"/><path d="M304,160h-32c-13.255,0-24,10.745-24,24v32c0,13.255,10.745,24,24,24h32c13.255,0,24-10.745,24-24v-32C328,170.745,317.255,160,304,160z M312,216c0,4.418-3.582,8-8,8h-32c-4.418,0-8-3.582-8-8v-32c0-4.418,3.582-8,8-8h32c4.418,0,8,3.582,8,8V216z"/><path d="M208,256h-32c-13.255,0-24,10.745-24,24v32c0,13.255,10.745,24,24,24h32c13.255,0,24-10.745,24-24v-32C232,266.745,221.255,256,208,256z M216,312c0,4.418-3.582,8-8,8h-32c-4.418,0-8-3.582-8-8v-32c0-4.418,3.582-8,8-8h32c4.418,0,8,3.582,8,8V312z"/><path d="M304,256h-32c-13.255,0-24,10.745-24,24v32c0,13.255,10.745,24,24,24h32c13.255,0,24-10.745,24-24v-32C328,266.745,317.255,256,304,256z M312,312c0,4.418-3.582,8-8,8h-32c-4.418,0-8-3.582-8-8v-32c0-4.418,3.582-8,8-8h32c4.418,0,8,3.582,8,8V312z"/><path d="M176,104h-24c-4.418,0-8,3.582-8,8v24c0,4.418,3.582,8,8,8s8-3.582,8-8v-16h16c4.418,0,8-3.582,8-8S180.418,104,176,104z"/><path d="M224,104h-16c-4.418,0-8,3.582-8,8s3.582,8,8,8h16c4.418,0,8-3.582,8-8S228.418,104,224,104z"/><rect x="280" y="40" width="16" height="16"/></svg>'
    };
});
unifyedActionIconDirectives.directive('deviceupdateIcon', function() {
    return {
        restrict: 'E',
        template: '<svg viewBox="0 0 128 128" width="512" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1"><path d="m57.529 81.11a1.75 1.75 0 0 0 .676-3.364 14.9 14.9 0 0 1 -2.858-25.9 13.179 13.179 0 0 1 1.809-1.116 1.239 1.239 0 0 0 .117-.054 14.735 14.735 0 0 1 2.893-1.093l-2.453 3.348a1.75 1.75 0 1 0 2.823 2.069l4.876-6.653.007-.013a1.668 1.668 0 0 0 .14-.238c.012-.023.026-.044.037-.067a1.98 1.98 0 0 0 .073-.213c.012-.04.028-.079.037-.119s.015-.109.022-.164a1.675 1.675 0 0 0 .019-.186c0-.01 0-.02 0-.03 0-.038-.009-.074-.011-.112a1.957 1.957 0 0 0 -.021-.2c-.008-.047-.022-.09-.034-.135a1.949 1.949 0 0 0 -.061-.2c-.015-.038-.035-.073-.052-.11a1.7 1.7 0 0 0 -.107-.2c-.018-.029-.04-.054-.06-.081a1.591 1.591 0 0 0 -.153-.186c-.022-.023-.046-.041-.069-.062a1.709 1.709 0 0 0 -.148-.133l-6.651-4.87a1.75 1.75 0 0 0 -2.068 2.823l3.131 2.3a18.264 18.264 0 0 0 -3.649 1.36c-.036.015-.071.031-.106.049a16.581 16.581 0 0 0 -2.4 1.461 18.4 18.4 0 0 0 3.561 31.958 1.754 1.754 0 0 0 .68.131z"/><path d="m71.146 47.026a1.75 1.75 0 1 0 -1.346 3.228 14.9 14.9 0 0 1 2.858 25.9 13.179 13.179 0 0 1 -1.809 1.116 1.239 1.239 0 0 0 -.117.054 14.735 14.735 0 0 1 -2.893 1.093l2.453-3.348a1.75 1.75 0 1 0 -2.828-2.069l-4.876 6.65-.007.013a1.668 1.668 0 0 0 -.14.238c-.012.023-.026.044-.037.067a1.908 1.908 0 0 0 -.073.213c-.012.04-.028.079-.037.119s-.015.109-.022.164a1.675 1.675 0 0 0 -.019.186v.03c0 .038.009.074.011.112a1.957 1.957 0 0 0 .021.2c.008.047.022.09.034.135a1.949 1.949 0 0 0 .061.2c.015.038.035.074.053.11a1.687 1.687 0 0 0 .106.2c.018.029.04.054.06.082a1.668 1.668 0 0 0 .153.185c.022.023.047.042.07.063a1.7 1.7 0 0 0 .147.132l6.654 4.876a1.75 1.75 0 0 0 2.068-2.823l-3.131-2.3a18.264 18.264 0 0 0 3.649-1.36c.036-.015.071-.031.106-.049a16.581 16.581 0 0 0 2.395-1.461 18.4 18.4 0 0 0 -3.561-31.958z"/><path d="m97.808 4.75h-67.616a7.759 7.759 0 0 0 -7.75 7.75v103a7.759 7.759 0 0 0 7.75 7.75h67.616a7.759 7.759 0 0 0 7.75-7.75v-103a7.759 7.759 0 0 0 -7.75-7.75zm-16.425 3.5-2.483 5.167h-29.8l-2.483-5.167zm20.675 107.25a4.255 4.255 0 0 1 -4.25 4.25h-67.616a4.255 4.255 0 0 1 -4.25-4.25v-103a4.255 4.255 0 0 1 4.25-4.25h12.541l3.69 7.675a1.749 1.749 0 0 0 1.577.992h32a1.749 1.749 0 0 0 1.577-.992l3.69-7.675h12.541a4.255 4.255 0 0 1 4.25 4.25z"/><path d="m74.75 106.583h-21.5a1.75 1.75 0 0 0 0 3.5h21.5a1.75 1.75 0 0 0 0-3.5z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('circlequestionIcon', function() {
    return {
        restrict: 'E',
        template: '<svg enable-background="new 0 0 551.13 551.13" viewBox="0 0 551.13 551.13" width="512" xmlns="http://www.w3.org/2000/svg"><path d="m275.565 0c-151.944 0-275.565 123.621-275.565 275.565s123.621 275.565 275.565 275.565 275.565-123.621 275.565-275.565-123.621-275.565-275.565-275.565zm0 516.685c-132.955 0-241.119-108.164-241.119-241.119s108.164-241.12 241.119-241.12 241.12 108.164 241.12 241.119-108.165 241.12-241.12 241.12z"/><path d="m258.342 413.348h34.446v34.446h-34.446z"/><path d="m275.565 103.337c-56.983 0-103.337 46.353-103.337 103.337v34.446h34.446v-34.446c0-37.995 30.897-68.891 68.891-68.891 37.995 0 68.891 30.897 68.891 68.891 0 25.851-13.775 50.188-35.943 63.492l-41.813 25.077c-5.18 3.112-8.359 8.712-8.359 14.767v68.891h34.446v-59.136l33.453-20.065c32.478-19.51 52.661-55.15 52.661-93.027.001-56.983-46.353-103.336-103.336-103.336z"/></svg>'
    };
});
unifyedActionIconDirectives.directive('gridIcon', function() {
    return {
        restrict: 'E',
        template: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 271.673 271.673" style="enable-background:new 0 0 271.673 271.673;" xml:space="preserve"><path d="M114.939,0H10.449C4.678,0,0,4.678,0,10.449v104.49c0,5.771,4.678,10.449,10.449,10.449h104.49c5.771,0,10.449-4.678,10.449-10.449V10.449C125.388,4.678,120.71,0,114.939,0z"/><path d="M261.224,0h-104.49c-5.771,0-10.449,4.678-10.449,10.449v104.49c0,5.771,4.678,10.449,10.449,10.449h104.49c5.771,0,10.449-4.678,10.449-10.449V10.449C271.673,4.678,266.995,0,261.224,0z"/><path d="M114.939,146.286H10.449C4.678,146.286,0,150.964,0,156.735v104.49c0,5.771,4.678,10.449,10.449,10.449h104.49c5.771,0,10.449-4.678,10.449-10.449v-104.49C125.388,150.964,120.71,146.286,114.939,146.286z"/><path d="M261.224,146.286h-104.49c-5.771,0-10.449,4.678-10.449,10.449v104.49c0,5.771,4.678,10.449,10.449,10.449h104.49c5.771,0,10.449-4.678,10.449-10.449v-104.49C271.673,150.964,266.995,146.286,261.224,146.286z"/></svg>'
    };
});

'use strict';

/* Services */
angular.module('MobileServices', []).factory('unifyedglobal', ['$http', '$rootScope', '$location','sqlLiteServ','$route', function($http, $rootScope, $location,sqlLiteServ,$route) {
    function fnGetClearpass(config, callBack) {
        //Skip clearpass API call if password exists
        if ($rootScope.password) {
            config.password = $rootScope.password;
            return callBack(null, config);
        }
        //var clearpassEndpoint =  "https://qlsso.quicklaunchsso.com/admin/secured/" + qlTenantid + "/api/getClearPass";
        var clearpassEndpoint = $rootScope.idpUrl + "/admin/secured/" + $rootScope.qlTenantId + "/api/getClearPass";
        console.log("clearpassurl= " + clearpassEndpoint);
        //var clearpassEndpoint = config.clearpassUrl;
        // call clearpass API
        $http({
            url: clearpassEndpoint,
            method: 'GET',
            withCredentials: true
        }).then(function successCallback(res) {
            if (!res.data) {
                console.error("Unkonw error: Clearpass API not executed properly. " + res);
                return callBack({
                    "err": "Couldnt get clearpass from QL"
                });
            }
            $rootScope.password = config.password = res.data;
            return callBack(null, config);
        }, function errorCallback(err) {
            console.error(err);
            return callBack(err);
        });
    }

    function handleWebAdapterAuthentication(erpconfig, callBack) {
        //For webadapter products, need external authentication to webadapter to get valid ticket for calling service APIs
        var url = erpconfig.middlewareServerUrl + "/services/authenticate/" + $rootScope.user.tenant + "/" + erpconfig.product;
        //Example: https://kryptosmw.kryptosmobile.com/webadapter2/services/authenticate/SWCC/colleague
        var data = {};
        if (window.device) {
            data = "username=" + erpconfig.username + "&password=" + erpconfig.password;
        } else {
            url = "/websimulator/json?url=" + url;
            data = {
                method: "POST",
                body: "username=" + erpconfig.username + "&password=" + erpconfig.password
            };
        }
        $.blockUI();
        $http.post(url, data).success(function(data, status, headers, config) {
            $.unblockUI();
            $rootScope.erpticket[erpconfig.product] = data.ticket;
            var serviceUrl = erpconfig.middlewareServerUrl + "/services/data/" + $rootScope.user.tenant + "/" + erpconfig.product + erpconfig.endpoint + "?ticket=" + $rootScope.erpticket[erpconfig.product];
            console.log("Service URL: " + serviceUrl);
            erpconfig.serviceUrl = serviceUrl;
            return callBack(null, erpconfig);
        }).error(function(data, status, headers, config) {
            $.unblockUI();
            $rootScope.erpticket[erpconfig.product] = "";
            return callBack(data);
        });
    }

    function handleBannerAuthentication(erpconfig, callBack) {
        //For banner products, need external authentication to webadapter to get valid ticket for calling service APIs
        var url = erpconfig.middlewareServerUrl + "/services/authenticate/login";
        //Example: https://kryptosda.kryptosmobile.com/kmwda1mwcc/services/authenticate/login
        var data = {};
        //if (window.device) {
        data = "username=" + erpconfig.username + "&password=" + erpconfig.password;
        //} else {
        //  url = "/websimulator/json?url=" + url;
        //  data = {
        //    method: "POST",
        //    body: "username=" + erpconfig.username + "&password=" + erpconfig.password
        //  };
        //}
        $.blockUI();
        $http.post(url, data).success(function(data, status, headers, config) {
            $.unblockUI();
            $rootScope.erpticket[erpconfig.product] = data.ticket;
            var serviceUrl = erpconfig.middlewareServerUrl + "/services/student" + erpconfig.endpoint + "?ticket=" + $rootScope.erpticket[erpconfig.product];
            console.log("Service URL: " + serviceUrl);
            erpconfig.serviceUrl = serviceUrl;
            return callBack(null, erpconfig);
        }).error(function(data, status, headers, config) {
            $.unblockUI();
            $rootScope.erpticket[erpconfig.product] = "";
            return callBack(data);
        });
    }

    function handleBannerOAuthAuthentication(config, callBack) {
        //For Banner, no need of external authentication, API service call itself would validate and get the service data.
        $rootScope.erpticket[config.product] = $rootScope.user.accessToken;
        var serviceUrl = config.middlewareServerUrl + "/services/student/" + config.endpoint + "?ticket=" + $rootScope.erpticket[config.product];
        console.log("Service URL: " + serviceUrl);
        config.serviceUrl = serviceUrl;
        return callBack(null, config);
    }

    function setupDemoServiceEndpoints(config, callBack) {
        if (config.product.toLowerCase() == "banner") {
            config.serviceUrl = config.middlewareServerUrl + "/services/student" + config.endpoint;
        } else if (config.product.toLowerCase() == "ps") {
            config.serviceUrl = config.middlewareServerUrl + "/services/data/" + $rootScope.user.tenant + "/" + config.product + config.endpoint;
        }
        return callBack(null, config);
    }

    function setupServiceEndpoints(config, callBack) {
        if (!config.middlewareServerUrl) {
            console.error("Middleware server URL not mentioned for the applet !");
        }
        if (config.product && config.product.toLowerCase() == "banner") {
            config.serviceUrl = config.middlewareServerUrl + "/services/student" + config.endpoint + "?ticket=" + $rootScope.erpticket[config.product];
        } else if (config.product && config.product.toLowerCase() == "ps") {
            if (config.demoMode) {
                config.serviceUrl = config.middlewareServerUrl + "/" + config.product.toLowerCase() + config.endpoint + "?ticket=" + $rootScope.erpticket[config.product];
            } else {
                config.serviceUrl = config.middlewareServerUrl + "/services/data/" + $rootScope.user.tenant + "/" + config.product + config.endpoint + "?ticket=" + $rootScope.erpticket[config.product];
            }
        } else if (!config.product) {
            console.error("Product name not mentioned for the applet !");
        }
        return callBack(null, config);
    }

    function erpConnect(config, callBack) {
        config.username = $rootScope.username;
        // Remove the query parameters in case of demo mode
        if (config.demoMode) {
            var tempParamExists = config.endpoint.indexOf("=");
            var tempUrl = "";
            if (tempParamExists > 0) {
                config.endpoint = config.endpoint.substring(0, config.endpoint.lastIndexOf("/"));
            }
            setupDemoServiceEndpoints(config, function(err, config) {
                return callBack(err, config);
            });
        } else {
            if (config.product.toLowerCase() == "banner") {
                if (config.tokenType == "oauth") {
                    handleBannerOAuthAuthentication(config, function(err, config) {
                        return callBack(err, config);
                    });
                } else {
                    config.clearpassUrl = $rootScope.qlClearPassUrl;
                    fnGetClearpass(config, function(err, config) {
                        if (!err) {
                            handleBannerAuthentication(config, function(err, config) {
                                return callBack(err, config);
                            });
                        }
                        return callBack(err, config);
                    });
                }
            } else if (config.product.toLowerCase() == "ps") {
                config.clearpassUrl = $rootScope.qlClearPassUrl;
                fnGetClearpass(config, function(err, config) {
                    if (!err) {
                        handleWebAdapterAuthentication(config, function(err, config) {
                            return callBack(err, config);
                        });
                    }
                    return callBack(err, config);
                });
            }
        }
    }

    function executeServiceAPI(erpconfig, method, counter, callBack) {
        setupServiceEndpoints(erpconfig, function(err, erpconfig) {
            var serviceUrl = erpconfig.serviceUrl;
            console.log(serviceUrl);
            var url = "";
            var proxyMethod = method;
            var proxyData = {};
            if (window.device) {
                url = serviceUrl;
            } else {
                url = "/websimulator/json?url=" + encodeURIComponent(serviceUrl);
                proxyMethod = "POST";
                proxyData = {
                    method: method
                }
                if (method == "POST") {
                    proxyData = {
                        method: "POST",
                        body: erpconfig.postdata
                    }
                    if (erpconfig.demoMode) {
                        proxyData = "";
                        url = serviceUrl;
                    }
                }
            }
            counter++;
            $http({
                method: proxyMethod,
                url: url,
                data: proxyData
            }).success(function(data, status, headers, config) {
                console.log("RESULTS:");
                console.log(data);
                callBack(erpconfig, data, status, headers, config);
            }).error(function(data, status, headers, config) {
                if (status == 403 && counter <= 2) {
                    // ticket expired, need to reauthenticate
                    erpConnect(erpconfig, function(err, erpconfig) {
                        if (err) {
                            $.unblockUI();
                            console.log("Couldnt execute API due to errors.");
                            return callback();
                        }
                        return executeServiceAPI(erpconfig, method, counter, callBack);
                    });
                } else {
                    return callBack(erpconfig, data, status, headers, config);
                }
            });
        });

    }

    function validateConfigObject(config) {
        if (!config.middlewareServerUrl) {
            console.error("Middleware Server URL not mentioned for applet !");
            return false;
        }
        if (!config.product) {
            console.error("Product name not mentioned for applet !");
            return false;
        }
        if (!config.endpoint) {
            console.error("API endpoint not mentioned !");
            return true;
        }
        return true;
    }

    $rootScope.postAPI = function(config, endpoint, postdata, callback) {
        config.endpoint = endpoint;
        config.postdata = postdata;
        config.demoMode = (config.middlewareServerUrl == "https://kryptosda.kryptosmobile.com/kryptosds") ? true : false;
        if (!validateConfigObject(config)) {
            return callback();
        }
        $.blockUI();
        if ($rootScope.demoMode || (!$rootScope.demoMode && $rootScope.erpticket && $rootScope.erpticket[config.product])) {
            executeServiceAPI(config, "POST", 1, function(erpconfig, data, status, headers, config) {
                $.unblockUI();
                return callback(data, status, headers, config);
            });
        } else {
            if (!$rootScope.erpticket) {
                $rootScope.erpticket = {};
            }
            erpConnect(config, function(err, config) {
                if (err) {
                    console.log("Couldnt execute API due to errors.");
                    $.unblockUI();
                    return callback();
                }
                executeServiceAPI(config, "POST", 1, function(erpconfig, data, status, headers, config) {
                    $.unblockUI();
                    return callback(data, status, headers, config);
                });
            });
        }
    };


    $rootScope.getAPI = function(config, endpoint, callback) {
        config.endpoint = endpoint;
        config.demoMode = (config.middlewareServerUrl == "https://kryptosda.kryptosmobile.com/kryptosds") ? true : false;
        if (!validateConfigObject(config)) {
            return callback();
        }
        $.blockUI();
        if ($rootScope.demoMode || (!$rootScope.demoMode && $rootScope.erpticket && $rootScope.erpticket[config.product])) {
            executeServiceAPI(config, "GET", 1, function(erpconfig, data, status, headers, config) {
                $.unblockUI();
                return callback(data, status, headers, config);
            });
        } else {
            if (!$rootScope.erpticket) {
                $rootScope.erpticket = {};
            }
            erpConnect(config, function(err, config) {
                if (err) {
                    console.error("Couldnt execute API due to errors.");
                    $.unblockUI();
                    return callback();
                }
                executeServiceAPI(config, "POST", 1, function(erpconfig, data, status, headers, config) {
                    $.unblockUI();
                    return callback(data, status, headers, config);
                });
            });
        }
    };
    /******************************************************************************************************************************************/

    $rootScope.userNameIntialsColor = ['#36B37E', '#FF5630', '#FFAB00', '#8d99ae', '#50939b', '#de4d78', '#bc59cf', '#0f5772', '#7d7e7d', '#4fb443', '#596fef', '#00b8ff'];
    $rootScope.randomBackground = function(fn, ln) {
        var first = fn;
        var last = ln;
        var name = first + last;
        var sum = 0;
        for (var i = 0; i < name.length; i++) {
            sum += name.charCodeAt(i);
        }
        return $rootScope.userNameIntialsColor[sum % $rootScope.userNameIntialsColor.length];
    }

    $rootScope.userRolestoString = function(a) {
        for (var i = 0; i < a.length; i++) {
            a[i] = a[i].charAt(0).toUpperCase() + a[i].slice(1);
        }
        return a.toString().replace(/,/g, ', ');
    }

    $rootScope.inAppNotificationHandler = function(push) {
        push.on('notification', function(data) {
            if (data.additionalData.foreground) {
                //navigator.notification.alert(data.message,null,data.title,'Ok');
                if (data.additionalData.picture || data.additionalData.image) {
                    if (device.platform == "Android") {
                        $('#notImg').attr('src', data.additionalData.picture);
                    } else {
                        $('#notImg').attr('src', data.additionalData.image);
                    }
                    $('#notImg').show();
                } else {
                    //$('#notImg').attr('src', '');
                    $('#notImg').hide();
                }
                $('#notTitle').html(data.title);
                $('#notDesc').html(data.message);
                $('.modale').css('display', 'block');
                setTimeout(function() {
                    $('.modale').addClass('opened');
                }, 1000)
            } else {
                if (data.title == 'BlueLight Tracking Alert') {

                    var mdata = data.message;
                    var href = "/app/BlueLightEmergency32/BlueLightEmergency32";

                    $location.path(href).search({
                        email: data.trackEmail
                    });

                }
            }
        });
    }

    /*****************Services for unifyed applets (whatsUp, messaging etc) *********************************/
    $rootScope.isEmpty = function(obj) {
        return (Object.keys(obj).length === 0);
    };
    $rootScope.callAPI = function(url, method, data, callback) {
        try {
            if (!$rootScope.isblocking) $.blockUI();
            var apiEndPoint = $rootScope.GatewayUrl + url;
            var callAPISiteId = $rootScope.user.siteId;
            if (window.globalsiteid) callAPISiteId = window.globalsiteid;
            var req = {
                "method": method,
                "url": apiEndPoint,
                "headers": {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + $rootScope.user.accessToken,
                    'X-TENANT-ID': $rootScope.user.tenant,
                    'X-TENANT-DOMAIN': $rootScope.user.tenantdomain,
                    'principal-user': $rootScope.user.email,
                    'site-id': callAPISiteId
                },
                data: data,
                json: true
            };

            console.log('apiEndPoint', req);
            $http(req).then(function successCallback(res) {
                if (!$rootScope.isblocking) {
                    $.unblockUI();
                }

                return callback(res);
            }, function errorCallback(err) {
                console.log(JSON.stringify(err));
                if (!$rootScope.isblocking) {
                    $.unblockUI();
                }
                //return callback();
                /* Commented the code below since token refersh is not working */
                if (err.status == 404) {
                    return callback(null);
                } else if (err.status == 0 || err.status == 401 || err.status == -1) {
                    $rootScope.refreshToken(url, method, data, callback);
                    //return callback();
                } else {
                    $.jStorage.deleteKey("user");
                    $.jStorage.deleteKey("token");
                    $.jStorage.deleteKey("unifyedusername");
                    $.jStorage.deleteKey("unifyedpassword");
                    $rootScope.refreshHandler();
                }
            });
        } catch (e) {
            if (!$rootScope.isblocking) {
                $.unblockUI();
            }
            console.log(e)
            return callback();
        }
    }
    $rootScope.resetApp = function(){
      $rootScope.user = null;
      $rootScope.loggedIn = false;
      let data = $rootScope.tenantDetails;
      $rootScope.user = $.isEmptyObject($rootScope.user) ? {} : $rootScope.user;
      $rootScope.brandingUrl = data.logoUrl;
      $rootScope.user.tenant = $rootScope.tenantId;
      $rootScope.user.tenantdomain = data['idpTenantDomain'];
      $rootScope.GatewayUrl = 'https://' + data['domain'] + data['gatewaypath'];
      $rootScope.user.domain = data['domain'];
      $rootScope.user.gatewaypath = data['gatewaypath'];
      $rootScope.user.admins = data['admins'] || [];
      $rootScope.user.oauthUserInfoUrl = data['oauthUserInfoUrl'];
      $rootScope.user.products = data['products'];
      $rootScope.user.qlId = data['qlTenantid'];
      $rootScope.user.siteId = data['siteId'];
      $rootScope.user.backgroundImg = data['backgroundImg'];
      $location.path("/app/SignIn279/SignIn279");
      $route.reload();
    }

    $rootScope.refreshHandler = function() {
        if($rootScope.appDetails.guestApp){
          let url;
          if(window.device){
              url = $rootScope.GatewayUrl + '/unifyedrbac/rbac/open/menus'
          }else{
              url = $rootScope.getBaseUrl('/unifyd-gateway/api/unifyedrbac/rbac/open/menus',$rootScope.environment);
          }
          var req = {
              headers: {
                  'Content-Type': 'application/json',
                  'X-TENANT-ID': $rootScope.tenantId,
                  'site-id': $rootScope.user.siteId
              },
              url: url,
              method: 'POST',
              body: [{
                  "roles": ["Public"],
                  "product": "global"
              }],
              json: true
          };
          $rootScope.callOpenAPI(req, function(err, res) {
              var menudata = res;
              $rootScope.dockApplets = menudata.docks;
              menudata.menus = $rootScope.removeDuplicates(menudata);
              $rootScope.rbacnavmenu = $rootScope.buildMenuTree(menudata.menus);
              $rootScope.rbacallmenus = menudata.menus;
              angular.forEach(menudata.menus, function(value, key) {
                  if (value.id == menudata.landingPages[0].pageId) {
                      $rootScope.landingPage = value;
                  }
              });
              /*trans = [];
              trans.push({
                  q: `CREATE TABLE IF NOT EXISTS rbacPublicDetails (info,tenantId)`,
                  d: null
              });
              trans.push({
                  q: `INSERT INTO rbacPublicDetails (info,tenantId) VALUES (?,?)`,
                  d: [JSON.stringify(res), $rootScope.tenantId]
              });
              sqlLiteServ.runAddQuery(trans, function(err, res) {});*/
              $rootScope.resetApp();
              });
        }else{
          $rootScope.resetApp();
        }
    }

    $rootScope.refreshToken = function(url, method, apidata, callback) {
        $.blockUI();
        var refreshUrl = $rootScope.GatewayUrl + "/unifydidentity/open/oauth2/token";
        //var data = "refresh_token=" + $rootScope.user.refreshToken;
        //var data = 'username=' + $.jStorage.get("unifyedusername") + '&password=' + $.jStorage.get("unifyedpassword");
        var req = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-TENANT-ID': $rootScope.tenant
            },
            url: refreshUrl,
            method: 'POST',
            data: {
                'refresh_token': $rootScope.user.refreshToken
            },
            json: true
        }
        $http(req).then(function successCallback(res) {
            var data = res.data;
            console.log('beforeRefresh', $rootScope.user);
            $rootScope.user['accessToken'] = data.access_token;
            $rootScope.user['refreshToken'] = data.refresh_token;
            $rootScope.user['providerData'] = data.access_token;
            console.log('afterRefresh', $rootScope.user);
            $.jStorage.set('user', $rootScope.user);
            $.jStorage.set('token', res.data);
            $rootScope.callAPI(url, method, apidata, callback);
            $.unblockUI();
        }, function errorCallback(err) {
            console.log(err);
            $.unblockUI();
            if(window.device){ navigator.notification.alert('Your session is expired. Please login again.',null,'Session Expired','Ok');}else{
              alert('Your session is expired. Please login again.');
            }
            $.jStorage.deleteKey("user");
            $.jStorage.deleteKey("token");
            $.jStorage.deleteKey("unifyedusername");
            $.jStorage.deleteKey("unifyedpassword");
            $rootScope.refreshHandler();
        });
    };

    $rootScope.callOpenAPI = function(option, cb) {
        console.log('callOpenAPI', option, $rootScope.user);
        var req;
        if (window.device) {
            option.data = option.body;
            req = option
        } else {
            req = {
                url: 'https://kryptosda.kryptosmobile.com/kryptosds/utils/proxy',
                data: option,
                method: 'POST'
            }
        }

        //console.log('callOpenAPI', option);
        $http(req).then(function successCallback(res) {
            cb(null, res.data);
        }, function errorCallback(err) {
            cb(err, null);
        });

    };

    $rootScope.callCMSAPI = function(option, cb) {
        console.log('callCMSAPI', option, $rootScope.user);

        var req;
        if (window.device) {
            option.url = `https://${$rootScope.user.domain}${option.url}`;
            option.data = option.body;
            req = option
        } else {
            option.url = $rootScope.getBaseUrl(option.url,$rootScope.environment);
            req = {
                url: 'https://kryptosda.kryptosmobile.com/kryptosds/utils/proxy',
                data: option,
                method: 'POST'
            }
        }
        $http(req).then(function successCallback(res) {
            cb(null, res.data);
        }, function errorCallback(err) {
            cb(err, null);
        });
    };

    $rootScope.getNotificationBadgeMobile = function() {
        $rootScope.notificationcentre = $rootScope.notificationcentre || {}
        if (!$rootScope.GatewayUrl || !$rootScope.user || !$rootScope.user.accessToken || !$rootScope.user.email) {
            setTimeout(function() {
                $rootScope.getNotificationBadgeMobile();
            }, 500);
            return true;
        }

        var headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + $rootScope.user.accessToken,
            'X-TENANT-ID': $rootScope.user.tenant,
            'X-TENANT-DOMAIN': $rootScope.user.tenantdomain,
            'principal-user': $rootScope.username,
            'X-USER-EMAIL': $rootScope.user.email
        }
        if ($rootScope.site && $rootScope.site._id) headers['site-id'] = $rootScope.site._id;
        var url = $rootScope.GatewayUrl + '/unifyed-notificationcentre/v1/notifications/count?type=sent';
        $http({
            method: 'GET',
            url: url,
            headers: headers
        }).then(function successCallback(response) {
            $rootScope.notificationcentre.badge = (response && response.data && response.data.data) || 0;
            try {
                $rootScope.$apply();
            } catch (ex) {}
        }, function errorCallback(error) {
            console.log("in callAPI, URL : " + url + " : error status=" + error.status);
        });
    };

    $rootScope.$on("$routeChangeStart", function(event, next, current) {
        $.blockUI();
        if ($rootScope.rbacnavmenu) {
            $rootScope.currentPagePath = $location.path();
            if (current.params.sitebaseurl && next.params.appid == "UnifyedGroups") {
                $rootScope.hideDockMenu = false;
                //navigating back from groups page, refresh rbac menu
                window.globalsiteid = $rootScope.user.siteId;
                let url1 = "/unifyedrbac/rbac/user?user=" + $rootScope.user.email + "&device=mobile";
                $rootScope.callAPI(url1, 'GET', {}, function(response) {
                    if (response && response.data) {
                        $rootScope.rbacGroupMenuGenerated = true;
                        var menudata = response.data;
                        // $rootScope.dockApplets = menudata.docks;
                        menudata.menus = $rootScope.removeDuplicates(menudata);
                        $rootScope.rbacnavmenu = $rootScope.buildMenuTree(menudata.menus);
                        $rootScope.rbacallmenus = menudata.menus;
                    }
                });
            }
            if (next.params.sitebaseurl && $location.path().startsWith("/group/")) {
                $rootScope.hideDockMenu = true;
            }
            angular.forEach($rootScope.rbacallmenus, function(value, key) {
                if (value.type == 'applet' && value.url.split('/')[2] == next.params.appid) {
                    $rootScope.appletTitle = value.label
                } else if (value.type == 'page' && value.url.split('/')[2] == next.params.id) {
                    $rootScope.appletTitle = value.label
                }
            });
        }
    });
    var fixgap = function addPadding() {
        var headerHeight = $('#appHeader').height()
        var footerHeight = $('#bottomFixContent').height()
        $('#loadApplet').css({
            'paddingBottom': footerHeight,
            'paddingTop': headerHeight
        })
    }
    $rootScope.$on("$routeChangeSuccess", function(event, next, current) {
        $.unblockUI();
        $(".dockIconLink .dockIconImage").children('.dock-menu-icon').css('opacity', 0.6);
        $(".dockIconLink .dockIconLabel").css('opacity', 0.6);
        if ($rootScope.dockApplets) {
            for (var i = 0; i < $rootScope.dockApplets.length; i++) {
                if (('/app/' + next.pathParams.appid + '/' + next.pathParams.pageid == $rootScope.dockApplets[i].url)) {
                    $(".dockIcon" + $rootScope.dockApplets[i].id).children('.dockIconImage').children('.dock-menu-icon').css('opacity', 1);
                    $(".dockIcon" + $rootScope.dockApplets[i].id).children('.dockIconLabel').css('opacity', 1);
                    break;
                } else if ('/app/' + next.pathParams.appid + '/' + next.pathParams.pageid == "/app/Menu/Menu") {
                    $(".menuRbac").children('.dockIconImage').children('.dock-menu-icon').css('opacity', 1)
                    $(".menuRbac").children('.dockIconLabel').css('opacity', 1)
                }
            }
        }
        setTimeout(function() {
            fixgap();
        }, 1000)
    })

    $rootScope.compare = function(a, b) {
        var genreA = a.precedence;
        var genreB = b.precedence;

        var comparison = 0;
        if (genreA > genreB) {
            comparison = 1;
        } else if (genreA < genreB) {
            comparison = -1;
        }
        return comparison;
    }

    $rootScope.removeDuplicates = function(arr) {
        var unique_array = []
        var unique_object = [];
        for (var i = 0; i < arr.menus.length; i++) {
            if (unique_array.indexOf(arr.menus[i].id) == -1) {
                unique_array.push(arr.menus[i].id)
                unique_object.push(arr.menus[i]);
            } else {
                for (var j = 0; j < unique_object.length; j++) {
                    if (unique_object[j].id == arr.menus[i].id) {
                        for (var permission in arr.menus[i].actions) {
                            if (!unique_object[j].actions.hasOwnProperty(permission)) {
                                unique_object[j].actions[permission] = true;
                            }
                        }
                    }
                }
            }
        }
        return unique_object
    }

    $rootScope.buildMenuTree = function(menuRanks) {
        $rootScope.masterMenuTree = [];
        var pushEleInGroup = function(tree, ele) {
            angular.forEach(tree, function(node, key) {
                //tree.forEach(node => {
                if ($rootScope.rbacFirstLanding && node.id == $rootScope.rbacFirstLanding.pageId) {
                    $rootScope.rbacFirstLanding.menu = node;
                    $rootScope.site.landingpage = $rootScope.rbacFirstLanding.menu.url;
                }
                if (node.path.split('/')[node.path.split('/').length - 1] == ele.root) {
                    node.children = node.children || [];
                    node.children.push(ele);
                } else if (node.children) {
                    pushEleInGroup(node.children, ele);
                }
            });
        }

        //menuRanks.forEach(node => {
        angular.forEach(menuRanks, function(node, key) {

            if ($rootScope.rbacFirstLanding && node.id == $rootScope.rbacFirstLanding.pageId) {
                $rootScope.rbacFirstLanding.menu = node;
                $rootScope.site.landingpage = $rootScope.rbacFirstLanding.menu.url;
            }
            if (node.path == node.root) {
                node.children = [];
                $rootScope.masterMenuTree.push(node)
            } else {
                pushEleInGroup($rootScope.masterMenuTree, node);
            }
        });

        return $rootScope.masterMenuTree;
    }

    $rootScope.getBaseUrl = function(url) {
        let baseUrl = "";
        switch ($rootScope.environment) {
            case 'dev': {
                baseUrl = 'https://dev.unifyed.com';
                break;
            }
            case 'stage': {
                baseUrl = 'https://unifyed-staging.unifyed.com';
                break;
            }
            case 'prod': {
                baseUrl = 'https://unifyedprod.unifyed.com';
                break;
            }
            case 'qa': {
                baseUrl = 'https://unifyedqa.unifyed.com';
                break;
            }
            case 'uat': {
                baseUrl = 'https://uat-qa.unifyed.com';
                break;
            }
            case 'demo': {
                baseUrl = 'https://nmsu4.unifyed.com';
                break;
            }
        }
        return baseUrl + url;
    }

    $rootScope.loginlogout = function() {
        $location.path('/app/SignIn279/SignIn279');
    }

    /*$rootScope.goPreviousPage = function(){
      console.log('back');
      window.history.back();
      console.log($location.path());
    }*/
    function exitApp() {
        navigator.app.exitApp();
    }
    $rootScope.goPreviousPage = function(event) {
        var loc = window.location;
        $rootScope.leftToRight = true;
        if (loc.hash == "#/app/SignIn279/SignIn279" && $rootScope.appDetails.guestApp) {
            window.location.href = "#/app/Menu/Menu";
        } else if (loc.hash == "#/app/SignIn279/SignIn279" && !$rootScope.appDetails.guestApp) {
            exitApp();
        } else if (loc.hash == "#/app/Menu/Menu" && !$rootScope.appDetails.guestApp) {
            //exitApp();
        } else {
            window.history.back();
        }
    }
    document.addEventListener("backbutton", $rootScope.goPreviousPage, true);

    $rootScope.loadUnacknowledgedMessage = function() {
        var url = $rootScope.GatewayUrl + '/unifyed-notificationcentre/v1/notifications/acknowledged?ack=false';
        $http({
            method: 'GET',
            url: url,
            headers: $rootScope.getHeaders(url, 'GET')
        }).then(function successCallback(response) {
            if (response && response.data) {
                if (response.data.length) {
                    $("#acknowledgeModal").modal("show");
                    $rootScope.unAcknowledgeMessages = response.data;
                }
            }
        }, function errorCallback(error) {
            console.log("in callAPI, URL : " + url + " : error status=" + error.status);
        });
    }

    /* Dont remove this code */
    return {
        'serviceloaded': 'serviceloaded'
    }

}]);

/*****************End for Services for unifyed applets (whatsUp, messaging etc) *********************************/
angular.module('unifyedmobile').run(['unifyedglobal', function(unifyedglobal) {}]);

angular.module('convertSvg', []).service('convertSvgIcon', function() {
    var converTeddata = function() {
        jQuery('img.sidebar-menu-icon , img.convertsvg , img.dock-menu-icon').each(function() {
            var $img = jQuery(this);
            var imgID = $img.attr('id');
            var imgClass = $img.attr('class');
            var imgURL = $img.attr('src');
            jQuery.get(imgURL, function(data) {
                // Get the SVG tag, ignore the rest
                var $svg = jQuery(data).find('svg');
                // Add replaced image's ID to the new SVG
                if (typeof imgID !== 'undefined') {
                    $svg = $svg.attr('id', imgID);
                }
                // Add replaced image's classes to the new SVG
                if (typeof imgClass !== 'undefined') {
                    $svg = $svg.attr('class', imgClass + ' replaced-svg');
                }
                // Remove any invalid XML tags as per http://validator.w3.org
                $svg = $svg.removeAttr('xmlns:a');
                // Check if the viewport is set, else we gonna set it if we can.
                if (!$svg.attr('viewBox') && $svg.attr('height') && $svg.attr('width')) {
                    $svg.attr('viewBox', '0 0 ' + $svg.attr('height') + ' ' + $svg.attr('width'))
                }
                // Replace image with new SVG
                $img.replaceWith($svg);
            }, 'xml');
        });
    }
    return {
        converTeddata: converTeddata
    };
});

angular.module('sqlService', []).factory('sqlLiteServ', ['$http', '$rootScope', '$location', function($http, $rootScope, $location) {
    return {
        openDataBase: async function() {
            return await window.sqlitePlugin.openDatabase({
                name: `unifyed.${$rootScope.tenantId}`,
                location: 'default',
            });
        },
        addUpdateData: function(table, data) {
            data = JSON.stringify(data);
            let db = this.openDataBase();
            db.transaction(function(tx) {
                tx.executeSql(`CREATE TABLE IF NOT EXISTS ${table} (info)`);
                tx.executeSql(`INSERT INTO ${table} VALUES (?1)`, [data]);
            }, function(error) {
                console.log('Transaction ERROR: ' + error.message);
            }, function() {
                return 'Populated database OK';
            });
        },
        runGetQuery: async function(query, cb) {
            let db = await this.openDataBase();
            db.transaction(function(tx) {
                console.log(query[0]);
                tx.executeSql(query[0].q, query[0].d, function(tx, resultSet) {
                        console.log('resultSet', resultSet);
                        if (resultSet.rows.length > 0) {
                            cb(null, resultSet.rows);
                        } else {
                            cb('record not found', resultSet.rows);
                        }

                    },
                    function(tx, error) {
                        console.log('error', error);
                        cb('error', error);
                    });
            }, function(error) {
                console.log('Transaction ERROR: ' + error.message);
            }, function() {
                console.log('Transaction success');
            });
        },
        updateData: function() {
            return 0
        },
        runAddQuery: async function(query, cb) {
            let db = await this.openDataBase();
            db.transaction(function(tx) {
                angular.forEach(query, function(val, key) {
                    console.log(val);
                    if (!val.d) {
                        tx.executeSql(val.q);
                    } else {
                        tx.executeSql(val.q, val.d, function(tx, res) {
                                console.log("insertId: " + res.insertId + " -- probably 1");
                                console.log("rowsAffected: " + res.rowsAffected + " -- should be 1");
                            },
                            function(tx, error) {
                                console.log('INSERT error: ' + error.message);
                            });
                    }
                });
            }, function(error) {
                console.log('Transaction ERROR: ' + error.message);
                cb('error', error);
            }, function() {
                console.log('Transaction success:');
                cb(null, 'data added');
            });
        }
    }
}]);

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

let pageCtrl = angular.module('pageCtrl', []);
pageCtrl.controller('unifyedPageCtrl', ['$rootScope', '$scope', '$routeParams', '$http', '$compile', '$sce','convertSvgIcon', '$location',
    function($rootScope, $scope, $routeParams, $http, $compile, $sce, convertSvgIcon, $location) {
        $scope.openReorder = function() {
            $("#reorderModal").modal("show");
            console.log('$rootScope.pagedata', $rootScope.pagedata);
            $rootScope.pagedataCopy = angular.copy($rootScope.pagedata);
        }
        $scope.saveReorderPage=function(){
          $rootScope.pagedata = angular.copy($rootScope.pagedataCopy);
          $rootScope.$emit("onSavePage", {});
          $("#reorderModal").modal("hide");
        }
        try {
            $('.menu-item').removeClass('active');
        } catch (ex) {
            //
        }

        $rootScope.startCallback = function(event, ui, title) {
            //alert("Dragg started");
            $rootScope.curdrag = title;
            $("#widgetContainer").css("opacity", "0.5");
            $rootScope.ismove = false;
            //$("#widgetContainer").hide();
        };

        $rootScope.dropCallback = function(event, ui) {
            console.log("inside drop callback.. in page ctrl!!" + JSON.stringify($rootScope.curdrag));
            if ($rootScope.curdrag == undefined) {
                return;
            }
            //MM:console.log($rootScope.curdrag.name);

            $("#widgetContainer").css("opacity", "1");
            $(event.target).removeClass("droparea");
            //alert($(event.target).attr("data-cell"));
            var cell = $(event.target).attr("data-cell");
            if (cell) {
                //alert($rootScope.curdrag.displayname);
                var row = cell.split(":")[0];
                var col = cell.split(":")[1];
                var comp = {
                    "widget": angular.copy($rootScope.curdrag),
                    "position": {
                        "x": ui.position.left,
                        "y": ui.position.top
                    },
                    "dimension": {
                        "w": 300,
                        "h": "100"
                    },
                    "widgetid": $rootScope.curdragwidgetid
                };
                if ($rootScope.curdrag.displayname != undefined) {
                    comp = {
                        "applet": angular.copy($rootScope.curdrag),
                        "position": {
                            "x": ui.position.left,
                            "y": ui.position.top
                        },
                        "dimension": {
                            "w": 300,
                            "h": "100"
                        }
                    };
                }

                if ($rootScope.ismove) {
                    $rootScope.col.components.splice($rootScope.curindex, 1)


                    /*var fromcell = $rootScope.movelocation;
                    var fromrow = fromcell.split(":")[0];
                    var fromcol = fromcell.split(":")[1];
                    var fromindex = fromcell.split(":")[2];
                    console.log("Components "  + JSON.stringify($rootScope.pagedata.rows[fromrow].cols[fromcol].components));
                    console.log("Row "  + JSON.stringify($rootScope.pagedata.rows[fromrow]));
                    $rootScope.pagedata.rows[fromrow].cols[fromcol].components.splice(fromindex, 1);*/
                    //$($rootScope.fromcol).remove($rootScope.fromindex);
                }
                $rootScope.pagedata.rows[row].cols[col].components.push(comp);
                $rootScope.$emit("onSavePage", {});

            }
            //MM:console.log("Event " + event);
            //MM:console.log("UI " + JSON.stringify(ui));
            //MM:console.log('hey, you dumped me :-(' , $rootScope.curdrag.name);
            //MM:  console.log(ui.position.top);


            //alert($rootScope.curdrag.name);
            //$scope.onDropComplete1($scope.curdrag, "");
            /*$('.pagecomp').summernote();*/


        };

        $rootScope.overDropCallback = function(event, ui) {
            console.log("overDropCallback");
            //alert($rootScope.curdrag);
            if ($rootScope.curdrag == undefined) {
                return;
            }

            //alert(event.target);
            $(".droparea").removeClass("droparea");
            $(event.target).addClass("droparea");
            $rootScope.curdroppable = event.target;
        };

        $rootScope.outDropCallback = function(event, ui) {
            if ($rootScope.curdrag == undefined) {
                return;
            }

            $(event.target).removeClass("droparea");
        };

        $rootScope.menuSelected = true;
        if (!$rootScope.onSavePageAdded) {
            $rootScope.$on('onSavePage', function(event, args) {

                $http.put('/pages/page/' + $rootScope.pagedata._id, $rootScope.pagedata).then(function(response) {
                    //alert(response.data);
                    $http.get('/pages/page/findbypageid/' + $rootScope.site._id + "/" + $routeParams.id).then(function(response) {
                        $rootScope.pagedata = response.data;
                        if (args.callback) {
                            args.callback();
                        }
                    });
                }, function(errorResponse) {
                    console.log('Cannot load the file template');
                });
            });
            $rootScope.onSavePageAdded = true;
        }
        $rootScope.$on('onCmsWidgetDelete', function(event, args) {

            //alert("onCmsWidgetDelete received " + JSON.stringify(args.index));
            $rootScope.widgetForDelete = {
                "col": args.col,
                "index": args.index
            };
            //args.col.components.splice(args.index, 1);
            $("#deleteWidgetModal").modal("show");

        });
        $rootScope.deleteWidgetConfirm = function() {
            $rootScope.widgetForDelete.col.components.splice($rootScope.widgetForDelete.index, 1);
            $rootScope.$emit("onSavePage", {});
            $("#deleteWidgetModal").modal("hide");
        }


        var page = null;
        angular.forEach($rootScope.navmenu, function(val, key) {
            if (val._id == $routeParams.id) {
                page = val;
            }
            angular.forEach(val.pages, function(val2, key2) {
                if (val2._id == $routeParams.id) {
                    page = val;
                }
            });
        });
        //alert(page.pageid);
        //$rootScope.pagetitle = page.title;
        $scope.selectcomp = function(node, comp) {
            //alert(JSON.stringify(index.comp.dimension));
            //MM:console.log(document.querySelector( '#pagecomp' + node ) );
            //$(index).addClass("selectedcomp");
            for (var i = 0; i < $rootScope.pagedata.rows.length; i++) {

                for (var j = 0; j < $rootScope.pagedata.rows[i].cols.length; j++) {
                    for (var k = 0; k < $rootScope.pagedata.rows[i].cols[j].components.length; k++) {
                        $rootScope.pagedata.rows[i].cols[j].components[k].selected = "";

                    }
                }
            }

            comp.selected = "selectedcomp";
            //$("#pagecomp" + index).addClass("selectedcomp");
            $rootScope.selectedcomp = comp;
            /*InlineEditor.create( document.querySelector( '#pagecomp' + node ) )
             .then( editor => {
             console.log( "Editor AK : " + editor );
             } )
             .catch( error => {
             console.error( error );
             } );*/

        }
        $rootScope.selectrow = function(row) {
            row.selected = "selectedcomp";

        }
        $rootScope.getCompHtml = function(comp, node) {
            if (comp.widget) {
                window.eval(comp.widget.processor);
                //alert(comp.widget.processor);
                var result = window["proc" + comp.widget.name](comp.widget.attribs);
                return $sce.trustAsHtml(result);
            } else if (comp.applet) {

                var data = "<div><uni-Applet apps='tenantmetadata.apps' data-aid=" + comp.applet.id + "></uni-Applet><div class='appletdrop'>Applet..!!<br/><img src='" + comp.applet.iconUrl + "'/><h1>" + comp.applet.displayname + "</h1></div></div>";
                var data1 = $compile(data)($rootScope);
                //MM:console.log(data1.html());
                //return $sce.trustAsHtml(data1.html());
                node.append(data1);
                //return "";
            } else {

                return "";
            }


        }

        /* Jan 29- Added changes for undo/redo functionality */
        $rootScope.undoAction = function() {
            if ($rootScope.changeHistory.length > 0) {
                var dat = $rootScope.changeHistory.pop();
                if ($rootScope.redoStack.length >= 50) {
                    $rootScope.redoStack.shift();
                }
                $rootScope.redoStack.push(dat.newval);
                //MM:console.log("Undo action called...");
                //MM:console.log($rootScope.changeHistory);
                //MM:console.log("redo stack:");
                //MM:console.log($rootScope.redoStack);
                $rootScope.allowWatchToMarkChange = false;
                $rootScope.pagedata.rows = dat.oldval;
            }
        }

        $rootScope.redoAction = function() {
            if ($rootScope.redoStack.length > 0) {
                var dat = $rootScope.redoStack.pop();
                //MM:console.log("redo action called...");
                //MM:console.log($rootScope.redoStack);
                $rootScope.pagedata.rows = dat;
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
        //var data = {url: page.url};
        var waitForSiteToLoad = function() {
            setTimeout(function() {
                /*if (!$rootScope.site) {
                    console.log("waitForSiteToLoad : " + $rootScope.site);
                    waitForSiteToLoad();
                    return;
                }*/
                var siteEndpoint = window.globalsiteid;
                $rootScope.showDockIconsInGroup = false;
                if ($location.path().startsWith('/group/')) {
                    console.log('GROUP PAGE');
                    if (!$rootScope.groupsiteid || !$rootScope.rbacGroupMenuGenerated) {
                        waitForSiteToLoad();
                        return;
                    }
                    siteEndpoint = $rootScope.groupsiteid;
                }                
                var req = {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    url: '/pages/page/findbypageid/' + siteEndpoint + "/" + $routeParams.id,
                    method: 'GET'
                };
                $.blockUI();
                $rootScope.callCMSAPI(req, function(err, response) {
                  console.log('pagedata',response);
                  $.unblockUI();
                  var comps = response.components;
                  $rootScope.pagedata = response;
                  //$('#' + response._id).addClass('active');
                  $rootScope.allowWatchToMarkChange = false;
                  $rootScope.initpagerows = angular.copy($rootScope.pagedata.rows);
                  $rootScope.redoStack = [];
                  $rootScope.changeHistory = [];
                  $rootScope.appletName = $rootScope.pagedata.title;
                  /* Watch changes for undo/redo events */
                  $scope.$watch('pagedata.rows', function(newval, oldval) {
                      console.log("in watch ...");
                      if (!$rootScope.pagedata || !$rootScope.pagedata.rows) {
                          $rootScope.changeHistory = [];
                      } else if ($rootScope.allowWatchToMarkChange) {
                          // limit the use of array to only 50 elements
                          if ($rootScope.changeHistory.length >= 50) {
                              $rootScope.changeHistory.shift();
                          }
                          $rootScope.changeHistory.push({
                              "oldval": angular.copy(oldval),
                              "newval": angular.copy(newval)
                          });
                      } else {
                          $rootScope.allowWatchToMarkChange = true;
                      }
                  }, true);
                  var html = "<div ng-repeat='comp in pagedata.components'><div class='pagecomp' posy = '{{comp.position.y}}' posx='{{comp.position.y}}' my-draggable  ng-bind-html='getCompHtml(comp)' ></div> </div>";

                  //if(true) {
                  var comphtml = "<div class='pagecomp' ng-repeat='comp in col.components'>" +
                      "<div cmscellwidget col='col' rowindex='$parent.$parent.$index' colindex='$parent.$index' comp='comp' index='$index'>" +
                      //"<div id='pagecomp{{$index}}'  ng-class='comp.selected' posy = '{{comp.position.y}}' posx='{{comp.position.y}}' my-draggable  uni-applet span='col.span' comp='comp' ng1-init='getCompHtml(comp, $this)' >" +
                      "<div ng-class='comp.selected' posy = '{{comp.position.y}}' posx='{{comp.position.y}}' my-draggable  uni-applet span='col.span' comp='comp' ng1-init='getCompHtml(comp, $this)' >" +
                      "</div>" +
                      "</div>" +
                      "</div>";
                  var html = '<div cmsrow  ng-class="row.selected" ng-repeat="row in pagedata.rows" row="row" ng-click="selectrow(row);">';
                  var pageHasApplets = false;
                  for (var i = 0; i < $rootScope.pagedata.rows.length && !pageHasApplets; i++) {
                      for (var j = 0; j < $rootScope.pagedata.rows[i].cols.length && !pageHasApplets; j++) {
                          for (var k = 0; k < $rootScope.pagedata.rows[i].cols[j].components.length && !pageHasApplets; k++) {
                              pageHasApplets = $rootScope.pagedata.rows[i].cols[j].components[k].hasOwnProperty('applet')
                          }
                      }
                  }
                  if (pageHasApplets) {
                      html += '<div class="mainThemeContainer';
                      if ($rootScope.pagedata.rows.length == 1) html += ' addOwlCarosel owl-carousel '
                      html += '">' +
                          '<div ng-repeat="col in row.cols" class="cmscell col-xs-12 col-lg-{{col.span}}">' +
                          '<div ng-style="col.style" cmscellsettings col="col" row="row" colindex="$index" rowindex="$parent.$index" rows="pagedata.rows" class="layout-cell clearfix" jqyoui-droppable="{multiple:true,onDrop:\'dropCallback\',onOver:\'overDropCallback\', onOut: \'outDropCallback\'}" data-drop="true" data-cell="{{$parent.$index}}:{{$index}}" ng-drop="true" ng-drop-success="onDropComplete1($data,$event)">' +
                          comphtml +
                          '</div>' +
                          '</div>' +
                          '</div>';
                  } else {
                      html += '<div class="mainThemeContainer appletcontent">' +
                          '<div ng-repeat="col in row.cols" class="cmscell col-xs-12 col-lg-{{col.span}}">' +
                          '<div ng-style="col.style" cmscellsettings col="col" row="row" colindex="$index" rowindex="$parent.$index" rows ="pagedata.rows" class="layout-cell clearfix" jqyoui-droppable="{multiple:true,onDrop:\'dropCallback\',onOver:\'overDropCallback\', onOut: \'outDropCallback\'}" data-drop="true" data-cell="{{$parent.$index}}:{{$index}}" ng-drop="true" ng-drop-success="onDropComplete1($data,$event)">' +
                          comphtml +
                          '</div>' +
                          '</div>' +
                          '</div>';
                  }
                  //}
                  $("#pageContent").append($compile(html)($scope));
                  $.unblockUI();
                });
                convertSvgIcon.converTeddata();
                $scope.adddynamicPadding()
            }, 500);
            var checkStudiomode = setInterval(function() {
                if ($('body').find('.addOwlCarosel').length != 0) {
                    if ($('body').hasClass('studiomode')) {
                        $('.addOwlCarosel').removeAttr('id');
                    } else {
                        $('.addOwlCarosel').attr('id', 'themeCarosel');
                    }
                    clearInterval(checkStudiomode);
                }
            }, 1000);
        };
        waitForSiteToLoad();
    }
]);

let mainCtrl = angular.module('MainCtrl', []);
mainCtrl.controller('mainController', ['$rootScope', '$scope', '$routeParams', '$http', '$compile', '$sce', '$location', '$injector', 'sqlLiteServ', function($rootScope, $scope, $routeParams, $http, $compile, $sce, $location, $injector, sqlLiteServ) {
    //$.jStorage.deleteKey("unifyedusername")
    $scope.appSetup = (callBack) => {
        $scope.keybordHideshow = () => {
            window.addEventListener('keyboardWillShow', function() {
                Keyboard.disableScroll(false);
                $('#dockIcon').hide();
                $('#loadApplet').css('paddingBottom', '0px')
                $('#bottomFixContent').addClass('fixBottomgap0px').removeClass('fixBottomgap');
            });
            window.addEventListener('keyboardWillHide', function() {
                Keyboard.disableScroll(true);
                var footerHeight = $('#bottomFixContent').height()
                $('#dockIcon').show();
                $('#loadApplet').css('paddingBottom', footerHeight)
                $('#bottomFixContent').removeClass('fixBottomgap0px').addClass('fixBottomgap');
            });
        }
        $scope.keybordHideshow();

        $rootScope.tenantId = tenantInfo.tenantId;
        $rootScope.environment = tenantInfo.env;
        $scope.fetchTenantAppVer = function() {
            var req = {
                headers: {
                    'Content-Type': 'application/json',
                    'X-TENANT-ID': $rootScope.tenantId
                },
                method: 'GET',
                data: ''
            }
            req['url'] = $rootScope.getBaseUrl('/studio/getAllVersions/' + $rootScope.tenantId);
            $scope.loadDetails = false;
            $rootScope.callOpenAPI(req, function(err, res) {
                if ($.jStorage.get('AppVersion')) {
                    var oldVer = $.jStorage.get('AppVersion');
                    if (oldVer.cssVer < res.cssVer || oldVer.appVer < res.appVer || oldVer.tenantVer < res.tenantVer) {
                        $scope.loadDetails = true;
                        $.jStorage.set('AppVersion', res);
                    }
                } else {
                    $scope.loadDetails = true;
                    $.jStorage.set('AppVersion', res);
                }
                callBack(null);
            });
        }();
    }

    $scope.loadAppDetails = (callBack) => {
        $scope.fetchTenantAppDetails = function() {
            var req = {
                headers: {
                    'Content-Type': 'application/json',
                    'X-TENANT-ID': $rootScope.tenantId
                },
                method: 'GET',
                data: ''
            }
            req['url'] = $rootScope.getBaseUrl('/studio/getAllMobileDetails/' + $rootScope.tenantId);
            $rootScope.callOpenAPI(req, function(err, res) {
                let trans = [];
                if ($rootScope.appConfiguration) {
                    trans.push({
                        q: `UPDATE appDetails SET info = ? WHERE tenantId=?`,
                        d: [JSON.stringify(res), $rootScope.tenantId]
                    });
                } else {
                    trans.push({
                        q: `CREATE TABLE IF NOT EXISTS appDetails (info,tenantId)`,
                        d: null
                    });
                    trans.push({
                        q: `INSERT INTO appDetails (info,tenantId) VALUES (?,?)`,
                        d: [JSON.stringify(res), $rootScope.tenantId]
                    });
                }
                $rootScope.appConfiguration = res;
                $rootScope.appDetails = $rootScope.appConfiguration.appDetails;
                $rootScope.authFunction = $rootScope.appConfiguration.authFunction;
                $rootScope.homeScreenTemplate = $rootScope.appConfiguration.homeScreenTemplate;
                $rootScope.mobilecss = $rootScope.appConfiguration.mobilecss;
                $rootScope.tenantDetails = $rootScope.appConfiguration.tenantDetails;
                let data = $rootScope.tenantDetails;
                $rootScope.user = $.isEmptyObject($rootScope.user) ? {} : $rootScope.user;
                $rootScope.brandingUrl = data.logoUrl;
                $rootScope.user.tenant = $rootScope.tenantId;
                $rootScope.user.tenantdomain = data['idpTenantDomain'];
                $rootScope.GatewayUrl = 'https://' + data['domain'] + data['gatewaypath'];
                $rootScope.user.domain = data['domain'];
                $rootScope.user.gatewaypath = data['gatewaypath'];
                $rootScope.user.admins = data['admins'] || [];
                $rootScope.user.oauthUserInfoUrl = data['oauthUserInfoUrl'];
                $rootScope.user.products = data['products'];
                $rootScope.user.qlId = data['qlTenantid'];
                $rootScope.user.siteId = data['siteId'];
                $rootScope.user.backgroundImg = data['backgroundImg'];
                const tenantTheme = $rootScope.tenantDetails.themeColors;
                if (window.device) {
                    StatusBar.backgroundColorByHexString(tenantTheme.primaryColor);
                    StatusBar.overlaysWebView(false);
                }
                const themeCSS = $rootScope.mobilecss.replace(/##primaryColor/g, tenantTheme.primaryColor).replace(/##secondaryColor/g, tenantTheme.secondaryColor).replace(/##textColor/g, tenantTheme.textColor).replace(/##btnColor/g, tenantTheme.btnColor);
                $("#themeColorsCSS").html(themeCSS);
                console.log('$rootScope.appConfiguration', $rootScope.appConfiguration);
                if (window.device) {
                    sqlLiteServ.runAddQuery(trans, function(err, res) {
                        if (err) {
                            console.log(err);
                        }
                    });
                }
                try {
                    callBack(null);
                } catch (e) {}
            });
        }

        if (window.device) {
            let trans = [];
            trans.push({
                q: `SELECT info FROM appDetails`,
                d: null
            });
            sqlLiteServ.runGetQuery(trans, function(err, res) {
                console.log('appDetails', err, res);
                if (!err) {
                    $rootScope.appConfiguration = JSON.parse(res.item(0).info);
                    if ($scope.loadDetails) {
                        navigator.notification.alert('Loading new updates for the app.', null, 'Update', 'Ok')
                        $scope.fetchTenantAppDetails();
                        return;
                    } else {
                        $rootScope.appDetails = $rootScope.appConfiguration.appDetails;
                        $rootScope.authFunction = $rootScope.appConfiguration.authFunction;
                        $rootScope.homeScreenTemplate = $rootScope.appConfiguration.homeScreenTemplate;
                        $rootScope.mobilecss = $rootScope.appConfiguration.mobilecss;
                        $rootScope.tenantDetails = $rootScope.appConfiguration.tenantDetails;
                        let data = $rootScope.tenantDetails;
                        $rootScope.user = $.isEmptyObject($rootScope.user) ? {} : $rootScope.user;
                        $rootScope.brandingUrl = data.logoUrl;
                        $rootScope.user.tenant = $rootScope.tenantId;
                        $rootScope.user.tenantdomain = data['idpTenantDomain'];
                        $rootScope.GatewayUrl = 'https://' + data['domain'] + data['gatewaypath'];
                        $rootScope.user.domain = data['domain'];
                        $rootScope.user.gatewaypath = data['gatewaypath'];
                        $rootScope.user.admins = data['admins'] || [];
                        $rootScope.user.oauthUserInfoUrl = data['oauthUserInfoUrl'];
                        $rootScope.user.products = data['products'];
                        $rootScope.user.qlId = data['qlTenantid'];
                        $rootScope.user.siteId = data['siteId'];
                        $rootScope.user.backgroundImg = data['backgroundImg'];
                        const tenantTheme = $rootScope.tenantDetails.themeColors;
                        if (window.device) {
                            StatusBar.backgroundColorByHexString(tenantTheme.primaryColor);
                            StatusBar.overlaysWebView(false);
                        }
                        const themeCSS = $rootScope.mobilecss.replace(/##primaryColor/g, tenantTheme.primaryColor).replace(/##secondaryColor/g, tenantTheme.secondaryColor).replace(/##textColor/g, tenantTheme.textColor).replace(/##btnColor/g, tenantTheme.btnColor);
                        $("#themeColorsCSS").html(themeCSS);
                        console.log('$rootScope.appConfiguration', $rootScope.appConfiguration);
                        if ($rootScope.appConfiguration) {
                            callBack(null);
                            $scope.fetchTenantAppDetails();
                        }
                    }
                } else {
                    $scope.fetchTenantAppDetails();
                }
            });
        } else {
            $scope.fetchTenantAppDetails();
        }
    }

    $scope.checkConfig = function(callBack) {
        if ($.jStorage.get("unifyedusername") && $.jStorage.get("unifyedpassword")) {
            let token = $.jStorage.get("token");
            $rootScope.loggedIn = true;
            $rootScope.user['accessToken'] = token.accessToken;
            $rootScope.user['refreshToken'] = token.refreshToken;
            $rootScope.user['providerData'] = token.accessToken;
            $rootScope.loadUserRbac = true;
            callBack(null);
        } else if ($rootScope.appDetails.guestApp) {
            $rootScope.loadPublicRbac = true;
            $rootScope.loggedIn = false;
            callBack(null);
        } else {
            $rootScope.showSignInPage = true;
            callBack(null);
        }
    }

    $scope.loadRbac = (callBack) => {
        if ($rootScope.showSignInPage) {
            callBack(null);
        } else {
            if ($rootScope.loadPublicRbac) {
                if (window.device) {
                    let trans = [];
                    trans.push({
                        q: `SELECT info FROM rbacPublicDetails`,
                        d: null
                    });
                    sqlLiteServ.runGetQuery(trans, function(err, res) {
                        if (err) {
                            let url = $rootScope.GatewayUrl + '/unifyedrbac/rbac/open/menus'
                            var req = {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-TENANT-ID': $rootScope.tenantId,
                                    'site-id': $rootScope.user.siteId
                                },
                                url: url,
                                method: 'POST',
                                body: [{
                                    "roles": ["Public"],
                                    "product": "global"
                                }],
                                json: true
                            };
                            $rootScope.callOpenAPI(req, function(err, res) {
                                trans = [];
                                trans.push({
                                    q: `CREATE TABLE IF NOT EXISTS rbacPublicDetails (info,tenantId)`,
                                    d: null
                                });
                                trans.push({
                                    q: `INSERT INTO rbacPublicDetails (info,tenantId) VALUES (?,?)`,
                                    d: [JSON.stringify(res), $rootScope.tenantId]
                                });
                                sqlLiteServ.runAddQuery(trans, function(err, res) {});
                                callBack(null, res);
                            });
                        } else {
                            callBack(null, JSON.parse(res.item(0).info));
                        }
                    });
                } else {
                    let url = $rootScope.getBaseUrl('/unifyd-gateway/api/unifyedrbac/rbac/open/menus', $rootScope.environment);
                    var req = {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-TENANT-ID': $rootScope.tenantId,
                            'site-id': $rootScope.user.siteId
                        },
                        url: url,
                        method: 'POST',
                        body: [{
                            "roles": ["Public"],
                            "product": "global"
                        }],
                        json: true
                    };
                    $rootScope.callOpenAPI(req, function(err, res) {
                        callBack(null, res);
                    });
                }

            } else if ($rootScope.loadUserRbac) {
                let data = $.jStorage.get("user");
                $rootScope.user['id'] = data['id'];
                $rootScope.user['profileBackground'] = data['profileBackground'];
                $rootScope.user['firstName'] = data['firstName'];
                $rootScope.user['lastName'] = data['lastName'];
                $rootScope.user['profileImage'] = data['profileImage'];
                $rootScope.user['role'] = data['role'];
                $rootScope.user['tenant'] = data['tenant'];
                $rootScope.user['email'] = data['email'];
                $rootScope.user['phone'] = data['phone'];
                $rootScope.user['countryCode'] = data['countryCode'];
                $rootScope.user['provider'] = data['provider'];
                $rootScope.user['gender'] = data['gender'];
                $rootScope.user['devices'] = data['devices'];
                $rootScope.user['areaOfInterest'] = data['areaOfInterest'] || [];
                $rootScope.tenantUrl = $rootScope.user['domain'];

                $scope.getSavedRbac = function() {
                    var trans = [];
                    trans.push({
                        q: `SELECT info FROM rbacRoleDetails`,
                        d: null
                    });

                    sqlLiteServ.runGetQuery(trans, function(err, res) {
                        callBack(null, JSON.parse(res.item(0).info));
                    });
                }

                $scope.updateRbac = function(response) {
                    var trans = [];
                    trans.push({
                        q: `SELECT info FROM rbacRoleDetails`,
                        d: null
                    });

                    sqlLiteServ.runGetQuery(trans, function(err, res) {
                        if (err) {
                            trans = [];
                            trans.push({
                                q: `CREATE TABLE IF NOT EXISTS rbacRoleDetails (info,tenantId)`,
                                d: null
                            });
                            trans.push({
                                q: `INSERT INTO rbacRoleDetails (info,tenantId) VALUES (?,?)`,
                                d: [JSON.stringify(response), $rootScope.tenantId]
                            });
                            sqlLiteServ.runAddQuery(trans, function(err, res) {});
                        } else {
                            trans = [];
                            trans.push({
                                q: `UPDATE rbacRoleDetails SET info = ? WHERE tenantId=?`,
                                d: [JSON.stringify(response), $rootScope.tenantId]
                            });
                        }
                    });
                }

                let url = "/unifyedrbac/rbac/user?user=" + $rootScope.user.email + "&device=mobile";
                $rootScope.callAPI(url, 'GET', {}, function(response) {
                    console.log('userrbac', response);
                    try {
                        if (!response) {
                            $scope.getSavedRbac();
                        } else {
                            $scope.updateRbac(response.data);
                        }
                    } catch (e) {}
                    callBack(null, response.data);
                });
            }
        }
    }

    if (window.device && navigator.connection.type == "none") {
        navigator.notification.alert('No network connection found. Please check your network settings and try again.', function() {
            navigator.app.exitApp();
        }, 'No Network', 'Ok');
        return;
    }
    async.waterfall([
        $scope.appSetup,
        $scope.loadAppDetails,
        $scope.checkConfig,
        $scope.loadRbac
    ], function(err, results) {
      /* Evaluate the default auth and home screen template code */

          window.globalsiteid = $rootScope.user.siteId;
          $rootScope.$broadcast('launchsite', {
              "site": window.globalsiteid
          });
          MyCampusApp = {};
          MyCampusApp.rootScope = $rootScope;
          const homeScreenCode = $compile($($rootScope.homeScreenTemplate))($scope);
          $("#homeScreenTemplate").html(homeScreenCode);
      try {    window.eval($rootScope.authFunction);
      } catch (e) {
          alert(e);
      }
      /* End of Evaluate the default auth and home screen template code */
        console.log('results', results);
        if (!results) {
            /* If app has only auth applets and user is not logged In */
            $location.path('/app/SignIn279/SignIn279');
        } else {
            var menudata = results;
            $rootScope.dockApplets = menudata.docks;
            menudata.menus = $rootScope.removeDuplicates(menudata);
            $rootScope.rbacnavmenu = $rootScope.buildMenuTree(menudata.menus);
            $rootScope.rbacallmenus = menudata.menus;
            console.log('$rootScope.rbacnavmenu', $rootScope.rbacnavmenu);
            console.log('$rootScope.rbacallmenus', $rootScope.rbacallmenus);
            angular.forEach(menudata.menus, function(value, key) {
                if (value.id == menudata.landingPages[0].pageId) {
                    $rootScope.landingPage = value;
                }
            });
            if ($rootScope.loadUserRbac) {
                $location.path('/app/Settings2/Settings2Page9');
                $rootScope.getNotificationBadgeMobile();
                var badgeInterval = 2 * 60 * 1000; //every two minute
                setInterval($rootScope.getNotificationBadgeMobile, badgeInterval);
                $rootScope.loadUnacknowledgedMessage();
            } else {
                $location.path($rootScope.landingPage.url);
            }
        }
    });

}]);

var unifyedSiteGroupDirectives = angular.module('siteGroupHeaderDirective', []);
unifyedSiteGroupDirectives.directive('sitegrouppageheader', ['$routeParams', '$compile', '$http', '$rootScope', '$sce', '$window', '$location', '$q','$route', function ($routeParams, $compile, $http, $rootScope, $sce, $window, $location, $q, $route) {
  return {
    restrict: 'E',
    templateUrl: 'app/components/groups/sitegrouppageheader.html',
    link: function (scope, element, attr) {
      var groupid = $routeParams.sitebaseurl;
      var pageid = $routeParams.id;
      scope.inviteloaded = false;
      scope.isMember = false;
      scope.isAdmin = false;
      $rootScope.groupsiteid = '';
      $rootScope.selectedGroupPageUrl = pageid;
      $rootScope.rbacGroupMenuGenerated = false;

      var siteInfoUrl = '/unifyedsitegroups/api/v1/sitegroups/siteinfo?groupid=' + groupid + '&pageid=' + pageid + '&domain=' + $rootScope.user.domain;
      $rootScope.callGroupsAPI(siteInfoUrl, 'GET', {}, function(siteRes) {
        var siteDoc = siteRes.data;
        if (!siteDoc) {
            console.error('Siteinfo for group not found !');
            return;
        }
        window.globalsiteid = siteDoc.siteid;
        $rootScope.groupsiteid = siteDoc.siteid;
        window.siteGroupId = siteDoc.siteGroupId;              
        let url1 = "/unifyedrbac/rbac/user?user=" + $rootScope.user.email;
        $rootScope.callAPI(url1, 'GET', {}, function(response) {
            console.log('userrbac', response);  
            if (response && response.data) {
              $rootScope.rbacGroupMenuGenerated = true;
              var menudata = response.data;
              // $rootScope.dockApplets = menudata.docks;
              menudata.menus = $rootScope.removeDuplicates(menudata);
              $rootScope.rbacnavmenu = $rootScope.buildMenuTree(menudata.menus);
              $rootScope.rbacallmenus = menudata.menus;
              console.log('##$rootScope.rbacnavmenu', $rootScope.rbacnavmenu);
              console.log('##$rootScope.rbacallmenus', $rootScope.rbacallmenus);
              if ($rootScope.rbacallmenus && $rootScope.rbacallmenus.length > 0) {
                $rootScope.appletTitle = $rootScope.rbacallmenus[0].label;
              }
              if($rootScope.rbacnavmenu.length > 3){
                var swiper = new Swiper('.groupNavSwipe', {
                  loop: false,
                  grabCursor: true,
                  slidesPerView: 'auto'
                })
              }
            }
        });

        var url = "/unifyedsitegroups/api/v1/sitegroups/open/find?" + "siteid=" + siteDoc.siteid + "&groupEndpoint=" + groupid;
        $rootScope.callGroupsAPI(url, 'GET', {}, function (sitegroupresp) {
          scope.currentgroup = sitegroupresp.data;
          scope.isAdmin = scope.currentgroup.groupAdmins.users.indexOf($rootScope.user.email) >= 0;
          scope.fetchGroupMembers(scope.currentgroup).then(function (members) {
            // do nothing...
          });
          if ($rootScope.user && $rootScope.user.email) {
            scope.isMember = scope.currentgroup.groupMembers.users.indexOf($rootScope.user.email) >= 0 || scope.currentgroup.groupAdmins.users.indexOf($rootScope.user.email) >= 0;
          }
          fetchGroups();
          if (scope.isMember) {
            if (scope.currentgroup.privacy == 'P'|| scope.currentgroup.privacy == 'R') {
              scope.fetchUserGroupInvite(scope.currentgroup);
              if (scope.isAdmin) {
                fetchPendingInvites();
              }
            }
            if (scope.currentgroup.privacy == 'R') {
              scope.fetchUserGroupJoinRequests(scope.currentgroup);
            }
          }
        });
      });



      scope.fetchGroupHistory = function (group) {
        const groupsEndpoint = '/unifyedsitegroups/api/v1/history/' + group._id;
        $rootScope.callGroupsAPI(groupsEndpoint, 'GET', {}, function (res) {
          if (res && res.data) {
            group._history = res.data;
          }
        });
      };
      scope.getHValue =function(hValue){
        if(angular.isArray(hValue)){
          return hValue[0];
        }else{
          return hValue;
        }
      }
      scope.showGroupInfo = function (group) {
        var isMember = group.groupMembers.users.indexOf($rootScope.user.email) != -1;
        var isAdmin = group.groupAdmins.users.indexOf($rootScope.user.email) != -1;
        if (group.privacy == 'U' || isMember || isAdmin) {
          scope.fetchGroupMembers(group).then(function (members) {
            // do nothing... 
          });
          scope.fetchGroupHistory(group);
          scope.fetchGroupOwnerInfo(group)
          scope.fetchGroupAdminUsersInfo(group);
        }
        $("#groupInfoModal").modal("show");
      }
      scope.fetchGroupOwnerInfo = function (group) {
        if (!group.createdBy) return;
        var identityEndpoint = "/unifydidentity/user/search/findOneByEmail?email=" + encodeURIComponent(group.createdBy);
        $rootScope.callGroupsAPI(identityEndpoint, 'GET', null, function (res) {
          if (res && res.data) {
            scope.selectedGroupOwnerInfo = res.data;
          } else {
            //handle error
          }
        });
      };

       var removeGroupFromGroupPending= false;
  scope.removeGroupFromGroup = function(groupName){
    
    if (removeGroupFromGroupPending) return;
    showPrompt({
      title: "Remove group",
      msg: "Please confirm, Do you want to remove group " + groupName
    }, function (btnIdx) {
      if (btnIdx == 1) {
        $.blockUI();
        removeGroupFromGroupPending = true;
        const groupsEndpoint = '/unifyedsitegroups/api/v1/sitegroups/' + scope.currentgroup._id + "/removegroup";
        $rootScope.callGroupsAPI(groupsEndpoint, 'POST', {
          group: groupName
        }, function (res) {
          $.unblockUI();
          removeGroupFromGroupPending = false;

          if (res && res.data) {
            if (res.data.status == "Success") {
              
              var grpIdx = scope.currentgroup.groupMembers.groups.indexOf(groupName);
              if (grpIdx != -1) {
                scope.currentgroup.groupMembers.groups.splice(grpIdx, 1);
              }
              if (!scope.currentgroup.groupMembers.users.length && !scope.currentgroup.groupMembers.groups.length ) {
                setTimeout(function () {
                  $("#viewMembers").modal("hide");
                }, 200)
              }
            }
          }
        });
      }
    });

  };
      scope.fetchGroupAdminUsersInfo = function (group) {
        var adminsEndpoint = '/unifyedsitegroups/api/v1/sitegroups/' + group._id + "/admins";
        $rootScope.callGroupsAPI(adminsEndpoint, 'GET', null, function (res) {
          if (res && res.data) {
            scope.selectedGroupAdminsDetails = res.data;
          } else {
            // handle error
          }
        })
      }

      $("body").on("click", function(){
         $("#manageGroup").removeClass("open");
      });

      scope.openFolderDropDown = function () {
        $("#manageGroup").toggleClass("open");
      };

      scope.fetchUserGroupInvite = function (group) {
        var userEmail = $rootScope.user.email;
        const groupsEndpoint = '/unifyedsitegroups/api/v1/invites/' + group._id + "/users/" + encodeURI(userEmail) + "/invites";
        $rootScope.callGroupsAPI(groupsEndpoint, 'GET', {}, function (res) {
          scope.userSiteGroupsInvite = res.data;
        });
      };
      scope.joinRequestsLoading=false;
      scope.showJoinRequests = function () {
        if(scope.joinRequestsLoading) return;

        scope.joinRequestsLoading=true;
        $("#joinRequestModal").modal("show");

        $rootScope.callGroupsAPI("/unifyedsitegroups/api/v1/sitegroups/" + scope.currentgroup._id + "/joinrequests", 'GET', {}, function (res) {
          scope.joinRequestsLoading=false;
          scope.currentgroup.joinrequests = res.data;
        });
      }
      scope.showInviteRequests = function () {
        $("#inviteRequestModal").modal("show");
        scope.fetchGroupInvitations(scope.currentgroup);
      };
      scope.viewRequests = function (type) {
        if (type == 'INVITE') {
         scope.showInviteRequests();

        } else if (type == 'JOIN') {
                    scope.showJoinRequests();

        }
      }
      scope.groupInvitesLoading=false;
      scope.fetchGroupInvitations = function (group) {
        if(scope.groupInvitesLoading) return;
        scope.groupInvitesLoading=true;
        var userEmail = $rootScope.user.email;
        var invitationEndpoint = "/unifyedsitegroups/api/v1/invites/" + group._id + "/invites";
        $rootScope.callGroupsAPI(invitationEndpoint, 'GET', {}, function (res) {
          scope.groupInvitesLoading=false;
          scope.groupInvites = res.data;
        });
      };

      var acceptRequestPending = false;
      scope.acceptRequest = function (jreq, $index) {
        if (acceptRequestPending) return;

        acceptRequestPending = true;

        $.blockUI();
        $rootScope.callGroupsAPI("/unifyedsitegroups/api/v1/sitegroups/" + jreq.groupid + "/acceptrequest/" + jreq._id, 'POST', {}, function (res) {
          scope.currentgroup.joinrequests.splice($index, 1);
          acceptRequestPending = false;
          $.unblockUI();
        });
      }
      var denyRequestPending = false;
      scope.denyRequest = function (jreq, $index) {
        if (denyRequestPending) return;
        denyRequestPending = true;
        $.blockUI();
        $rootScope.callGroupsAPI("/unifyedsitegroups/api/v1/sitegroups/" + jreq.groupid + "/denyrequest/" + jreq._id, 'POST', {}, function (res) {
          scope.currentgroup.joinrequests.splice($index, 1);
          denyRequestPending = false;
          $.unblockUI();
        });
      }
      scope.fetchUserGroupJoinRequests = function (group) {
        var userEmail = $rootScope.user.email;
        const groupsEndpoint = '/unifyedsitegroups/api/v1/sitegroups/' + group._id + "/users/" + encodeURI(userEmail) + "/joinrequest";
        $rootScope.callGroupsAPI(groupsEndpoint, 'GET', {}, function (res) {
          group.joinRequests = res.data;
        });
      };

      var applyJoinGroupPending = false;
      scope.applyJoinGroup = function (group) {

        if(!$rootScope.user ||  !$rootScope.user.email){
          window.location.href="/";
        }

        if (applyJoinGroupPending) return;
        applyJoinGroupPending = true;
        $.blockUI();
        if (group.privacy == 'U' || group.privacy == 'R') {
          const groupsEndpoint = '/unifyedsitegroups/api/v1/sitegroups/' + group._id + "/joinrequests";
          $rootScope.callGroupsAPI(groupsEndpoint, 'POST', {
            user: $rootScope.user.email
          }, function (res) {
            applyJoinGroupPending = false;
            $.unblockUI();
            if (res && res.data && res.data.status == "Success") {
              alert(res.data.message);
              $route.reload(true);
            }
          });
        }
      };

      var invitationRequestPending = false;
      scope.acceptInvitationRequest = function () {
        if (invitationRequestPending) return;

        invitationRequestPending = true;
        $.blockUI();

        $rootScope.callGroupsAPI("/unifyedsitegroups/api/v1/sitegroups/" + scope.currentgroup.groupid + "/acceptrequest/" + scope.userSiteGroupsInvite._id, 'GET', {}, function (res) {
          console.log("request accepted", res.data);
          invitationRequestPending = false;
          $.unblockUI();
        });
      };

      scope.loadGroupMembersPending = false;
      scope.fetchGroupMembers = function (group) {
        var deferred = $q.defer();
        if (scope.loadGroupMembersPending) {
          deferred.resolve({ status: "pending" });
          return deferred.promise;
        }

        scope.loadGroupMembersPending = true;
        var siteGroupMembersEndpoint = "/unifyedsitegroups/api/v1/sitegroups/" + group._id + "/members";
        $.blockUI();
        $rootScope.callGroupsAPI(siteGroupMembersEndpoint, 'GET', {}, function (res) {
          if (res && res.data) {
            scope.currentgroup._members = res.data;
            scope.loadGroupMembersPending = false;
            $.unblockUI();
            deferred.resolve(res.data);
          } else {
            deferred.reject({ error: "Failed to load group members" })
          }
        });
        return deferred.promise;
      };

      var withdrawInvitePending = false;
      scope.withdrawInvite = function (invite) {
        if (withdrawInvitePending) return;
        showPrompt({ title: "Withdraw invitation request.", msg: "Do you really want to withdraw invite to " + invite.invitee.firstName + " " + invite.invitee.lastName }, function (btnIdx) {
          if (btnIdx == 1) {
            withdrawInvitePending = true;
            $.blockUI();
            var withdrawEndpoint = "/unifyedsitegroups/api/v1/invites/" + scope.currentgroup._id + "/invites/" + invite._id + "/withdraw";
            $rootScope.callGroupsAPI(withdrawEndpoint, 'GET', {}, function (res) {

              var inviteIdx = scope.groupInvites.indexOf(invite);
              scope.groupInvites.splice(inviteIdx, 1);
              $.unblockUI();
              withdrawInvitePending = false;
              if (!scope.groupInvites.length) {
                setTimeout(function () {
                  $("#inviteRequestModal").modal("hide");
                }, 200)
              }
              scope.$digest();
            });
          }
        });
      };

      scope.toBeAdmins = [];
      scope.addUserTobeAdmin = function ($index, u) {
        var idx = scope.toBeAdmins.indexOf(u);
        if (idx == -1) {
          scope.toBeAdmins.push(u);
        } else {
          scope.toBeAdmins.splice(idx, 1);
        }
      }
      scope.adminAssignOpPending = false;
      scope.assignAdminToGroup = function (group, $event, autoClose) {
        //console.log('scope..', $scope.toBeAdmins);
        if (scope.adminAssignOpPending) return;
        if (!scope.toBeAdmins.length) {
          alert("Please select atleast one member");
          return;
        }
        var postData = scope.toBeAdmins.map(function (tobe) {
          return tobe.user[0].email;
        });
        var siteGroupAdminpoint = "/unifyedsitegroups/api/v1/sitegroups/" + group._id + "/admins";
        $ele = $($event.target);
        scope.adminAssignOpPending = true;
        $.blockUI();
        $ele.text("Assigning...");
        $rootScope.callGroupsAPI(siteGroupAdminpoint, 'POST', {
          users: postData
        }, function (res) {
          $.unblockUI();
          if (res) {
            group.groupAdmins.users = group.groupAdmins.users.concat(postData);
            $ele.text("Admin Assigned");
          }
          scope.adminAssignOpPending = false;
          setTimeout(function () {
            $ele.text("Assign Admin");
            if (autoClose) {
              $("#assignAdminModal").modal("hide");
            }
          }, 300);

        });
      };

      scope.openAssignAdminModal = function (group) {
        scope.toBeAdmins = [];
        if (group.groupAdmins.users.indexOf($rootScope.user.email) == -1) {
          return;
        }
        var ncheckNonAdminMembers = group.groupMembers.users.filter(function (n) {
          return group.groupAdmins.users.indexOf(n) == -1;
        });

        scope.assignableAdmins = [];

        if (!ncheckNonAdminMembers.length) {
          alert("There is no non admin user in group to assign.");
          return;
        }
        scope.fetchGroupMembers(group).then(function (members) {
          scope.assignableAdmins = group._members.filter(function(member){
              return group.groupAdmins.users.indexOf(member.user[0].email) == -1;
          });

          $("#assignAdminModal").modal("show");
        }).catch(function (err) {
          alert("Failed to load group members");
        });
      };


      var deleteSiteGroupPending = false;
      scope.deleteMain = function (group) {
        if (deleteSiteGroupPending) return;
        $.blockUI();
        deleteSiteGroupPending = true;
        const groupsEndpoint = '/unifyedsitegroups/api/v1/sitegroups/' + group._id;
        $rootScope.callGroupsAPI(groupsEndpoint, 'DELETE', {}, function (res) {
          $.unblockUI();
          deleteSiteGroupPending = false;
          if (res && res.data) {
            if (res.data.status == "Success") {
              alert(res.data.message);
              window.location.href="/";
            }
          }
        });
      };

      scope.deleteGroup = function (group) {
        if (group.groupAdmins.users.indexOf($rootScope.user.email) == -1) {
          alert("Invalid operation");
          return;
        }

        showPrompt({ title: "Delete group " + group.name, msg: "Are you sure you want to delete " + group.name + " group", defaultText: "Confirm delete group" }, function (btnindex) {
          if (btnindex == 1) {
            scope.deleteMain(group);
          }
        });
      };

      scope.groupMembersLoading=false;
      scope.viewMembers = function () {
        if(scope.groupMembersLoading) return;
        scope.groupMembersLoading=true;
        scope.fetchGroupMembers(scope.currentgroup).then(function (members) {
          scope.groupMembersLoading=false;
          if (!scope.currentgroup.groupMembers.groups && scope.currentgroup.groupMembers.users.length == 1 && scope.currentgroup.groupMembers.users[0] == $rootScope.user.email) {
            alert("You are the only member in the group.");
          } else {
            $("#viewMembers").modal("show");
          }
        }).catch(function (err) {
          alert("Failed to load group members.");
        });
      };

      var fetchGroups = function () {
        $rootScope.callGroupsAPI("/unifydplatform/open/groups", 'GET', {}, function (res) {
          if (res && res.data) {
            var groups = res.data;
            scope.allGroups = groups.filter(function (group) {
              return scope.currentgroup.groupMembers.groups.indexOf(group.group) == -1;
            });
          }
        });
      }

      function fetchPendingInvites() {
        var userInvitationEndpoint = "/unifyedsitegroups/api/v1/invites/pending";
        $rootScope.callGroupsAPI(userInvitationEndpoint, 'GET', {}, function (res) {
          var pendingInvites = res.data;
          var groupsPendingInvites = {};
          pendingInvites.forEach(function (invite) {
            if (!groupsPendingInvites[invite.group.id]) {
              groupsPendingInvites[invite.group.id] = [invite];
            } else {
              groupsPendingInvites[invite.group.id].push(invite);
            }
          });
          scope.groupsPendingInvites = groupsPendingInvites;
        });
      }
      scope.addGroupToInvitee = function (index, group) {
        var idx = scope.tobeInvited.groups.indexOf(group);
        if (idx == -1) {
          scope.tobeInvited.groups.push(group);
        } else {
          scope.tobeInvited.groups.splice(idx, 1);
        }
      };

      scope.tobeInvited = {
        groups: [],
        users: []
      };
      scope.openInvitationModal = function () {
        scope.tobeInvited = {
          groups: [],
          users: []
        };
        $("#inviteUsersModal").modal("show");
        // open invite people
      };

      scope.isGroupChecked = function (group, groupArray) {
        return groupArray.indexOf(group) != -1;
      }

      function showPrompt(options, onConfirm) {
        if (window.device) {
          navigator.notification.confirm(options.msg, onConfirm, "Are you sure ?", "Yes,No");
        } else {
          if ($rootScope.webApp) {
            $.confirm({
              animation: options.animation || 'none',
              //icon: 'deleteIcon',
              title: options.title || "Confirm",
              titleClass: options.titleClass || 'proximaSemiBoldFont fontSize18 textcenter',
              content: options.msg,
              columnClass: options.columnClass || 'col-lg-6 col-lg-offset-3 col-md-6 col-md-offset-3 col-sm-8 col-sm-offset-2 col-xs-10 col-xs-offset-1',
              buttons: {
                NO: {
                  'btnClass': 'btn-cancel boxradius popBtns',
                  'action': function () {

                  }
                },
                YES: {
                  'btnClass': 'btn btn-primary btn-success boxradius marginleft30px popBtns',
                  'action': function () {
                    onConfirm(1);
                  }
                }
              }
            });
          }
        }
      }


       scope.inviteeSearchResults = {data:[], page:{page:1,size:20},hasMore:true};
      var invitePending = false;
      scope.invitePeople = function () {
        if (invitePending) return;
        if (!scope.tobeInvited.users.length && !scope.tobeInvited.groups.length) {
          alert("Please select atlease one item.");
        } else {
          var inviteEndpoint = '/unifyedsitegroups/api/v1/invites/' + scope.currentgroup._id + "/invites";
          var group = {
            id: scope.currentgroup._id,
            name: scope.currentgroup.name,
            groupEndpoint: scope.currentgroup.groupEndpoint
          };
          var raisedBy = {
            name: $rootScope.user.firstName + " " + $rootScope.user.lastName,
            email: $rootScope.user.email
          };

          invitePending = true;
          $.blockUI();
          $rootScope.callGroupsAPI(inviteEndpoint, 'POST', {
            group: group,
            raisedBy: raisedBy,
            invitees: scope.tobeInvited
          }, function (res) {
            $.unblockUI();
            invitePending = false;
        if (scope.currentgroup.privacy == 'P') {
            var groupsAdded = _.map(scope.tobeInvited.groups, function(group){ return group.group});
            var usersAdded = _.map(scope.tobeInvited.users, function(user){ return user.email});
            scope.currentgroup.groupMembers.groups= _.union(scope.currentgroup.groupMembers.groups, groupsAdded);
            scope.currentgroup.groupMembers.users= _.union(scope.currentgroup.groupMembers.users, usersAdded);
          }

               scope.inviteeSearchResults = {data:[], page:{page:1,size:20},hasMore:true};
              setTimeout(function () {
                //$("#sendInviteBtn").text("Send Invite");
                $("#inviteUsersModal").modal("hide");
              }, 100);
          });
        }
      };


      $("#inviteUsersModal").on('hidden.bs.modal', function (e) {
        scope.tobeInvited = {
          groups: [],
          users: []
        };
        scope.inviteeSearchResults = {data:[], page:{page:1,size:20},hasMore:true};
        scope.userSearchKey = "";
        scope.$digest();
      });
      scope.inviteeSearch = function (searchKey, $event) {
        if (!searchKey) {
          scope.inviteeSearchResults = {data:[], page:{page:1,size:20},hasMore:true};
          return;
        }
        var keyCode = $event.keyCode || $event.which;

        if (keyCode != 13) {
          return;
        }
        scope.inviteeSearch1(searchKey, $event);
      };

      scope.inviteeSearch1 = function (searchKey, $event) {
        var inviteSearchEndpoint = "/unifyedsitegroups/api/v1/invites/searchcandidate?qs=" + searchKey + "&gid="+scope.currentgroup._id+"&page="+ scope.inviteeSearchResults.page.page + "&size="+ scope.inviteeSearchResults.page.size;
        $rootScope.callGroupsAPI(inviteSearchEndpoint, 'GET', {}, function (res) {
          scope.inviteeSearchResults.data = _.concat(scope.inviteeSearchResults.data, res.data.data);
          scope.inviteeSearchResults.page.page+=1;
          scope.inviteeSearchResults.hasMore= (res.data.data.length ==  scope.inviteeSearchResults.page.size);
        });
      };

      scope.addUserToInvitee = function (index, u) {
        scope.inviteeSearchResults.data.splice(index, 1);
        scope.tobeInvited.users.push(u);
      };
      scope.removeSelectedUser = function (index, u) {
        scope.tobeInvited.users.splice(index, 1);
        scope.inviteeSearchResults.data.push(u);
      };


      var removeUserFromGroupPending = false;
      scope.removeUserFromGroup = function (sguser) {

        showPrompt({ title: "Remove user", msg: "Please confirm, Do you want to remove user " + sguser.user[0].firstName + " " + sguser.user[0].lastName, defaultText: "Confirm remove user" }, function (btnIdx) {
          if (btnIdx == 1) {
            if (removeUserFromGroupPending) return;
            removeUserFromGroupPending = true;
            $.blockUI();
            const groupsEndpoint = '/unifyedsitegroups/api/v1/sitegroups/' + scope.currentgroup._id + "/removemember";
            $rootScope.callGroupsAPI(groupsEndpoint, 'POST', {
              user: sguser.user[0].email
            }, function (res) {
              $.unblockUI();
              removeUserFromGroupPending = false;

              if (res && res.data) {
                if (res.data.status == "Success") {
                  var idx = scope.currentgroup._members.indexOf(sguser);
                  scope.currentgroup._members.splice(idx, 1);
                  var userIdx = scope.currentgroup.groupMembers.indexOf(sguser.user[0].email);
                  if (userIdx != -1) {
                    scope.currentgroup.groupMembers.splice(userIdx, 1);
                  }
                  if (!scope.currentgroup.groupMembers.length) {
                    setTimeout(function () {
                      $("#viewMembers").modal("hide");
                    }, 200);
                  }
                  scope.$digest();
                }
              }
            });
          }
        });
      };

      var leaveGroupPending = false;
      function leaveGroup1(group) {
        if (leaveGroupPending) return;
        leaveGroupPending = true;
        $.blockUI();
        const groupsEndpoint = '/unifyedsitegroups/api/v1/sitegroups/' + group._id + "/leavesitegroup";
        $rootScope.callGroupsAPI(groupsEndpoint, 'POST', {
          user: $rootScope.user.email
        }, function (res) {
          leaveGroupPending = false;
          $.unblockUI()
          if (res && res.data) {
            $("#leaveGroup").modal("hide");
            if (res.data.status == "Success") {
              alert(res.data.message);
              setTimeout(function(){
                window.close();
              },500)
            }
          }
        });
      }

      scope.leaveGroup1 = leaveGroup1;
      scope.leaveGroup = function (group) {
        showPrompt({ title: "Leave group " + group.name, msg: "Are you sure you want to leave " + group.name + " group", defaultText: "Confirm leave group" }, function (btnindex) {
          if (btnindex == 1) {
            leaveGroup1(group);
          }
        });
      };

      $(".groups-applet").on("click", function (ev) {
        $("#manageGroup").removeClass("open");
      });


      scope.leveGroup0 = function (group) {
        var isAdmin = group.groupAdmins.users.indexOf($rootScope.user.email) != -1;
        var isMember = group.groupMembers.users.indexOf($rootScope.user.email) != -1;
        if (isAdmin && group.groupAdmins.users.length <= 1) {
          scope.fetchGroupMembers(group).then(function (members) {
            // do nothing..
          });
        }
        $scope.otherassignable = false;
        if (isMember && !isAdmin) {
          if (group.groupMembers.users.length > 1) {
            $scope.otherassignable = true;
          }
          scope.leaveGroup(group);
        }
        if (isAdmin) {
          $("#leaveGroup").modal("show");
        }
      };

      $('.u8PopupBg').on('show.bs.modal', function (e) {
        setTimeout(function () {
          $(".modal-backdrop.in").hide();
        }, 300);
      });
      //fix modal popup issue
      var windowWidth = $(window).width();
      setTimeout(function () {
        if (windowWidth < 768) {
          $('.u8PopupBg').on('show.bs.modal', function (e) {
            $('.owl-stage-outer').addClass('remove-carousel');
            $('.owl-stage').addClass('remove-carousel');
          });

          $('.u8PopupBg').on('hidden.bs.modal', function (e) {
            $('.owl-stage-outer').removeClass('remove-carousel');
            $('.owl-stage').removeClass('remove-carousel');
          });
        }
      }, 1000);

    }
  };
}]);

var siteGroupCtrl = angular.module('siteGroupCtrl', []);

siteGroupCtrl.controller('unifyedSiteGroupPageCtrl',  ['$rootScope', '$scope', '$routeParams', '$http', '$compile', '$sce',
  function ($rootScope, $scope, $routeParams, $http, $compile, $sce) {
    console.log('in site group page controller');
  	
}]);