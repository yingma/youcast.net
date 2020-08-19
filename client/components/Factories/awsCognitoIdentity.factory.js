var mod = angular.module('aws.cognito.identity', []);

mod.factory('awsCognitoIdentityFactory', function() {
    var aws = {};
    var cognitoUser = null; //CognitoUser object

    /* CUSTOM AWS COGNITO CONFIGURATION */
    // http://docs.aws.amazon.com/general/latest/gr/rande.html#cognito_identity_region
    var cognitoEndpoint = environment.cognitoEndpoint;
    // region
    var region = environment.region;
    // how to get userPoolId, go to AWS Console -> Cognito -> User pools -> <select_user_pool> -> Pool details -> Pool Id
    var userPoolId = environment.userPoolId;
    // how to get clientId, go to AWS Console -> Cognito -> User pools -> <select_user_pool> -> Apps -> App client id
    var clientId = environment.clientId;
    // how to get identityPoolId, go to AWS Console -> Cognito -> Federate Identities > <select_federate_identity> -> Edit -> Identity pool ID
    var identityPoolId = environment.identityPoolId;
    /* *********************************** */

    AWS.config.region = region;
    AWS.config.credentials =
    new AWSCognito.CognitoIdentityCredentials({ IdentityPoolId: identityPoolId });

    AWSCognito.config.region = region;
    AWSCognito.config.credentials = new AWSCognito.CognitoIdentityCredentials({ IdentityPoolId: identityPoolId });
    AWSCognito.config.update({ accessKeyId: 'anything', secretAccessKey: 'anything' })

    var poolData = { UserPoolId: userPoolId, ClientId: clientId };
    var userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);

    /* Public methods */

    var observerCallbacks = [];

      //register an observer
    aws.registerLoginCallback = function(callback){
        observerCallbacks.push(callback);
    };

    //call this when you know 'foo' has been changed
    var notifyObservers = function(auth){
        angular.forEach(observerCallbacks, function(callback){
            callback(auth);
        });
    };


    // Register a new user in Aws Cognito User pool
    aws.signUp = function(username, email, /*phone, */ password, callback) {
        setupUser(username)

        var attributeList = [];
        var dataEmail = { 
            Name: 'email', 
            Value: email 
        }

        /*
        var dataPhone = { 
            Name: 'phone number', 
            Value: phone
        }
        */

        var attributeEmail =
          new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);

        /*
        var attributePhone =
          new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataPhone);
        */

        attributeList.push(attributeEmail);
        //attributeList.push(attributePhone);
        return userPool.signUp(username, password, attributeList, null, callback);
    }


      // Login user and setup a credential object
    aws.signIn = function(username, password, callback) {
        setupUser(username);

        var authenticationData = { Username: username, Password: password };
        var authenticationDetails =
          new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function (result) {
                console.log('access token + ' + result.getAccessToken().getJwtToken());
                initConfigCredentials(result.idToken.jwtToken);
                notifyObservers(true);
                return AWS.config.credentials.get(callback);
            },
            onFailure: function(err) {
                return callback(err);
            },

            mfaRequired: function(codeDeliveryDetails) {
                // MFA is required to complete user authentication. 
                // Get the code from user and call 
                var mfaCode = Math.floor(Math.random() * 5);
                cognitoUser.sendMFACode(mfaCode, this);
                return callback("mfaRequired", cognitoUser);
            },

            newPasswordRequired: function(userAttributes, requiredAttributes) {
                // User was signed up by an admin and must provide new 
                // password and required attributes, if any, to complete 
                // authentication.

                // userAttributes: object, which is the user's current profile. It will list all attributes that are associated with the user. 
                // Required attributes according to schema, which don’t have any values yet, will have blank values.
                // requiredAttributes: list of attributes that must be set by the user along with new password to complete the sign-in.

                
                // Get these details and call 
                // newPassword: password that user has given
                // attributesData: object with key as attribute name and value that the user has given.
            //cognitoUser.completeNewPasswordChallenge(newPassword, attributesData, this);
                return callback("newPasswordRequired", cognitoUser);
            }
        });
    }

    // Logout user and clear a cache id which causes problem like was described here: https://github.com/aws/aws-sdk-js/issues/609
    aws.signOut = function() {
        if(cognitoUser != null) cognitoUser.signOut();
        cognitoUser = null;
        AWS.config.credentials.clearCachedId();
        notifyObservers(false);
        return true;
    }

    checkSession = function(session, callback) {
    
        if (AWS.config.credentials.needsRefresh()) {
            
            refresh_token = session.getRefreshToken(); // receive session from calling cognitoUser.getSession()

            cognitoUser.refreshSession(refresh_token, (err, session) => {
                if(err) {
                    notifyObservers(false);
                    return; 
                } 

                //return callback(null, session);     
                var loginInfo=[];   
                loginInfo[environment.cognitoEndpoint + '/' + userPoolId] = session.getIdToken().getJwtToken();
                AWS.config.credentials.params.Logins = loginInfo;
                
                AWS.config.credentials.refresh((err) => {
                    if(err)  {
                        console.log(err);
                        notifyObservers(false);
                        return;
                    }                    
                    return callback(null, session); 
                });
               
            });

        } else {
            return callback(null, session); 
        }
    }

    aws.getSession = function(callback) {

        cognitoUser = userPool.getCurrentUser();

        if (cognitoUser != null) {

            cognitoUser.getSession((err, session) =>{
                if (err) {
                    return callback(err); 
                }
                checkSession(session, (err, session) => {
                    if (err) {
                        return callback(err); 
                    }

                    return callback(null, session);
                });
            });

        } else {
           return callback({message:'validation error'});          
        }
    };


    // This method is useful when user must have access to the app in offline mode.
    aws.getUserFromLocalStorage = function(callback) {
        cognitoUser = userPool.getCurrentUser();
        if (cognitoUser != null) {
            cognitoUser.getSession(function(err, session) {
                if (err) {
                    callback(err);
                    return false;
                }
                //console.log('session validity: ' + session.isValid());
                initConfigCredentials(session.idToken.jwtToken);
                return callback(null, session.isValid());
            });
        }
    }

    aws.changePassword = function(oldPassword, newPassword, callback) {
        cognitoUser = userPool.getCurrentUser();
        if (cognitoUser != null) {
            cognitoUser.getSession(function(err, session) {
                if (err) {
                    callback(err);
                    return false;
                }
                cognitoUser.changePassword(oldPassword, newPassword, function(err, result) {
                    if (err) {
                        callback(err);
                        return false;
                    }
                    return callback(null, result);
                });
            });
        }
    }

    aws.forgotPassword = function(username, callback) {
        setupUser(username);
        cognitoUser.forgotPassword({
            onSuccess: function (result) {
                return callback(null, result);
            },
            onFailure: function(err) {
                callback(err);
                return false;
            },
            inputVerificationCode() {
                return callback(null);
            }
        });
    }

    aws.confirmNewPassword = function(username, verificationCode, password, callback) {
        setup(username);
        cognitoUser.confirmPassword(verificationCode, password, {
            onSuccess: function () {
                return callback(null, null);
            },
            onFailure: function (err) {
                callback(err);
                return false;
            }
        });
    }

    aws.updatePhone = function(phone, callback) {
        cognitoUser = userPool.getCurrentUser();

        if (cognitoUser != null) {
            cognitoUser.getSession(function(err, session) {
                var attributeList = [];
                var attribute = {
                    Name : 'phone_number',
                    Value : '+' + phone
                };
                var attribute = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(attribute);
                attributeList.push(attribute);

                cognitoUser.updateAttributes(attributeList, function(err, result) {
                    if (err) {
                        callback(err);
                        return false;
                    }
                    return callback(null, result);
                });
            });
        }
    }

    aws.getUserAttributes = function(callback) {
        cognitoUser = userPool.getCurrentUser();

        if (cognitoUser != null) {
            cognitoUser.getSession(function(err, session) {
                if (err){
                    return callback(err);
                }
                cognitoUser.getUserAttributes(function(err, result) {
                    if (err) {
                        callback(err);
                        return false;
                    }
                    var attrs = {};
                    for (i = 0; i < result.length; i++) {
                        console.log('attribute ' + result[i].getName() + ' has value ' + result[i].getValue());
                        attrs[result[i].getName()] = result[i].getValue();
                    }
                    return callback(null, attrs);
                });
            });
        }
    }

    aws.getAttributeVerficationCode = function(attribute, callback) {
        cognitoUser = userPool.getCurrentUser();
        if (cognitoUser != null) {
            cognitoUser.getSession(function(err, session) {
                cognitoUser.getAttributeVerificationCode(attribute, {
                    onSuccess: function(result) {
                        return callback(null, result);
                    },
                    onFailure: function(err) {
                        callback(err);
                        return false;
                    },
                    inputVerificationCode: function() {
                        return callback(null);
                    }
                });
            });
        }
    }

    aws.verifyPhone = function(code, callback) {
        cognitoUser = userPool.getCurrentUser();
        if (cognitoUser != null) {
            cognitoUser.getSession(function(err, session) {
                if (err){
                    return callback(err);
                }

                cognitoUser.verifyAttribute('phone_number', code,  {
                    
                    onSuccess: function(result) {
                        return callback(null, result);
                    },
                    onFailure: function(err) {
                        callback(err);
                        return false;
                    }
                });
            });
        } else {
            return callback(err);
        }
    }

    aws.getUserName = function() {
        cognitoUser = userPool.getCurrentUser();
        if(cognitoUser != null) 
            return cognitoUser.username;
        return "";
    }

    aws.confirmAccount = function(username, code, callback) {
        setupUser(username);
        return cognitoUser.confirmRegistration(code, true, callback);
    }

    aws.resendCode = function(username, callback) {
        setupUser(username)
        return cognitoUser.resendConfirmationCode(callback);
    }

    /* Private methods */
    setupUser = function(username) {
        var userData = { Username : username, Pool : userPool };
        cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    }

    initConfigCredentials = function(jwtToken) {
        var logins = {};
        logins[cognitoEndpoint + "/" + userPoolId] = jwtToken;

        AWS.config.credentials = new AWSCognito.CognitoIdentityCredentials({
            IdentityPoolId: identityPoolId,
            Logins: logins
        });
     }

    return aws;
});
