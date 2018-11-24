/**
	 * The user is redirected to this URI after going through the Connections oauth process.
	 * Attempt to get an access token; if we get one, redirect to the page which will
	 * load the Connections data.
	 */
const openwhisk = require('openwhisk');
const rp = require('request-promise');
const { parse } = require('querystring'); // included in node

const CC_URL = 'https://apps.na.collabserv.com';
// const CC_OAUTH_URL = '/manage/oauth2/authorize';
const AUTHORIZATION_API = '/manage/oauth2/token';

// const APP_HOSTNAME = 'https://localhost:6003';

function samePackage(action) {
	return (process.env.__OW_ACTION_NAME.replace(/\/[^\/]+$/, "") + "/" + action).replace(/^\/[^\/]+\//, "");
}

function main(args) {
	return new Promise((resolve, reject) => {

		const APP_HOSTNAME = args.community_usage_checker.APP_HOSTNAME;
		const CLIENT_ID = args.community_usage_checker.CLIENT_ID;
		const CLIENT_SECRET = args.community_usage_checker.CLIENT_SECRET;
		const oauthbackURL = args.community_usage_checker.OAUTHBACK_URL;

		// create a request object
		const req = {
			query: parse(args.__ow_query),
			headers: args.__ow_headers
		};
		if (req.query.oauth_error) {
			// Authorization step returned an error; user probably clicked cancel
			resolve({
				headers: { location: `${APP_HOSTNAME}?err=${req.query.oauth_error}` },
				statusCode: 302
			});
			return;
		}
		const code = req.query.code;
		const redirect_uri = oauthbackURL;

		// Get the accessToken
		getAuthFromOAuthToken(CLIENT_ID, CLIENT_SECRET, code, redirect_uri)
		.then(oauthInfo => {
			console.log('result of getAuthFromOAuthToken is', JSON.stringify(oauthInfo));
			// save the oauth info to Cloudant for subsequent requests
			const ow = openwhisk();
			ow.actions.invoke({
				name: samePackage('saveToCloudant'),
				blocking: true,
				params: oauthInfo,
				result: true
			})
			.then(cloudantResult => {
				console.log('result of saving to cloudant action is', JSON.stringify(cloudantResult));
				if (cloudantResult.response.result.ok) {
					// on success, redirect to the right page
					resolve({
						headers: {
							'Content-Type': 'text/html',
							'location': `${APP_HOSTNAME}/communities.html?tok=${cloudantResult.response.result.id}`
						},
						statusCode: 302
					});
				} else {
					// some unknown cloudant problem
					resolve({
						headers: {
							'Content-Type': 'text/html',
							'location': `${APP_HOSTNAME}?err=${JSON.stringify(cloudantResult.response.result)}`
						},
						statusCode: 302
					});
				}
			})
			.catch(err => {
				console.log('error invoking action:', JSON.stringify(err));
				resolve({
					headers: {
						'Content-Type': 'text/html',
						'location': `${APP_HOSTNAME}?err=${err.message}`,
					},
					'statusCode': 302
				});
			});
		})
		.catch(err => {
			// don't know why we are here so just redirect
			resolve({
				headers: {
					'Content-Type': 'text/html',
					'location': `${APP_HOSTNAME}?err=${err.message}`,
					'statusCode': 302
				}
			});
		});
	});
}


/**
 * We have an oauth code so try to authenticate.
 * Returns a promise.
 */
function getAuthFromOAuthToken(app_id, app_secret, oauth_code, redirect_uri) {

	return new Promise((resolve, reject) => {
		console.log('entering getAuthFromOAuthToken');

		var options = {
			method: 'POST',
			uri: `${CC_URL}${AUTHORIZATION_API}`,
			form: {
				code: oauth_code,
				grant_type: 'authorization_code',
				client_id: app_id,
				client_secret: app_secret,
				callback_uri: redirect_uri
			},
			headers: {
				'content-type': 'application/x-www-form-urlencoded'
			},
			resolveWithFullResponse: true, // gives us the statusCode
			json: false // don't the body to JSON
		};
		rp(options)
		.then(result => {
			const oauthInfo = parseQuery(result.body);
			if (result.statusCode !== 200) {
				// if our app can't authenticate then it must have been
				// disabled. Just return.
				console.log('ERROR: App cannot authenticate:', JSON.stringify(result));
				reject(new Error('App cannot authenticate'));
			}
			resolve(oauthInfo);
		})
		.catch(err => {
			console.log('authentication actually failed:', err.name, err.statusCode, err.message);
			reject(err);
		});
	});
}

function parseQuery(queryString) {
	var query = {};
	var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
	for (var i = 0; i < pairs.length; i++) {
		var pair = pairs[i].split('=');
		query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
	}
	return query;
}