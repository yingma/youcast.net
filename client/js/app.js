var app = angular.module('starter',
  ['starter.login', 'starter.inbox', 'starter.register', 'starter.confirmation', 'starter.forgot', 'ui.router', 
  'starter.header', 'starter.settings', 'starter.sidebar', 'starter.room', 'starter.message', 'starter.home', 'starter.team', 'starter.team1']);

app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.push('LoadingInterceptor');
}]);

app.factory('notifyingService', function($rootScope) {
    return {
        subscribe: function(scope, topic, callback) {
            var handler = $rootScope.$on(topic, callback);
            scope.$on('$destroy', handler);
        },

        notify: function(topic, room) {
            $rootScope.$emit(topic, room);
        }
    };
});

app.config(function(toastrConfig) {
  angular.extend(toastrConfig, {
    autoDismiss: true,
    containerId: 'toast-container',
    maxOpened: 0,    
    newestOnTop: true,
    positionClass: 'toast-top-center',
    preventDuplicates: false,
    preventOpenDuplicates: false,
    target: 'body'
  });
}); 

app.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('login', {
      cache: false,
      url: '/login',
      views: {
        'content@': {
            templateUrl: 'components/Login/login.view.html',
            controller: 'LoginCtrl'  
        }
      }
    })
    .state('register', {
      cache: false,
      url: '/register',
      views: {
        'content@': {
          templateUrl: 'components/Register/register.view.html',
          controller: 'RegisterCtrl'  
        }
      }    
    })
    .state('confirm', {
      cache: false,
      url: '/confirm/:user',
      views: {
        'content@': {
          templateUrl: 'components/Confirmation/confirmation.view.html',
          controller: 'ConfirmationCtrl'
        }
      }
    })
    .state('forgot', {
      cache: false,
      url: '/forgot',
      views: {
        'content@': {
          templateUrl: 'components/Forgot/forgotstep1.view.html',
          controller: 'ForgotPasswordCtrl'
        }
      }
    })
    .state('forgot2', {
      cache: false,
      url: '/forgot/:email',
      views: {
        'content@': {
          templateUrl: 'components/Forgot/forgotstep2.view.html',
          controller: 'ForgotPasswordCtrl'
        }
      }
    })
    .state('settings', {
      cache: false,
      url: '/settings',
      views: {
        'content@': {
          templateUrl: 'components/Settings/settings.view.html',
          controller: 'SettingsCtrl'
        }
      }
    })
    .state('team', {
      cache: false,
      url: '/team/:room',
      views: {
        'content@': {
          templateUrl: 'components/Team/team.view.html',
          controller: 'TeamCtrl'
        }
      }
    })
    .state('team1', {
      cache: false,
      url: '/team1/:room',
      views: {
        'content@': {
          templateUrl: 'components/Team1/team.view.html',
          controller: 'TeamCtrl1'
        }
      }
    })
    .state('phoneconfirm', {
      cache: false,
      url: '/settings/:phone',
      views: {
        'content@': {
          templateUrl: 'components/Settings/phone.view.html',
          controller: 'SettingsCtrl'
        }
      }  
    })
    .state('home', {
      cache: false,
      url: '/home',
      views: {
        'content@': {
          templateUrl: 'components/Home/home.view.html',
          controller: 'HomeCtrl'
        }
      }  
    })
    .state('room', {
      cache: false,
      url: '/room/:room/:type?',
      views: {
        'content@': {
          templateUrl: 'components/Room/room.view.html',
          controller: 'RoomCtrl'
        }
      }
    })
    .state('inbox', {
      cache: false,
      url: '/inbox/:room',
      views: {
        'content@': {
          templateUrl: 'components/Message/inbox.view.html',
          controller: 'InboxCtrl'
        }
      }
    })
    .state('message', {
      cache: false,
      url: '/message/:room/:user/{key:int}/{time:int}/:number?/:name?',
      views: {
        'content@': {
          templateUrl: 'components/Message/message.view.html',
          controller: 'MessageCtrl'
        }
      }
    })
    .state('login1', {
      cache: false,
      url: '/login/:url',
      views: {
        'content@': {
            templateUrl: 'components/Login/login.view.html',
            controller: 'LoginCtrl'  
        }
      }
    })
    .state('howto', {
      cache: false,
      url: '/howto',
      views: {
        'content@': {
            templateUrl: 'components/Howto/howto.html'
        }
      }
    })
    .state('faqs', {
      cache: false,
      url: '/faqs',
      views: {
        'content@': {
            templateUrl: 'components/Faqs/faqs.html'
        }
      }
    })
    .state('contact', {
      cache: false,
      url: '/contact',
      views: {
        'content@': {
            templateUrl: 'components/About/contact.html'
        }
      }
    })
    .state('about', {
      cache: false,
      url: '/about',
      views: {
        'content@': {
            templateUrl: 'components/About/about.html'
        }
      }
    })
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/login');
});
