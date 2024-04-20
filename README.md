# MeetKettle
A meeting room booking web app

#### The Stack
* [Node.js](href='https://nodejs.org/') - A free, open-sourced, cross-platform JavaScript run-time environment that lets developers write command line tools and server-side scripts outside of a browser.
* [Express](href='https://expressjs.com/') - Fast, unopinionated, minimalist web framework for Node.js.
* [pug](href='https://pugjs.org/') - A high-performance template engine heavily influenced by Haml and implemented with JavaScript for Node.js and browsers.
* [Express Validator](href='https://express-validator.github.io/') - A set of express.js middlewares that wraps validator.js validator and sanitizer functions.
* [sqlite3](href='https://npmjs.com/package/sqlite3') - Asynchronous, non-blocking SQLite3 bindings for Node.js.
* [better-sqlite3](href='https://npmjs.com/package/better-sqlite3') - Synchronous sqlite3 for Node.js.
* [express-session](href='https://npmjs.com/package/express-session') - Simple session middleware for Express.

#### Roadmap
* Calendar layout of meetings
* White-labelling
* Meeting room occupancy API

#### How to deploy locally
* Clone this repository
* Install the dependencies by running `npm install`
* Install nodemon globally by using `npm install -g nodemon`
* Place certificate files (`privkey.pem`, `cert.pem` & `chain.pem`) inside `/cert` folder
* Start the server by running `nodemon`
* The web UI should be accessible at https://localhost:6338/

#### Deploy via docker
* Clone this repository
* Create `cert` and `db` directory and change mountpoints in `/docker-compose.yml` as required.
* Place certificate files (`privkey.pem`, `cert.pem` & `chain.pem`) inside `/cert` folder.
* Change timezone via `TZ` variable in `docker-compose.yml`
* Run `docker compose up -d`
