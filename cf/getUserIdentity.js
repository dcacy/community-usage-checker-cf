/**
 * Get the User Identity from Connections so we can get the name and email
 **/
const rp = require('request-promise');

function main(args) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      uri: 'https://apps.na.collabserv.com/manage/oauth/getUserIdentity',
      headers: {
        'Authorization': `bearer ${args.access_token}`
      },
      json: true // parse the result to JSON
    };
    rp(options)
    .then(result => {
      /* looks like:
      {
        "name": "Darren Cacy",
        "customerid": "20332216",
        "subscriberid": "22034503",
        "email": "darren.cacy@llshowcase.com"
      }
      */
      resolve(result);
    })
    .catch(err => {
      reject(err);
    });
  });
}