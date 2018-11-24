/**
 * return a list of all the communities visible to this user
 */

const log = console.log;
const openwhisk = require('openwhisk');
const parseString = require('xml2js').parseString;
const rp = require('request-promise');

function samePackage(action) {
  return (process.env.__OW_ACTION_NAME.replace(/\/[^\/]+$/, "") + "/" + action).replace(/^\/[^\/]+\//, "");
}

function main(args) {
  return new Promise((resolve, reject) => {
    console.log('in getAllCommunities with', JSON.stringify(args));

    const ow = openwhisk();
    // get oauth info saved from the login process
    ow.actions.invoke({
      name: samePackage('getOAuthInfo'),
      blocking: true,
      params: args,
      result: true
    })
    .then(oauthInfo => {
      // use the token to get the communities this user can see
      const accessToken = oauthInfo.docs[0].oauthInfo.access_token;
      const ALL_COMMUNITIES_URI = '/communities/service/atom/communities/all?ps=500';
      const options = {
        method: 'GET',
        uri: `https://apps.na.collabserv.com${ALL_COMMUNITIES_URI}`,
        headers: {
          'Authorization': `bearer ${accessToken}`
        },
        json: false // do not parse the result to JSON
      };
      rp(options)
      .then(resultXML => {
        console.log('found communities!');
        // convert the result from XML to JSON
        parseString(resultXML, {explicitArray: false}, function (err, parsedXml) {
          if (err === null) {
            const communityInfo = [];
            for (let i = 0; i < parsedXml.feed.entry.length; i++) {
              // find the data we want
              const entry = {
                title: parsedXml.feed.entry[i].title._,
                id: parsedXml.feed.entry[i]['snx:communityUuid'],
                updated: parsedXml.feed.entry[i].updated,
                owner: parsedXml.feed.entry[i].author.name,
                created: parsedXml.feed.entry[i].published,
                membercount: parsedXml.feed.entry[i]["snx:membercount"],
                type: parsedXml.feed.entry[i]['snx:communityType']
              };
              communityInfo.push(entry);
            }
            // resolve like this so the caller knows it's json
            resolve({
              headers: {
                'Content-Type': 'application/json'
              },
              statusCode: 200,
              body: {
                name: oauthInfo.docs[0].userInfo.name,
                email: oauthInfo.docs[0].userInfo.email,
                communityInfo: communityInfo
              }
            });
          } else {
            // handle error condition in parse
            log('error parsing getting all communities!!', JSON.stringify(err));
            resolve({
              headers: {
                'Content-Type': 'application/json'
              },
              statusCode: 200,
              body: {
                error: err
              }
            });          
          }
        });
      })
      .catch(err => {
        console.log('error getting communities:', JSON.stringify(err));
        resolve({
          headers: {
            'Content-Type': 'application/json'
          },
          statusCode: 200,
          body: {
            error: err
          }
        });          
      })
    })
    .catch(err => {
      console.log('error calling getOAuthInfo:', JSON.stringify(err));
      resolve({
        headers: {
          'Content-Type': 'application/json'
        },
        statusCode: 200,
        body: {
          error: err
        }
      });          
    });
  });
}