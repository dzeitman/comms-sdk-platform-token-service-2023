const axios = require('axios');
var jwt = require('jsonwebtoken');
require('dotenv').config()

const SITE_URL = process.env.URL;
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
      },
      body: JSON.stringify({ access_token, refresh_token, expires_in }),
    };
  } catch (error) {
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

async function sendResonse(isValid) {
  return new Promise(async (resolve) => {
    if (isValid == true) {
      let response = await fetchToken();
      resolve(response);
    } else {
      resolve({ statusCode: 405, body: "Method Not Allowed" });
    }
  });
}

exports.handler = async (event) => {
  if (!event.body) {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const postData = JSON.parse(event.body);
  console.log('POST data:', postData);
  const rawURL = event.rawUrl;

  let isRequestValid = false;

  if (event.httpMethod !== "POST") {
    isRequestValid = false;
  } else {
    isRequestValid = true;
  }

  if (!postData.TOKEN) { return { statusCode: 405, body: "Method Not Allowed" } }
  if (!TOKEN_PASSWORD) { return { statusCode: 405, body: "Invalid server config" } }

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

  return await sendResonse(isRequestValid);
};
