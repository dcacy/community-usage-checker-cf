/**
 * retrieve oauth info from Cloudant
 **/
const openwhisk = require('openwhisk');

function main(args) {
  return new Promise((resolve, reject) => {
    console.log('in getOAuthInfo with', JSON.stringify(args));
    const exec_query_find = 'Bluemix_dpc-myfavorites-cloudantNoSQLDB_Credentials-1/exec-query-find';
    const api_key = args.community_usage_checker.API_KEY;

    // Cloudant query; the _id is passed in to this function      
    const query = {
      "selector": {
          "_id": {
            "$eq": args.tok
          }
      }
    }
    // create an openwhisk object using the api_key for that namespace
    const ow_Dev = openwhisk({api_key:api_key});
    ow_Dev.actions.invoke({
      name: exec_query_find,
      blocking: true,
      namespace: 'dcacy_dev',
      result: true,
      params: {dbname: 'community-usage-checker', query: query}
    })
    .then(result => {
      console.log('result of invoking exec-query-find is', JSON.stringify(result));
      resolve(result);
    })
    .catch(err => {
      console.log('error invoking exec-query-find:', JSON.stringify(err));
      reject(err);
    });
  });  
}