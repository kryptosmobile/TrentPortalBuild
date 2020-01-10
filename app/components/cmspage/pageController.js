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
