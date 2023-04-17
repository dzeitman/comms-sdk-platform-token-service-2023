const axios = require('axios');
var jwt = require('jsonwebtoken');
require('dotenv').config()

/* 
Manage your enviornment variables on Netlify, under settings / deploy:  
https://app.netlify.com/sites/<your-app-name>/settings/deploys
to match CONSUMER_KEY, CONSUMER_SECRET
*/


const SITE_URL = process.env.URL; // netlify provides this.
const APP_IDENTIFIER = process.env.APP_IDENTIFIER;
const TOKEN_PASSWORD = process.env.TOKEN_PASSWORD;
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const credentials = new Buffer.from(
  CONSUMER_KEY + ':' + CONSUMER_SECRET).toString('base64');

const url = 'https://session.voxeet.com/v1/oauth2/token';

const config = {
  headers: {
    Authorization: 'Basic ' + credentials,
  },
};

const data = { grant_type: 'client_credentials', expires_in: 3600 };

async function fetchToken() {
  try {
    const response = await axios.post(url, data, config);
    const { access_token, refresh_token, expires_in } = response.data;
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Origin': '*', // NOTE this is to allow for CORS when testing locally
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
      },
      body: JSON.stringify({ access_token, refresh_token, expires_in }),
    };
  } catch (error) {
    // handle error
    console.log(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unexpected error' }),
    };
  }
}


function isHostInUrl(url, hostname) {
  const urlObj = new URL(url);
  return urlObj.hostname === hostname;
}


exports.handler = async (event) => {
  const postData = JSON.parse(event.body);
  console.log('POST data:', postData);
  const rawURL = event.rawUrl;

  let isRequestValid = false;

  // Only allow POST
  if (event.httpMethod !== "POST") {
    isRequestValid = false;
  } else {
    isRequestValid = true;
  }

  // verify a token and payload
  jwt.verify(postData.TOKEN, TOKEN_PASSWORD, function (err, decoded) {
    if (err) {
      isRequestValid = false;
    }
    if (decoded.authenticated === true) {
      isRequestValid = false;
    } else {
      isRequestValid = true;
    }
  });


  // First restriction; App_Identifier for native mobile use case; include a mobile app's unique identifier in the post call, truthy if matches.
  if (APP_IDENTIFIER.toLowerCase() === "web") {

    // second restriction only allow the script to be called from the same domain as this application.

    // let apiGateway = 'https://comms-demo-2023.netlify.app/.netlify/functions/token-service';

    if (!isHostInUrl(rawURL, event.headers.host)) {
      isRequestValid = false;
    } else {
      isRequestValid = true;
    }
  }
 

  async function sendResonse(isValid) {
    if (isValid == true) {
      let response = await fetchToken();
      return response
    } else {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
  }

// test complete fetch the token
  sendResonse(isRequestValid);

};
