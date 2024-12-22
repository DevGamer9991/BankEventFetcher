# BankEventFetcher

To use this library, you need to setup the gmail node.js sdk by following the instructions [here](https://developers.google.com/gmail/api/quickstart/nodejs)

Once you have the credentials.json file, you need to create a .env file in the root directory of the project and add the following:
```bash
CARD_EMAIL="<The email address of the card/bank account alert that is sent to your email>"
```

Then you can run the project using these commands:
```bash
npm install
npm run start
```
