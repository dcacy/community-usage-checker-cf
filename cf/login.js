/**
 * redirect the caller to the appropriate URL for an oauth dance
 */
function main(args) {

  const CC_URL = 'https://apps.na.collabserv.com';
  const CC_OAUTH_URL = '/manage/oauth2/authorize';
  const CLIENT_ID = args.community_usage_checker.CLIENT_ID;
  const OAUTHBACK_URL = args.community_usage_checker.OAUTHBACK_URL;
  
  const redirectURL = CC_URL + CC_OAUTH_URL
  + '?response_type=code'
  + '&client_id=' + CLIENT_ID
  + '&callback_uri=' + OAUTHBACK_URL
  ;

  return {
    headers: {location: redirectURL},
    statusCode: 302
  }
}
