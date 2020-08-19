'use strict';

// Keep this in sync with the HTML element id attributes. Keep it sorted.
var environment = {
    /* CUSTOM AWS COGNITO CONFIGURATION */
    // http://docs.aws.amazon.com/general/latest/gr/rande.html#cognito_identity_region
    cognitoEndpoint: 'cognito-idp.us-east-1.amazonaws.com',
    // region
    region: 'us-east-1',
    // ring time out
    ringTimeout: 60,
    // how to get userPoolId, go to AWS Console -> Cognito -> User pools -> <select_user_pool> -> Pool details -> Pool Id
    userPoolId: 'us-east-1_yhmFSpBCA',
    // how to get clientId, go to AWS Console -> Cognito -> User pools -> <select_user_pool> -> Apps -> App client id
    clientId: '4q0g2rjtchr0th74mh6djufi2m',
    // how to get identityPoolId, go to AWS Console -> Cognito -> Federate Identities > <select_federate_identity> -> Edit -> Identity pool ID
    identityPoolId: 'us-east-1:6a4c1a73-d975-4842-8edf-22040f10bae9',
    // create room gateway api 
    roomCreateUri: 'https://to6ysi70c5.execute-api.us-east-1.amazonaws.com/dev',
    // update room gateway api
    roomUpdateUri: 'https://72zuqjvvs1.execute-api.us-east-1.amazonaws.com/dev',
    // delete room gateway api
    roomDeleteUri: 'https://k50yxztgjh.execute-api.us-east-1.amazonaws.com/dev',
    // ring room api
    teamAddUri: 'https://aiu1s09r78.execute-api.us-east-1.amazonaws.com/dev',
    // remove team gateway api
    teamRemoveUri: 'https://a75ao2y2gd.execute-api.us-east-1.amazonaws.com/dev',
    // list team gateway api
    teamListUri: 'https://4i4v5agqkf.execute-api.us-east-1.amazonaws.com/dev',
    // join rooms gateway api
    roomJoinUri: 'https://a2074h5syg.execute-api.us-east-1.amazonaws.com/dev',
    // join rooms gateway api
    roomJoin1Uri: 'https://a2074h5syg.execute-api.us-east-1.amazonaws.com/dev',
     // invite rooms gateway api
    roomLeaveUri: 'https://9yyw4pa9d9.execute-api.us-east-1.amazonaws.com/dev',
    // list all message
    roomInviteUri: 'https://jrdu3ehmsk.execute-api.us-east-1.amazonaws.com/dev',
    // subscribe gateway api
    roomRingUri: 'https://gmjpu5qnec.execute-api.us-east-1.amazonaws.com/dev',
    // update subscribe gateway api
    roomNotifyUri: 'https://gim0t5rqaf.execute-api.us-east-1.amazonaws.com/dev',
    // list room gateway by user id
    userUpdateUri: 'https://72zuqjvvs1.execute-api.us-east-1.amazonaws.com/dev',
    // search user api
    searchUserUri: 'https://e0wtdru5t5.execute-api.us-east-1.amazonaws.com/dev',
    // list all message
    messageListUri: 'https://9jwadmu5m4.execute-api.us-east-1.amazonaws.com/dev',
    // subscribe gateway api
    roomSubscribeUri: 'https://k2cyc1kb50.execute-api.us-east-1.amazonaws.com/dev',
    // update subscribe gateway api
    roomUpdateSubscribeUri: 'https://893wf1g8nc.execute-api.us-east-1.amazonaws.com/dev',
    // list room gateway by user id
    roomListUri: 'https://8beoqse6r2.execute-api.us-east-1.amazonaws.com/dev',
    // list room subscribers
    subscriberListUri: 'https://6qf1e085t3.execute-api.us-east-1.amazonaws.com/dev',
    // room get
    roomGetUri: 'https://o9s84q4g78.execute-api.us-east-1.amazonaws.com/dev/',
    // get user
    userGetUri: 'https://yj7m42hv19.execute-api.us-east-1.amazonaws.com/dev',
    // data upload api
    fileAddFileUri: 'https://qjgh6lgy6h.execute-api.us-east-1.amazonaws.com/dev',
    // data delete api
    fileDeleteUri: 'https://11tcymlym8.execute-api.us-east-1.amazonaws.com/dev',
    // data get pai
    fileGetUri: 'https://i2xqk1mzn0.execute-api.us-east-1.amazonaws.com/dev',
    // data delete api
    fileListAllUri: 'https://muxmsviqk6.execute-api.us-east-1.amazonaws.com/dev',
    // submit files 
    fileSubmitUri: 'https://85f1en7w3b.execute-api.us-east-1.amazonaws.com/dev',
    // list file by time
    fileListUri: 'https://k5ztupvvrj.execute-api.us-east-1.amazonaws.com/dev',
    // compose sms
    composeSMSUri: 'https://pdwu1rrdy6.execute-api.us-east-1.amazonaws.com/dev'

};
