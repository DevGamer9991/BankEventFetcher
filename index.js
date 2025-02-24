require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

const cardEmail = process.env.CARD_EMAIL;

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function startApp(auth) {
    const gmail = google.gmail({version: 'v1', auth});

    // start to poll the email every 60 seconds and check if there is any new email from the email address that we are looking for
    setInterval(() => {
        gmail.users.messages.list({
            userId: 'me',
            q: `from:${cardEmail} is:unread`,
        }, (err, res) => {
            if (err) return console.log('The API returned an error: ' + err);
            const messages = res.data.messages;
            if (messages) {
                messages.forEach((message) => {
                    gmail.users.messages.get({
                        userId: 'me',
                        id: message.id,
                    }, (err, res) => {
                        if (err) return console.log('The API returned an error: ' + err);
                        const message = res.data;
                        console.log(message.snippet);

                        // mark the email as read
                        gmail.users.messages.modify({
                            userId: 'me',
                            id: message.id,
                            resource: {
                                removeLabelIds: ['UNREAD']
                            }
                        }, (err, res) => {
                            if (err) return console.log('The API returned an error: ' + err);
                            console.log('Email marked as read');
                        });
                    });
                });
            } else {
                console.log('No new emails');
            }
        });
    }, 60000);
}

authorize().then(startApp).catch(console.error);