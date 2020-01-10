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
