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
