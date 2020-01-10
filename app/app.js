//'use strict';
onDeviceReady = () => {
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
