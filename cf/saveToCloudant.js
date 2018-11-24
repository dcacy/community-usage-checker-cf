/**
 * Save the oauth token to Cloudant so we can retrieve it for subsequent requets
 **/
const openwhisk = require('openwhisk');

function samePackage(action) {
  return (process.env.__OW_ACTION_NAME.replace(/\/[^\/]+$/,"") + "/" + action).replace(/^\/[^\/]+\//,"");
}
function main(args) {
  return new Promise((resolve, reject) => {

    const create_doc_action = 'Bluemix_dpc-myfavorites-cloudantNoSQLDB_Credentials-1/create-document';
    const api_key = args.community_usage_checker.API_KEY;
      
    console.log('in main');
    const ow = openwhisk();
    ow.actions.invoke({
      name: samePackage('getUserIdentity'),
      blocking: true,
      result: true,
      params: args
    })
    .then(userInfo => {
      // create an openwhisk object with the api_key for the right namespace
      // and call the action to save the data
      const ow_Dev = openwhisk({api_key:api_key});
      ow_Dev.actions.invoke({
        name: create_doc_action,
        blocking: true,
        namespace: 'dcacy_dev',
        params: {dbname: 'community-usage-checker', doc: {userInfo: userInfo, oauthInfo: args, date: new Date().toISOString()}}
      })
      .then(result => {
        console.log('result of invoking create_doc_action is', JSON.stringify(result));
        resolve(result);
      })
      .catch(err => {
        console.log('error invoking action:', JSON.stringify(err));
        reject(err);
      });
    })
    .catch(err => {
      console.log('error calling getUserIdentity:', JSON.stringify(err));
      reject(err);
    });
  });
}