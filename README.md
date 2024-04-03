# MeetKettle
A meeting room booking web app

#### The Stack
* [Node.js](href='https://nodejs.dev/') - A free, open-sourced, cross-platform JavaScript run-time environment that lets developers write command line tools and server-side scripts outside of a browser.
* [Express](href='https://expressjs.com/') - Fast, unopinionated, minimalist web framework for Node.js.
* [pug](href='https://pugjs.org/') - A high-performance template engine heavily influenced by Haml and implemented with JavaScript for Node.js and browsers.
* [Express Validator](href='https://express-validator.github.io/') - A set of express.js middlewares that wraps validator.js validator and sanitizer functions.
* [sqlite3](href='https://www.npmjs.com/package/sqlite3') - Asynchronous, non-blocking SQLite3 bindings for Node.js.
* [better-sqlite3](href='https://www.npmjs.com/package/better-sqlite3') - Synchronous sqlite3 for Node.js.
* [express-session](href='https://www.npmjs.com/package/express-session') - Simple session middleware for Express.

#### Roadmap
* Calendar layout of meetings
* White-labelling
* Meeting room occupancy API

#### How to deploy locally
* Clone this repository
* Install the dependencies by running `npm install`
* Install nodemon globally by using `npm install -g cross-env`
* Install nodemon globally by using `npm install -g nodemon`
* Start the server by running `nodemon`
* The web UI should be accessible at http://localhost/
* For a production version, setup certificates as described at the end of `index.js`, change port values at the begining of `index.js` and run `nodemon --exec npm start prod`
