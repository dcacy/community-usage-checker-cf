/**
 * retrieve some details for a particular community
 */

const log = console.log;
const openwhisk = require('openwhisk');
const parseString = require('xml2js').parseString;
const rp = require('request-promise');
const moment = require('moment');
const CONNECTIONS_HOST = 'apps.na.collabserv.com';

function samePackage(action) {
  return (process.env.__OW_ACTION_NAME.replace(/\/[^\/]+$/,"") + "/" + action).replace(/^\/[^\/]+\//,"");
}

function main(args) {
  return new Promise((resolve, reject) => {
    console.log('in getCommunityDetails with', JSON.stringify(args));

		const ow = openwhisk();
    // get oauth info saved from the login process		
    ow.actions.invoke({
      name: samePackage('getOAuthInfo'),
      blocking: true,
      params: args,
      result: true
    })
    .then(oauthInfo => {
			// use the token to get the community details
      console.log('result of calling getOAuthInfo:', JSON.stringify(oauthInfo));
      const accessToken = oauthInfo.docs[0].oauthInfo.access_token;
      const promises = [];
      promises.push(getCommunityMembers(args.id, accessToken));
      promises.push(getCommunityFiles(args.id, accessToken));
      promises.push(getSubcommunities(args.id, accessToken));
      promises.push(getRecentActivity(args.id, accessToken));
      Promise.all(promises)
      .then(allData => {
        console.log('got all Data!');
        resolve({
          headers: {
            'Content-Type': 'application/json'
          },
          statusCode: 200,
          body: {id: args.id, json: allData}
        });
      })
      .catch(err => {
        console.log('error getting Connections data:', JSON.stringify(err));
        resolve({
          headers: {
            'Content-Type': 'application/json'
          },
          statusCode: 200,
          body: err
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
				body: err
			});
    });
  });
}

/**
 * Get the list of members of a community
 * @param {string} id community Uuid
 * @param {string} accessToken the oauth token
 * @returns {Promise} a Promise which resolves to json containing the member list
*/
function getCommunityMembers(id, accessToken) {

	log('in .getCommunityMembers, id is [', id, ']');

	return new Promise(function (resolve, reject) {

		var COMM_MEMBERS_URI = '/communities/service/atom/community/members?ps=1000&communityUuid=';

		var options = {
			method: 'GET',
			uri: `https://${CONNECTIONS_HOST}${COMM_MEMBERS_URI}${id}`,
			headers: {
				'Authorization': `bearer ${accessToken}`
			},
			json: false // do not parse the result to JSON
		};
		rp(options)
			.then(resultXML => {
				// set explicitArray to true to force an array so we can iterate through it, even if there is only one result
				parseString(resultXML, { explicitArray: true }, function (err, parsedXml) {
					if (err === null) {
						var members = [];
						for (var i = 0; i < parsedXml.feed.entry.length; i++) {
							// if a user is inactive, there is no email address...so check for one
							var member = {
								name: parsedXml.feed.entry[i].contributor[0].name[0],
								email: parsedXml.feed.entry[i].contributor[0].email ? parsedXml.feed.entry[i].contributor[0].email[0] : '',
								state: parsedXml.feed.entry[i].contributor[0]["snx:userState"][0]._
							};
							members.push(member);
						}
						resolve({type: 'members', data: members});
					}
					else {
						log('error parsing members:', err);
						reject(err);
					}
				});
			})
			.catch(err => {
				log('error getting community members', err.message);
				reject(err);
			});
	});


};


/**
 * Get the list of files of a community
 * @param {string} id community Uuid
 * @param {string} accessToken the oauth token
 * @returns {Promise} a Promise which resolves to json containing the files list
*/
function getCommunityFiles(id, accessToken) {

	log('in .getCommunityFiles, id is [', id, ']');

	return new Promise(function (resolve, reject) {

		var COMM_FILES_URI = '/files/basic/api/communitycollection/'
			+ id
			+ '/feed?sC=document&pageSize=500&sortBy=title&type=communityFiles';

		var options = {
			method: 'GET',
			uri: `https://${CONNECTIONS_HOST}${COMM_FILES_URI}`,
			headers: {
				'Authorization': `bearer ${accessToken}`
			},
			json: false // don't parse the result to JSON
		};

		rp(options)
			.then(function (result) {
				parseString(result, { explicitArray: true }, function (err, parsedXml) {
					if (err === null) {
						var files = [];
						if (parsedXml.feed['opensearch:totalResults'][0] > 0) {
							for (var i = 0; i < parsedXml.feed.entry.length; i++) {
								var sizeLink = parsedXml.feed.entry[i].link.find(function (item) {
									return typeof item.$.length !== 'undefined';
								});
								var file = {
									title: parsedXml.feed.entry[i].title[0]._,
									size: sizeLink.$.length
								};
								files.push(file);
							}
						}
						resolve({ type: 'files', data: files });
					} else {
						log('error parsing files:', err);
						reject('error parsing files: ' + err.message);
					}
				});
			})
			.catch(function (err) {
				log('error getting community files', err);
				reject(err);
			});
	});
};

/**
 * Get the list of subcommunities of a community
 * @param {string} id community Uuid
 * @param {string} accessToken the oauth token
 * @returns {Promise} a Promise which resolves to json containing the subcommunities list
*/
function getSubcommunities(id, accessToken) {

	log('in .getSubcommunities, id is [', id, ']');

	return new Promise(function (resolve, reject) {

		var SUBCOMMUNITIES_URI = '/communities/service/atom/community/subcommunities?communityUuid='
			+ id;

		var options = {
			method: 'GET',
			uri: 'https://' + CONNECTIONS_HOST + SUBCOMMUNITIES_URI,
			headers: {
				'Authorization': `bearer ${accessToken}`
			},
			//     "auth": {
			//      "user": properties.get('connections_userid'),
			//      "pass": properties.get('connections_password')
			//  },
			json: false // don't parse the result to JSON
		};

		rp(options)
			.then(function (result) {
				parseString(result, { explicitArray: true }, function (err, parsedXml) {
					if (err === null) {
						var subcommunities = [];
						if (parsedXml.feed['opensearch:totalResults'][0] > 0) {
							for (var i = 0; i < parsedXml.feed.entry.length; i++) {
								var subcommunity = {
									title: parsedXml.feed.entry[i].title[0]._
								};
								subcommunities.push(subcommunity);
							}
						}
						resolve({ "type": "subcommunities", "data": subcommunities });
					} else {
						log('error parsing subcommunities:', err);
						reject('error parsing subcommunities: ' + err.message);
					}
				});
			})
			.catch(function (err) {
				log('error getting subcommunities', err);
				reject(err);
			});
	});
};


/**
 * Get the list of recent activity (last 30 days) of a community
 * @param {object} json containing credentials
 * @param {string} community Uuid
 * @returns {Promise} a Promise which resolves to json containing the activity list
*/
function getRecentActivity(id, accessToken) {

	log('in .getRecentActivity, id is [', id, ']');

	return new Promise(function (resolve, reject) {

		// only get the last month's updates
    const oneMonthAgo = moment().subtract(30, 'day').toISOString();

		var COMM_ACTIVITY_URI = '/connections/opensocial/basic/rest/activitystreams/urn:lsid:lconn.ibm.com:communities.community:'
			+ id
			+ '/@all/@all?rollup=true&shortStrings=true&format=json&updatedSince=' + oneMonthAgo;

		var options = {
			method: 'GET',
			uri: 'https://' + CONNECTIONS_HOST + COMM_ACTIVITY_URI,
			headers: {
				'Authorization': `bearer ${accessToken}`
			},
			json: true // parse the body to JSON!
		};

		rp(options)
		.then(result => {
			const activity = [];
			for (let i = 0; i < result.list.length; i++) {
				const details = {
					name: result.list[i].connections.containerName,
					title: result.list[i].connections.plainTitle,
					author: result.list[i].actor.displayName,
					publishedDate: result.list[i].published,
					shortTitle: result.list[i].connections.shortTitle,
					itemUrl: result.list[i].openSocial.embed.context.itemUrl
				};
				activity.push(details);
			}
			resolve({type: 'activity', data: activity });

		})
		.catch(err => {
			log('error getting recent activity', err.statusCode);
			reject(err.statusCode);
		});
	});
};