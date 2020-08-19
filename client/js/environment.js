    'use strict';

// Keep this in sync with the HTML element id attributes. Keep it sorted.
var environment = {
    /* CUSTOM AWS COGNITO CONFIGURATION */
    // http://docs.aws.amazon.com/general/latest/gr/rande.html#cognito_identity_region
    cognitoEndpoint: 'cognito-idp.us-east-1.amazonaws.com',
    region: 'us-east-1',
    // how to get userPoolId, go to AWS Console -> Cognito -> User pools -> <select_user_pool> -> Pool details -> Pool Id
    userPoolId: 'us-east-1_4DT4Bbugf',
    // how to get clientId, go to AWS Console -> Cognito -> User pools -> <select_user_pool> -> Apps -> App client id
    clientId: '3ear4ae4d9rnmmp2inail54ci7',
    // how to get identityPoolId, go to AWS Console -> Cognito -> Federate Identities > <select_federate_identity> -> Edit -> Identity pool ID
    identityPoolId = 'us-east-1:3e24eb83-9fd1-40a7-aa76-52b39a5b3f75',
    /*room api gateway uri*/
    // create gateway api
    roomCreateUri = 'https://t5e8nlc5za.execute-api.us-east-1.amazonaws.com/dev',
    // delete gateway api
    roomDeleteUri = 'https://t5e8nlc5za.execute-api.us-east-1.amazonaws.com/dev',
    // list rooms gateway api
    roomListUri = 'https://8beoqse6r2.execute-api.us-east-1.amazonaws.com/dev',
    // list rooms gateway api
    roomUpdateUri = 'https://nr898twlv6.execute-api.us-east-1.amazonaws.com/dev'
    // list rooms gateway api
    roomSubscribeUri = 'https://cjixqrymme.execute-api.us-east-1.amazonaws.com/dev'

};
