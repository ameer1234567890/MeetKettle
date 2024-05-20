const fs = require('fs');
const crypto = require('crypto');
const cron = require('node-cron');
const express = require('express');
const sqlite3 = require('sqlite3');
const sqliteSync = require('sqlite-sync');
const compression = require('compression');
const sessions = require('express-session');
const cookieParser = require('cookie-parser');
const SQLiteStore = require('connect-sqlite3')(sessions);
const { body, query, validationResult } = require('express-validator');
const NodeCache = require('node-cache');
const PORT = 6338;
const firstRunFile = './db/.firstrun';
const dbFile = './db/kettle.sqlite';
const dbBackupFile = 'db/kettle.backup.sqlite';
const sessionDbFile = './db/sessions.sqlite';
const app = express();
const { version } = require('./package.json');
const kettleCache = new NodeCache();
const winston = require('winston');
require('winston-daily-rotate-file');


const printMessage = (message, stack) => {
  if (stack) {
    return stack;
  } else {
    return message;
  }
}


const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format.printf(info => `[${info.timestamp}] [${info.level}]: ${printMessage(info.message, info.stack)}`+(info.splat!==undefined?`${info.splat}`:" "))
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      level: 'error',
      filename: './logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '14d',
    }),
    new winston.transports.DailyRotateFile({
      level: 'info',
      filename: './logs/info-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '14d',
    }),
    new winston.transports.Console(),
  ],
});


app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.set('view engine', 'pug');
app.use('/public', express.static('public'));
app.use(express.urlencoded({ extended: true, }));


let config = [];
let facilityList = [];
let serviceList = [];
let roleList = ['Viewer', 'Editor', 'Admin', 'Super-Admin',];
let firstRunComplete = false;
let recordsPerPage = 10;
let { dbversion } = require('./package.json');
let dbVersionFromDB = 0;
let dbUpgradeRequired = false;
if (!fs.existsSync(dbFile)) {
  const sessionSecret = crypto.createHash('sha256').update(Math.random().toString(36).slice(-8)).digest('hex');
  config.sessionSecret = sessionSecret;
  let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
  db.run('CREATE TABLE config(key TEXT, value TEXT)', (err) => {
    if (err) {
      return logger.error(new Error(err.message));
    } else {
      db.run('INSERT INTO config(key, value) VALUES(?, ?)', ['sessionSecret', sessionSecret,], (err) => {
        if (err) return logger.error(new Error(err.message));
        config.sessionSecret = sessionSecret;
      });
    }
  });
  db.close((err) => { if (err) return logger.error(new Error(err.message)); });
} else {
  sqliteSync.connect(dbFile);
  sqliteSync.run('SELECT * FROM config WHERE key=?', ['sessionSecret',], (res) => {
    if (res.error) return logger.error(new Error(res.err));
    config.sessionSecret = res[0].value;
  });
  let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
  db.get('SELECT * FROM config WHERE key=?', ['facilityList',], (err, row) => {
    if (err) return logger.error(new Error(err.message));
    facilityList = row.value.split(',');
  });
  db.get('SELECT * FROM config WHERE key=?', ['serviceList',], (err, row) => {
    if (err) return logger.error(new Error(err.message));
    serviceList = row.value.split(',');
  });
  db.get('SELECT * FROM config WHERE key=?', ['recordsPerPage',], (err, row) => {
    if (err) return logger.error(new Error(err.message));
    recordsPerPage = parseFloat(row.value);
  });
  db.get('SELECT * FROM config WHERE key=?', ['dbVersion',], (err, row) => {
    if (err) return logger.error(new Error(err.message));
    if (row) {
      dbVersionFromDB = parseFloat(row.value);
      if (dbVersionFromDB != dbversion) dbUpgradeRequired = true;
    } else {
      dbVersionFromDB = 0;
      dbUpgradeRequired = true;
    }
  });
  db.close((err) => { if (err) return logger.error(new Error(err.message)); });
}

let actions = {
  add_user: 'added new user',
  edit_role: 'edited user role for',
  activate_user: 'activated user',
  deactivate_user: 'deactivated user',
  admin_passreset: 'reset password for',
  user_passreset: 'Someone requested to reset password for',
  user_passchange: 'changed their own password',
  add_meeting: 'added new meeting',
  edit_meeting: 'edited meeting',
  delete_meeting: 'deleted meeting',
  add_room: 'added new meeting room',
  edit_room: 'edited meeting room',
  delete_room: 'deleted meeting room',
  edit_rpp: 'configured recordsPerPage setting to',
  add_service: 'added new meeting service',
  delete_service: 'deleted meeting service',
  add_facility: 'added new meeting room facility',
  delete_facility: 'deleted meeting room facility',
  db_backup: ' ran a database backup',
  db_upgrade: ' ran a database schema upgrade',
};



const oneYear = 1000 * 60 * 60 * 24 * 365;
app.use(sessions({
    secret: config.sessionSecret,
    saveUninitialized: false,
    cookie: { maxAge: oneYear, },
    resave: false,
    store: new SQLiteStore({ dir: './db/', db: 'sessions.sqlite', checkPeriod: 86400000, }),
}));


const firstrunComplete = () => {
  if (firstRunComplete) {
    return true;
  } else {
    if (fs.existsSync(firstRunFile)) {
      firstRunComplete = true;
      return true;
    } else {
      return false;
    }
  }
};


const addUserLogEntry = (event, user, userid, roomid, meetingid, data) => {
  let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
  let timesstamp = Date.now();
  db.run('INSERT INTO userlog(event, datetime, user, userid, roomid, meetingid, data) VALUES(?, ?, ?, ?, ?, ?, ?)', [event, timesstamp, user, userid, roomid, meetingid,data,], (err) => {
    if (err) return logger.error(new Error(err.message));
  });
  db.close((err) => { if (err) return logger.error(new Error(err.message)); });
};


const checkPermissions = (perm, req, res) => {
  if (dbUpgradeRequired) res.redirect('/dbupgrade');
  if (!firstrunComplete()) { return res.redirect('/firstrun'); }
  if (!req.session.userId) {
    const payload = {
      authUser: req.session.userId,
      title: 'Login Required!',
      message: 'Logging in is required for accessing this page. Please login to proceed.',
      errors: true,
    };
    res.status(401).render('no-perm', payload);
    return false;
  } else if (req.session.userId && !req.session[perm]) {
    const payload = {
      authUser: req.session.userId,
      title: 'Unauthorized!',
      message: 'You do not have permission to access this page.',
      errors: true,
    };
    res.status(401).render('no-perm', payload);
    return false;
  } else {
    return true;
  }
};


const checkPermissionsJson = (perm, req, res) => {
  if (dbUpgradeRequired) res.redirect('/dbupgrade');
  if (!firstrunComplete()) { return res.redirect('/firstrun'); }
  if (!req.session.userId) {
    let errors = [
      {
        msg: 'Logging in is required for this action',
      },
    ];
    const payload = {
      status: 'error',
      errors: errors,
    };
    res.status(401).json(payload);
    return false;
  } else if (req.session.userId && !req.session[perm]) {
    let errors = [
      {
        msg: 'You do not have permission to perform this action',
      },
    ];
    const payload = {
      status: 'error',
      errors: errors,
    };
    res.status(401).json(payload);
    return false;
  } else {
    return true;
  }
};


const removeUserSessions = (user) => {
  let db = new sqlite3.Database(sessionDbFile, (err) => {if (err) return logger.error(new Error(err.message)); });
  db.run('DELETE FROM sessions WHERE sess LIKE \'%"userId":"' + user + '"%\'', (err) => {
    if (err) return logger.error(new Error(err.message));
  });
  db.close((err) => { if (err) return logger.error(new Error(err.message)); });
};


const runDbBackup = () => {
  let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
  let backup = db.backup(dbBackupFile, (err) => {
    if (err) {
      return logger.error(new Error(err.message));
    } else {
      logger.info('Database backup succeeded');
    }
  });
  backup.step(-1);
  backup.finish();
  db.close((err) => { if (err) return logger.error(new Error(err.message)); });
};


cron.schedule('30 17 * * *', () => {
  logger.info('Running database backup');
  runDbBackup();
});


const getRoomList = () => {
  let roomList = [];
  sqliteSync.connect(dbFile);
  sqliteSync.run('SELECT * FROM rooms WHERE deleted IS NOT 1', [], (res) => {
    if (res.error) return logger.error(new Error(res.err));
    let room;
    for (let i = 0; i < res.length; i++) {
      room = {
        'id':res[i].id,
        'name':res[i].name,
      };
      roomList.push(room);
    }
  });
  return roomList;
};


const getOverlapMeeting = (meetingStart, meetingEnd, roomId, meetingId = 0) => {
  let overlapMeeting;
  const meetingStartMinusOneDay = (new Date(meetingStart * 1000).getTime() / 1000) - (3600 * 24);
  const meetingStartPlusOneDay = (new Date(meetingStart * 1000).getTime() / 1000) + (3600 * 24);
  sqliteSync.connect(dbFile);
  sqliteSync.run('SELECT * FROM meetings WHERE deleted IS NOT 1 AND roomid IS \'' + roomId + '\' AND datetime > \'' + meetingStartMinusOneDay + '\' AND datetime < \'' + meetingStartPlusOneDay + '\' ORDER BY datetime DESC', [], (res) => {
    if (res.error) return logger.error(new Error(res.err));
    let storedMeetingStart;
    let storedMeetingEnd;
    for (let i = 0; i < res.length; i++) {
      if (res[i].id == meetingId) {
        continue;
      } else {
        storedMeetingStart = res[i].datetime;
        storedMeetingEnd = res[i].datetime + res[i].duration;
        // Excellent logic from: https://stackoverflow.com/a/31328290
        if (storedMeetingStart < meetingEnd && meetingStart < storedMeetingEnd) {
          overlapMeeting = res[i];
          break;
        }
      }
    }
  });
  return overlapMeeting;
};


const getRecurringMeetings = (roomId) => {
  let meetings =[];
  let meeting = {};
  let isRecurringMeeting = false;
  let query;
  let storedMeetingRepeat;
  let storedMeetingWeekday;
  let storedMeetingDayOfMonth;
  let storedMeetingMonthOfYear;
  let storedMeetingYear;
  let storedMeetingTime;
  let storedMeetingTimeStampToday;
  const currentWeekday = new Date().getDay();
  const currentDayOfMonth = new Date().getDate();
  const currentMonthOfYear = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  if (roomId == 'all') {
    query = 'SELECT * FROM meetings WHERE deleted IS NOT 1 AND repeat IS NOT \'once\' ORDER BY datetime DESC';
  } else {
    query = 'SELECT * FROM meetings WHERE deleted IS NOT 1 AND repeat IS NOT \'once\' AND roomid IS \'' + roomId + '\' ORDER BY datetime DESC';
  }
  sqliteSync.connect(dbFile);
  sqliteSync.run(query, [], (res) => {
    if (res.error) {
      return logger.error(new Error(res.err));
    }
    for (let i = 0; i < res.length; i++) {
      isRecurringMeeting = false;
      storedMeetingRepeat = res[i].repeat;
      storedMeetingWeekday = new Date(res[i].datetime * 1000).getDay();
      storedMeetingDayOfMonth = new Date(res[i].datetime * 1000).getDate();
      storedMeetingMonthOfYear = new Date(res[i].datetime * 1000).getMonth();
      storedMeetingYear = new Date(res[i].datetime * 1000).getFullYear();
      let currentDateString = currentYear + '/' + currentMonthOfYear + '/' + currentDayOfMonth;
      let storedMeetingDateString = storedMeetingYear + '/' + storedMeetingMonthOfYear + '/' + storedMeetingDayOfMonth;
      if (currentDateString == storedMeetingDateString) continue;
      if (storedMeetingRepeat == 'daily') {
        isRecurringMeeting = true;
      } else if (storedMeetingRepeat == 'weekly' && storedMeetingWeekday == currentWeekday) {
        isRecurringMeeting = true;
      } else if (storedMeetingRepeat == 'monthly' && storedMeetingDayOfMonth == currentDayOfMonth) {
        isRecurringMeeting = true;
      } else if (storedMeetingRepeat == 'yearly' && storedMeetingMonthOfYear == currentMonthOfYear) {
        isRecurringMeeting = true;
      }
      if (isRecurringMeeting) {
        storedMeetingTime = new Date(res[i].datetime * 1000).getHours() + ':' + new Date(res[i].datetime * 1000).getMinutes() + ':' + new Date(res[i].datetime * 1000).getSeconds();
        storedMeetingTimeStampToday = new Date(storedMeetingTimeStampToday = new Date().getFullYear() + '/' + (new Date().getMonth() + 1) + '/' + new Date().getDate() + ' ' + storedMeetingTime).getTime() / 1000;
        meeting = {
          'id':res[i].id,
          'datetime':storedMeetingTimeStampToday,
          'duration':res[i].duration,
          'repeat':res[i].repeat,
          'description':res[i].description,
          'roomid':res[i].roomid,
          'remarks':res[i].remarks,
          'link':res[i].link,
          'service':res[i].service,
        };
        meetings.push(meeting);
      }
    }
  });
  return meetings;
};


app.get('/site.webmanifest', (req, res) => {
  res.sendFile('public/site.webmanifest', { root: __dirname, });
});


app.get('/sw.js', (req, res) => {
  res.sendFile('public/js/sw.js', { root: __dirname, });
});


app.get('/favicon.ico', (req, res) => {
  res.sendFile('public/favicon.ico', { root: __dirname, });
});


app.get('/offline', (req, res) => {
  const payload = {
    title: 'You are Offline',
    message: 'Your connection to MeetKettle has been disrupted!',
  };
  res.render('offline', payload);
});


app.get('/', (req, res) => {
  if (!checkPermissions('permView', req, res)) { return false; }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const payload = {
      authUser: req.session.userId,
      title: 'List Meetings',
      message: 'Below errors occured',
      errors: errors.array(),
    };
    return res.render('home', payload);
  }
  let meetingList = [];
  let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
  const roomList = getRoomList();
  const nowMinusTwoHours = (new Date().getTime() / 1000) - (3600 * 2);
  db.all('SELECT * FROM meetings WHERE deleted IS NOT 1 AND datetime > ' + nowMinusTwoHours + ' ORDER BY datetime DESC', [], (err, rows) => {
    if (err) return logger.error(new Error(err.message));
    let meeting;
    for (let i = 0; i < rows.length; i++) {
      meeting = {
        'id':rows[i].id,
        'datetime':rows[i].datetime,
        'duration':rows[i].duration,
        'repeat':rows[i].repeat,
        'description':rows[i].description,
        'roomid':rows[i].roomid,
        'remarks':rows[i].remarks,
        'link':rows[i].link,
        'service':rows[i].service,
      };
      meetingList.push(meeting);
    }
  });
  db.close((err) => {
    if (err) return logger.error(new Error(err.message));
    const recurringMeetings = getRecurringMeetings('all');
    for (let meeting of recurringMeetings) {
      if (!meetingList.some(nMeeting => nMeeting.id === meeting.id)) {
        meetingList.push(meeting);
      }
    }
    if (meetingList.length === 0) {
      const payload = {
        authUser: req.session.userId,
        title: 'No Meetings',
        errors: true,
        message: 'There are no meetings scheduled',
        meetings: meetingList,
        roomList: roomList,
        serviceList: serviceList,
      };
      res.render('home', payload);
    } else {
      meetingList.sort((a,b) => a.datetime - b.datetime);
      const payload = {
        authUser: req.session.userId,
        meetings: meetingList,
        roomList: roomList,
        serviceList: serviceList,
      };
      res.render('home', payload);
    }
  });
});


app.get('/stats', (req, res) => {
  if (!checkPermissions('permView', req, res)) { return false; }
  let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
  let serviceListHumanReadable = [];
  let countByService = [];
  let roomListHumanReadable = [];
  let countByRoom = [];
  let query = 'SELECT service';
  serviceList.forEach(service => {
    serviceListHumanReadable.push(service.split('_').map( w =>  w.substring(0,1).toUpperCase()+ w.substring(1)).join(' '));
    query = query + ', SUM(CASE WHEN service=\'' + service + '\' THEN 1 ELSE 0 END) AS ' + service + '_count';
  });
  query = query + ' FROM meetings';
  db.all(query, [], (err, rows) => {
    if (err) return logger.error(new Error(err.message));
    serviceList.forEach(service => {
      let objProperty = service + '_count';
      countByService.push(rows[0][objProperty]);
    });
  });
  query = 'SELECT roomid';
  const roomList = getRoomList();
  roomList.forEach(room => {
    roomListHumanReadable.push(room.name.split('_').map( w =>  w.substring(0,1).toUpperCase()+ w.substring(1)).join(' '));
    query = query + ', SUM(CASE WHEN roomid=\'' + room.id + '\' THEN 1 ELSE 0 END) AS id' + room.id + '_count';
  });
  query = query + ' FROM meetings';
  db.all(query, [], (err, rows) => {
    if (err) return logger.error(new Error(err.message));
    roomList.forEach(room => {
      let objProperty = 'id' + room.id + '_count';
      countByRoom.push(rows[0][objProperty]);
    });
  });
  const weekdayList = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', ];
  let countByWeekdayA = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };
  let weekday;
  let countByWeekday = [];
  db.all('SELECT * FROM meetings', [], (err, rows) => {
    if (err) return logger.error(new Error(err.message));
    rows.forEach(meeting => {
      weekday = new Date(meeting.datetime * 1000).getDay();
      countByWeekdayA[weekday] = countByWeekdayA[weekday] + 1;
    });
    for (let i = 0; i < Object.keys(countByWeekdayA).length; i++) {
      countByWeekday.push(countByWeekdayA[i]);
    }
  });
  db.close((err) => {
    if (err) return logger.error(new Error(err.message));
    const payload = {
      authUser: req.session.userId,
      serviceList: serviceListHumanReadable,
      countByService: countByService,
      roomList: roomListHumanReadable,
      countByRoom: countByRoom,
      weekdayList: weekdayList,
      countByWeekday: countByWeekday,
    };
    res.render('stats', payload);
  });
});


app.get('/kiosk',
  query('page')
    .optional().isInt({ min: 1, })
    .withMessage('Invalid page number provided in query string'),
  (req, res) => {
    if (!checkPermissions('permView', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        authUser: req.session.userId,
        title: 'Kiosk Mode',
        message: 'Below errors occured',
        errors: errors.array(),
      };
      return res.render('kiosk', payload);
    }
    let page;
    if (!req.query.page) {
      page = 1;
    } else {
      page = req.query.page;
    }
    let numPages;
    let roomList = [];
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    db.get('SELECT COUNT(1) FROM rooms WHERE deleted IS NOT 1', (err, row) => {
      if (err) return logger.error(new Error(err.message));
      const numRecords = row['COUNT(1)'];
      numPages = Math.ceil(numRecords / recordsPerPage);
      const startRecord = (page - 1) * recordsPerPage;
      db.all('SELECT * FROM rooms WHERE deleted IS NOT 1 LIMIT ' + recordsPerPage + ' OFFSET ' + startRecord, [], (err, rows) => {
        if (err) return logger.error(new Error(err.message));
        let room;
        for (let i = 0; i < rows.length; i++) {
          room = {
            'id':rows[i].id,
            'name':rows[i].name,
            'location':rows[i].location,
            'facilities':rows[i].facilities,
            'capacity':rows[i].capacity,
            'oos':rows[i].oos,
          };
          roomList.push(room);
        }
      });
    });
    db.close((err) => {
      if (err) return logger.error(new Error(err.message));
      const payload = {
        authUser: req.session.userId,
        title: 'Kiosk Mode',
        message: 'Select a room to continue',
        rooms: roomList,
        currentPage: page,
        numPages: numPages,
      };
      res.render('kiosk', payload);
    });
  }
);


app.get('/kiosk/room',
  query('room')
    .notEmpty()
    .withMessage('No room specified'),
  (req, res) => {
    if (!checkPermissions('permView', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        authUser: req.session.userId,
        errors: errors.array(),
      };
      return res.render('kiosk-room', payload);
    }
    let roomId = req.query.room;
    let meetingList = [];
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    const nowMinusTwoHours = (new Date().getTime() / 1000) - (3600 * 2);
    db.all('SELECT * FROM meetings WHERE deleted IS NOT 1 AND roomid IS \'' + roomId + '\' AND datetime > \'' + nowMinusTwoHours + '\' ORDER BY datetime ASC LIMIT 10', (err, rows) => {
      if (err) return logger.error(new Error(err.message));
      let meeting;
      for (let i = 0; i < rows.length; i++) {
        meeting = {
          'id':rows[i].id,
          'datetime':rows[i].datetime,
          'duration':rows[i].duration,
          'description':rows[i].description,
          'remarks':rows[i].remarks,
          'link':rows[i].link,
          'service':rows[i].service,
        };
        meetingList.push(meeting);
      }
    });
    db.close((err) => {
      if (err) return logger.error(new Error(err.message));
      const recurringMeetings = getRecurringMeetings(roomId);
      for (let meeting of recurringMeetings) {
        if (!meetingList.some(nMeeting => nMeeting.id === meeting.id)) {
          meetingList.push(meeting);
        }
      }
      let roomName;
      let roomLocation;
      let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
      db.get('SELECT name, location FROM rooms WHERE deleted IS NOT 1 AND id IS \'' + roomId + '\'', (err, row) => {
        if (err) return logger.error(new Error(err.message));
        roomName = row.name;
        roomLocation = row.location;
      });
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        const payload = {
          authUser: req.session.userId,
          meetings: meetingList,
          room: roomId,
          roomName: roomName,
          roomLocation: roomLocation,
        };
        res.render('kiosk-room', payload);
      });
    });
  }
);


app.get('/kiosk/meetings',
  query('room')
    .notEmpty()
    .withMessage('No room specified'),
  (req, res) => {
    if (!checkPermissions('permView', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        authUser: req.session.userId,
        errors: errors.array(),
      };
      return res.render('kiosk-meetings', payload);
    }
    let roomId = req.query.room;
    let meetingList = [];
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    const nowMinusTwoHours = (new Date().getTime() / 1000) - (3600 * 2);
    const nowPlus24Hours = (new Date().getTime() / 1000) + (3600 * 24);
    db.all('SELECT * FROM meetings WHERE deleted IS NOT 1 AND roomid IS \'' + roomId + '\' AND datetime > \'' + nowMinusTwoHours + '\' AND datetime < \'' + nowPlus24Hours + '\' ORDER BY datetime ASC LIMIT 10', (err, rows) => {
      if (err) return logger.error(new Error(err.message));
      let meeting;
      for (let i = 0; i < rows.length; i++) {
        meeting = {
          'id':rows[i].id,
          'datetime':rows[i].datetime,
          'duration':rows[i].duration,
          'repeat':rows[i].repeat,
          'description':rows[i].description,
          'remarks':rows[i].remarks,
          'link':rows[i].link,
          'service':rows[i].service,
        };
        meetingList.push(meeting);
      }
    });
    db.close((err) => {
      if (err) return logger.error(new Error(err.message));
      const recurringMeetings = getRecurringMeetings(roomId);
      for (let meeting of recurringMeetings) {
        if (!meetingList.some(nMeeting => nMeeting.id === meeting.id)) {
          meetingList.push(meeting);
        }
      }
      let roomName;
      let roomLocation;
      let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
      db.get('SELECT name, location FROM rooms WHERE deleted IS NOT 1 AND id IS \'' + roomId + '\'', (err, row) => {
        if (err) return logger.error(new Error(err.message));
        roomName = row.name;
        roomLocation = row.location;
      });
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        meetingList.sort((a,b) => a.datetime - b.datetime);
        const payload = {
          authUser: req.session.userId,
          meetings: meetingList,
          room: roomId,
          roomName: roomName,
          roomLocation: roomLocation,
        };
        res.render('kiosk-meetings', payload);
      });
    });
  }
);


app.get('/kiosk/meetingadd',
  query('room')
    .notEmpty()
    .withMessage('No room specified'),
  (req, res) => {
    if (!checkPermissions('permView', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        authUser: req.session.userId,
        errors: errors.array(),
      };
      return res.render('kiosk-meeting-add', payload);
    }
    let roomId = req.query.room;
    let roomName;
    let roomLocation;
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    db.get('SELECT name, location FROM rooms WHERE deleted IS NOT 1 AND id IS \'' + roomId + '\'', (err, row) => {
      if (err) return logger.error(new Error(err.message));
      roomName = row.name;
      roomLocation = row.location;
    });
    db.close((err) => {
      if (err) return logger.error(new Error(err.message));
      const payload = {
        authUser: req.session.userId,
        room: roomId,
        roomName: roomName,
        roomLocation: roomLocation,
      };
      res.render('kiosk-meeting-add', payload);
    });
}
);


app.post('/kiosk/meetingadd',
  body('datetime')
    .notEmpty()
    .withMessage('Date and time must not be empty'),
  body('duration')
    .notEmpty()
    .withMessage('Duration must not be empty'),
  body('description')
    .notEmpty()
    .withMessage('Description must not be empty'),
  body('description')
    .matches(/^[a-z0-9_:;,#@ .?$()[\]{}+\-*|]+$/i)
    .withMessage('Description contains invalid characters'),
  body('room')
    .notEmpty()
    .withMessage('Room must not be empty'),
  (req, res) => {
    if (!checkPermissions('permEdit', req, res)) { return false; }
    const errors = validationResult(req);
    const roomId = req.body.room;
    const duration = req.body.duration;
    const repeat = 'once';
    const timeStamp = new Date(req.body.datetime).getTime() / 1000;
    const meetingStart = timeStamp;
    const meetingEnd = timeStamp + (parseInt(duration) * 60);
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    db.get('SELECT name, location FROM rooms WHERE deleted IS NOT 1 AND id IS \'' + roomId + '\'', (err, row) => {
      if (err) return logger.error(new Error(err.message));
      const roomName = row.name;
      const roomLocation = row.location;
      const overlapMeeting = getOverlapMeeting(meetingStart, meetingEnd, roomId);
      if (overlapMeeting) {
        let errorList = [];
        const timeFormatOptions = { year:'numeric', month:'2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true, }
        const overlapDescription = overlapMeeting.description;
        const overlapDateTime = new Date(overlapMeeting.datetime * 1000).toLocaleString('en-GB', timeFormatOptions);
        let overlapDuration;
        if (overlapMeeting.duration/60 < 60) {
          overlapDuration = overlapMeeting.duration/60 + ' minutes';
        } else if (overlapMeeting.duration/60 == 60) {
          overlapDuration = overlapMeeting.duration/60/60 + ' hour';
        } else {
          overlapDuration = overlapMeeting.duration/60/60 + ' hours';
        }
        errorList.push({ msg: 'Overlapping meeting: ' + overlapDescription + ' at ' + overlapDateTime + ' for ' + overlapDuration, });
        res.render('kiosk-meeting-add', {
          authUser: req.session.userId,
          title: 'Error',
          message: 'Errors occured. Please refer below.',
          errors: errorList,
          datetime: req.body.datetime,
          duration: req.body.duration,
          repeat: repeat,
          description: req.body.description,
          room: req.body.room,
          roomName: roomName,
          roomLocation: roomLocation,
          remarks: req.body.remarks,
          link: req.body.link,
          service: req.body.service,
        });
      } else {
        db.close((err) => {
          if (err) return logger.error(new Error(err.message));
          if (!errors.isEmpty()) {
            const payload = {
              authUser: req.session.userId,
              title: 'Add a new Meetings',
              message: 'Below errors occured',
              errors: errors.array(),
              datetime: req.body.datetime,
              duration: req.body.duration,
              repeat: repeat,
              description: req.body.description,
              room: req.body.room,
              roomName: roomName,
              roomLocation: roomLocation,
              remarks: req.body.remarks,
              link: req.body.link,
              service: req.body.service,
            };
            return res.render('kiosk-meeting-add', payload);
          } else {
            let errorList = [];
            let id = crypto.createHash('sha256').update(Math.random().toString(36).slice(-8)).digest('hex');
            let datetime = timeStamp;
            let duration = req.body.duration * 60;
            let description = req.body.description;
            let room = req.body.room;
            let remarks = req.body.remarks;
            let link = req.body.link;
            let service = req.body.service;
            let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
            db.run('INSERT INTO meetings(id, datetime, duration, repeat, description, roomid, remarks, link, service) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, datetime, duration, repeat, description, room, remarks, link, service,], (err) => {
              if (err) {
                errorList.push({ code: err.errno, msg: err.message, });
                return logger.error(new Error(err.message));
              }
            });
            db.close((err) => {
              if (err) return logger.error(new Error(err.message));
              if (errorList.length === 0) {
                res.render('kiosk-meeting-add-complete', {
                  authUser: req.session.userId,
                  title: 'Success',
                  message: 'Meeting has been added as follows.',
                  datetime: req.body.datetime,
                  duration: req.body.duration,
                  repeat: repeat,
                  description: req.body.description,
                  room: req.body.room,
                  roomName: roomName,
                  roomLocation: roomLocation,
                  remarks: req.body.remarks,
                  link: req.body.link,
                  service: req.body.service,
                });
                addUserLogEntry('add_meeting', req.session.userId, null, req.body.room, id, null);
              } else {
                res.render('kiosk-meeting-add', {
                  authUser: req.session.userId,
                  title: 'Error',
                  message: 'Errors occured. Please refer below.',
                  errors: errors.array(),
                  datetime: req.body.datetime,
                  duration: req.body.duration,
                  repeat: repeat,
                  description: req.body.description,
                  room: req.body.room,
                  roomName: roomName,
                  roomLocation: roomLocation,
                  remarks: req.body.remarks,
                  link: req.body.link,
                  service: req.body.service,
                });
              }
            });
          }
        });
      }
    });
  }
);


app.get('/firstrun', (req, res) => {
  if (firstrunComplete()) {
    res.render('firstrun-complete', {
      authUser: req.session.userId,
      title: 'Complete',
      message: 'Setting up of MeetKettle has already been completed. Please proceed.',
      completeAlready: true,
    });
  } else {
    res.render('firstrun', {
      authUser: req.session.userId,
      title: 'Welcome',
      message: 'Please fill in your desired admin username and password.',
      user: '',
    });
  }
});


app.post('/firstrun',
  body('password').escape(),
  body('user').toLowerCase(),
  body('user')
    .isLength({ min: 5, })
    .withMessage('Username must be at least 5 characters long'),
  body('user')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Username contains disallowed characters'),
  body('password')
    .isLength({ min: 8, })
    .withMessage('Password must contain at least 8 characters'),
  body('password')
    .matches(/^(?=.*[!@#$%^&*]).*$/)
    .withMessage('Password must contain at least one special character'),
  body('password')
    .matches(/^(?=.*\d).*$/)
    .withMessage('Password must contain at least one digit'),
  body('password')
    .matches(/^(?=.*[a-z]).*$/)
    .withMessage('Password must contain at least one lower case letter'),
  body('password')
    .matches(/^(?=.*[A-Z]).*$/)
    .withMessage('Password must contain at least one upper case letter'),
  (req, res) => {
    if (firstrunComplete()) {
      res.render('firstrun-complete', {
        authUser: req.session.userId,
        title: 'Complete',
        message: 'Setting up of MeetKettle has already been completed. Please proceed.',
        completeAlready: true,
      });
    } else {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.render('firstrun', {
          authUser: req.session.userId,
          title: 'Invalid Input',
          message: 'Errors occured. Please refer below',
          errors: errors.array(),
          user: req.body.user,
        });
      } else {
        let errorList = [];
        let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
        db.run('CREATE TABLE users(user TEXT, password TEXT, role TEXT, resetrequested INT, deleted INT)', (err) => {
          if (err) {
            errorList.push({ code: err.errno, msg: err.message, });
            return logger.error(new Error(err.message));
          } else {
            let user = req.body.user;
            let passwordHash = crypto.createHash('sha256').update(req.body.password).digest('hex');
            let role = 'Super-Admin';
            db.run('INSERT INTO users(user, password, role) VALUES(?, ?, ?)', [user, passwordHash, role,], (err) => {
              if (err) {
                errorList.push({ code: err.errno, msg: err.message, });
                return logger.error(new Error(err.message));
              }
            });
          }
        });
        db.run('CREATE TABLE rooms(id TEXT, name TEXT, location TEXT, facilities TEXT, capacity INT, oos INT, deleted INT)', (err) => {
          if (err) {
            errorList.push({ code: err.errno, msg: err.message, });
            return logger.error(new Error(err.message));
          }
        });
        db.run('CREATE TABLE meetings(id TEXT, datetime INT, duration INT, repeat TEXT, description TEXT, roomid TEXT, remarks TEXT, link TEXT, service TEXT, deleted INT)', (err) => {
          if (err) {
            errorList.push({ code: err.errno, msg: err.message, });
            return logger.error(new Error(err.message));
          }
        });
        db.run('CREATE TABLE userlog(event TEXT, datetime INT, user TEXT, userid TEXT, roomid TEXT, meetingid TEXT, data TEXT)', (err) => {
          if (err) {
            errorList.push({ code: err.errno, msg: err.message, });
            return logger.error(new Error(err.message));
          }
        });
        facilityList = [ 'laptop', 'wifi', 'ethernet', 'webcam', 'projector', 'coffee', ];
        db.run('INSERT INTO config(key, value) VALUES(?, ?)', ['facilityList', facilityList.toString(),], (err) => {
          if (err) {
            errorList.push({ code: err.errno, msg: err.message, });
            return logger.error(new Error(err.message));
          }
        });
        serviceList = [ 'face_to_face', 'zoom', 'google_meet', 'teams', ];
        db.run('INSERT INTO config(key, value) VALUES(?, ?)', ['serviceList', serviceList.toString(),], (err) => {
          if (err) {
            errorList.push({ code: err.errno, msg: err.message, });
            return logger.error(new Error(err.message));
          }
        });
        db.run('INSERT INTO config(key, value) VALUES(?, ?)', ['recordsPerPage', recordsPerPage.toString(),], (err) => {
          if (err) {
            errorList.push({ code: err.errno, msg: err.message, });
            return logger.error(new Error(err.message));
          }
        });
        db.run('INSERT INTO config(key, value) VALUES(?, ?)', ['dbVersion', dbversion.toString(),], (err) => {
          if (err) {
            errorList.push({ code: err.errno, msg: err.message, });
            return logger.error(new Error(err.message));
          }
          dbVersionFromDB = dbversion;
        });
        db.close((err) => {
          if (errorList.length === 0) {
            res.render('firstrun-complete', {
              authUser: req.session.userId,
              title: 'Success',
              message: 'Setting up of MeetKettle has been completed',
              user: req.body.user,
              role: 'Super-Admin',
            });
            addUserLogEntry('add_user', req.body.user, req.body.user, null, null, null);
            fs.writeFileSync(firstRunFile, '', err => {
              if (err) {
                logger.error(new Error(err.message));
              }
            });
          } else {
            res.render('firstrun-complete', {
              authUser: req.session.userId,
              title: 'Error',
              message: 'Below errors occured',
              errors: errorList,
            });
          }
          if (err) {
            return logger.error(new Error(err.message));
          }
        });
      }
    }
  }
);


app.get('/user', (req, res) => {
  if (!checkPermissions('permView', req, res)) { return false; }
  res.render('user', {
    authUser: req.session.userId,
    title: 'User Preferences',
    message: 'You are logged in as',
    role: req.session.userRole,
  });
});


app.post('/user',
  body('password').escape(),
  body('password2').escape(),
  body('password')
    .isLength({ min: 8, })
    .withMessage('Password must contain at least 8 characters'),
  body('password')
    .matches(/^(?=.*[!@#$%^&*]).*$/)
    .withMessage('Password must contain at least one special character'),
  body('password')
    .matches(/^(?=.*\d).*$/)
    .withMessage('Password must contain at least one digit'),
  body('password')
    .matches(/^(?=.*[a-z]).*$/)
    .withMessage('Password must contain at least one lower case letter'),
  body('password')
    .matches(/^(?=.*[A-Z]).*$/)
    .withMessage('Password must contain at least one upper case letter'),
  body('password2')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  (req, res) => {
    if (!checkPermissions('permView', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render('user', {
        authUser: req.session.userId,
        title: 'User Preferences',
        message: 'You are logged in as',
        role: req.session.userRole,
        errors: errors.array(),
      });
    } else {
      let errorList = [];
      let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
      let user = req.session.userId;
      let passwordHash = crypto.createHash('sha256').update(req.body.password).digest('hex');
      db.run('UPDATE users SET password=? WHERE user = \'' + user + '\'', [passwordHash,], (err) => {
        if (err) {
          errorList.push({ code: err.errno, msg: err.message, });
          return logger.error(new Error(err.message));
        }
      });
      db.close((err) => {
        if (errorList.length === 0) {
          let changes = [
            { 
              msg: 'Password has been changed successfully',
            },
          ];
          res.render('user', {
            authUser: req.session.userId,
            title: 'User Preferences',
            message: 'You are logged in as',
            role: req.session.userRole,
            changes: changes,
          });
          addUserLogEntry('user_passchange', req.body.user, null, null, null, null);
        } else {
          res.render('user', {
            authUser: req.session.userId,
            title: 'User Preferences',
            message: 'You are logged in as',
            role: req.session.userRole,
            errors: errorList,
          });
        }
        if (err) {
          return logger.error(new Error(err.message));
        }
      });
    }
  }
);


app.get('/login', (req, res) => {
  if (!firstrunComplete()) { return res.redirect('/firstrun'); }
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('login', {
    authUser: req.session.userId,
    title: 'Login',
    message: 'Please login with your credentials',
    user: '',
  });
});


app.post('/login',
  body('user').escape().toLowerCase(),
  body('password').escape(),
  (req, res) => {
    if (!firstrunComplete()) { return res.redirect('/firstrun'); }
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    let user = req.body.user;
    let passwordHash = crypto.createHash('sha256').update(req.body.password).digest('hex');
    db.get('SELECT * FROM users WHERE deleted IS NOT 1 AND user=?', user, (err, row) => {
      if (err) return logger.error(new Error(err.message));
      if (!row) {
        res.render('login', {
          authUser: req.session.userId,
          title: 'Login Error',
          message: 'Invalid user. Please try again.',
          user: user,
          errors: true,
        });
      } else {
        if (row.password === passwordHash) {
          req.session.userId = row.user;
          req.session.userRole = row.role;
          if (req.session.userRole === 'Super-Admin') {
            req.session.permView = true;
            req.session.permEdit = true;
            req.session.permAdmin = true;
            req.session.permSuper = true;
          } else if (req.session.userRole === 'Admin') {
            req.session.permView = true;
            req.session.permEdit = true;
            req.session.permAdmin = true;
          } else if (req.session.userRole === 'Editor') {
            req.session.permView = true;
            req.session.permEdit = true;
          } else if (req.session.userRole === 'Viewer') {
            req.session.permView = true;
          }
          res.redirect('/');
        } else {
          res.render('login', {
            authUser: req.session.userId,
            title: 'Login Error',
            message: 'Invalid password. Please try again.',
            user: user,
            errors: true,
          });
        }
      }
    });
    db.close((err) => { if (err) return logger.error(new Error(err.message)); });
  }
);


app.get('/logout', (req, res) => {
  if (!firstrunComplete()) { return res.redirect('/firstrun'); }
  req.session.destroy();
  return res.redirect('/login');
});


app.get('/forgot', (req, res) => {
  if (!firstrunComplete()) { return res.redirect('/firstrun'); }
  if (req.session.userId) {
    return res.redirect('/');
  }
  res.render('forgot', {
    authUser: req.session.userId,
    title: 'Forgot Password',
    message: 'Please enter your username to proceed',
    user: '',
  });
});


app.post('/forgot',
  body('user').escape(),
  (req, res) => {
    if (!firstrunComplete()) { return res.redirect('/firstrun'); }
    let errorList = [];
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    let user = req.body.user;
    db.all('SELECT * FROM users WHERE user = \'' + user + '\'', [], (err, rows) => {
      if (err) return logger.error(new Error(err.message));
      if (rows.length === 0) {
        errorList.push({ code: '101', msg: 'Username does not exist', });
      }
    });
    db.run('UPDATE users SET resetrequested=? WHERE user = \'' + user + '\'', [1,], (err) => {
      if (err) {
        errorList.push({ code: err.errno, msg: err.message, });
        return logger.error(new Error(err.message));
      }
    });
    db.close((err) => {
      if (err) return logger.error(new Error(err.message));
      if (errorList.length === 0) {
        let changes = [
          {
            msg: 'Password reset has been requested. Please contact administrator.',
          },
        ];
        res.render('forgot', {
          authUser: req.session.userId,
          title: 'Forgot Password',
          message: 'Password reset requested!',
          role: req.session.userRole,
          changes: changes,
          user: req.body.user,
        });
        addUserLogEntry('user_passreset', null, req.body.user, null, null, null);
      } else {
        res.render('forgot', {
          authUser: req.session.userId,
          title: 'Forgot Password',
          message: 'Errors occured. Please refer below',
          role: req.session.userRole,
          errors: errorList,
          user: req.body.user,
        });
      }
    });
  }
);


app.get('/admin/config', (req, res) => {
  if (!checkPermissions('permSuper', req, res)) { return false; }
  const payload = {
    authUser: req.session.userId,
    title: 'Configuration',
    message: 'Below configurations are in effect',
    sessionSecret: config.sessionSecret,
    facilityList: facilityList,
    serviceList: serviceList,
    recordsPerPage: recordsPerPage,
  };
  res.render('config', payload);
});


app.post('/admin/rpp/set',
  body('rpp')
    .notEmpty()
    .withMessage('Records per page must not be empty'),
  body('rpp')
    .isNumeric()
    .withMessage('Records per page must be a number'),
  body('rpp')
    .isFloat({ min: 5, max: 500 })
    .withMessage('Records per page must be between 5 and 500'),
  (req, res) => {
    if (!checkPermissionsJson('permSuper', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        status: 'error',
        errors: errors.array(),
      };
      res.status(400).json(payload);
    } else {
      let errorList = [];
      let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
      let rpp = req.body.rpp;
      db.run('UPDATE config SET value=? WHERE key = \'recordsPerPage\'', [rpp,], (err) => {
        if (err) {
          errorList.push({ code: err.errno, msg: err.message, });
          return logger.error(new Error(err.message));
        }
      });
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        if (errorList.length === 0) {
          const payload = {
            status: 'success',
            recordsPerPage: rpp,
          };
          res.json(payload);
          addUserLogEntry('edit_rpp', req.session.userId, null, null, null, rpp);
          recordsPerPage =  rpp;
        } else {
          const payload = {
            status: 'error',
            errors: errorList,
          };
          res.status(400).json(payload);
        }
      });
    }
  }
);


app.post('/admin/facilities/add',
  body('facility')
    .notEmpty()
    .withMessage('Facility must not be empty'),
  body('facility')
    .isLength({ min: 3, })
    .withMessage('Facility must contain at least 3 characters'),
  body('facility')
    .matches(/^[a-z0-9 ]+$/i)
    .withMessage('Facility containts invalid characters'),
  (req, res) => {
    if (!checkPermissionsJson('permSuper', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        status: 'error',
        errors: errors.array(),
      };
      res.status(400).json(payload);
    } else {
      let facility = req.body.facility.toLowerCase().replace(' ', '_');
      if (facilityList.includes(facility)) {
        let errors = [
          {
            msg: 'Facility already exist',
          },
        ];
        const payload = {
          status: 'error',
          errors: errors,
        };
        res.status(400).json(payload);
      } else {
        let errorList = [];
        let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
        facilityList.push(facility);
        db.run('UPDATE config SET value=? WHERE key = \'facilityList\'', [facilityList.toString(),], (err) => {
          if (err) {
            errorList.push({ code: err.errno, msg: err.message, });
            return logger.error(new Error(err.message));
          }
        });
        db.close((err) => {
          if (err) return logger.error(new Error(err.message));
          if (errorList.length === 0) {
            const payload = {
              status: 'success',
              facility: facility,
            };
            res.json(payload);
            addUserLogEntry('add_facility', req.session.userId, null, null, null, facility);
          } else {
            const payload = {
              status: 'error',
              errors: errorList,
            };
            res.status(400).json(payload);
          }
        });
      }
    }
  }
);


app.post('/admin/facilities/delete',
  body('facility')
    .notEmpty()
    .withMessage('Facility must not be empty'),
  (req, res) => {
    if (!checkPermissionsJson('permSuper', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        status: 'error',
        errors: errors.array(),
      };
      res.status(400).json(payload);
    } else {
      let facility = req.body.facility.toLowerCase().replace(' ', '_');
      let errorList = [];
      let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
      db.all('SELECT * FROM rooms WHERE facilities LIKE \'%' + facility + '%\'', [], (err, rows) => {
        if (err) return logger.error(new Error(err.message));
        if (rows.length > 0) {
          errorList.push({ code: 101, msg: 'Facility is attached to an existing room.', });
        }
      });
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        if (errorList.length === 0) {
          const index = facilityList.indexOf(facility);
          facilityList.splice(index, 1);
          let db2 = new sqlite3.Database(dbFile, (err) => {
            if (err) {
              return logger.error(new Error(err.message));
            }
          });
          db2.run('UPDATE config SET value=? WHERE key = \'facilityList\'', [facilityList.toString(),], (err) => {
            if (err) {
              errorList.push({ code: err.errno, msg: err.message, });
              return logger.error(new Error(err.message));
            }
          });
          db2.close((err) => {
            if (err) return logger.error(new Error(err.message));
            if (errorList.length === 0) {
              const payload = {
                status: 'success',
                facility: facility,
              };
              res.json(payload);
              addUserLogEntry('delete_facility', req.session.userId, null, null, null, facility);
            } else {
              const payload = {
                status: 'error',
                errors: errorList,
              };
              res.status(400).json(payload);
            }
          });
        } else {
          const payload = {
            status: 'error',
            errors: errorList,
          };
          res.status(400).json(payload);
        }
      });
    }
  }
);


app.post('/admin/services/add',
  body('service')
    .notEmpty()
    .withMessage('Service must not be empty'),
  body('service')
    .isLength({ min: 3, })
    .withMessage('Service must contain at least 3 characters'),
  body('service')
    .matches(/^[a-z0-9 ]+$/i)
    .withMessage('Service containts invalid characters'),
  body('service')
    .custom((value) => {
      if (value.toLowerCase() == 'offline') {
        throw new Error('Invalid service name');
      }
      return true;
    }),
  (req, res) => {
    if (!checkPermissionsJson('permSuper', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        status: 'error',
        errors: errors.array(),
      };
      res.status(400).json(payload);
    } else {
      let service = req.body.service.toLowerCase().replace(' ', '_');
      if (serviceList.includes(service)) {
        let errors = [
          {
            msg: 'Service already exist',
          },
        ];
        const payload = {
          status: 'error',
          errors: errors,
        };
        res.status(400).json(payload);
      } else {
        let errorList = [];
        let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
        serviceList.push(service);
        db.run('UPDATE config SET value=? WHERE key = \'serviceList\'', [serviceList.toString(),], (err) => {
          if (err) {
            errorList.push({ code: err.errno, msg: err.message, });
            return logger.error(new Error(err.message));
          }
        });
        db.close((err) => {
          if (err) return logger.error(new Error(err.message));
          if (errorList.length === 0) {
            const payload = {
              status: 'success',
              service: service,
            };
            res.json(payload);
            addUserLogEntry('add_service', req.session.userId, null, null, null, service);
          } else {
            const payload = {
              status: 'error',
              errors: errorList,
            };
            res.status(400).json(payload);
          }
        });
      }
    }
  }
);


app.post('/admin/services/delete',
  body('service')
    .notEmpty()
    .withMessage('Service must not be empty'),
  (req, res) => {
    if (!checkPermissionsJson('permSuper', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        status: 'error',
        errors: errors.array(),
      };
      res.status(400).json(payload);
    } else {
      let service = req.body.service.toLowerCase().replace(' ', '_');
      let errorList = [];
      let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
      db.all('SELECT * FROM meetings WHERE service LIKE \'%' + service + '%\'', [], (err, rows) => {
        if (err) return logger.error(new Error(err.message));
        if (rows.length > 0) {
          errorList.push({ code: 101, msg: 'Service is attached to an existing meeting.', });
        }
      });
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        if (errorList.length === 0) {
          const index = serviceList.indexOf(service);
          serviceList.splice(index, 1);
          let db2 = new sqlite3.Database(dbFile, (err) => {
            if (err) {
              return logger.error(new Error(err.message));
            }
          });
          db2.run('UPDATE config SET value=? WHERE key = \'serviceList\'', [serviceList.toString(),], (err) => {
            if (err) {
              errorList.push({ code: err.errno, msg: err.message, });
              return logger.error(new Error(err.message));
            }
          });
          db2.close((err) => {
            if (err) return logger.error(new Error(err.message));
            if (errorList.length === 0) {
              const payload = {
                status: 'success',
                service: service,
              };
              res.json(payload);
              addUserLogEntry('delete_service', req.session.userId, null, null, null, service);
            } else {
              const payload = {
                status: 'error',
                errors: errorList,
              };
              res.status(400).json(payload);
            }
          });
        } else {
          const payload = {
            status: 'error',
            errors: errorList,
          };
          res.status(400).json(payload);
        }
      });
    }
  }
);


app.get('/admin/users',
  query('page')
    .optional().isInt({ min: 1, })
    .withMessage('Invalid page number provided in query string'),
  (req, res) => {
    if (!checkPermissions('permSuper', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        authUser: req.session.userId,
        title: 'Administration',
        message: 'Below errors occured',
        errors: errors.array(),
      };
      return res.render('users', payload);
    }
    let page;
    if (!req.query.page) {
      page = 1;
    } else {
      page = req.query.page;
    }
    let numPages;
    let userList = [];
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    db.get('SELECT COUNT(1) FROM users', (err, row) => {
      if (err) return logger.error(new Error(err.message));
      const numRecords = row['COUNT(1)'];
      numPages = Math.ceil(numRecords / recordsPerPage);
      const startRecord = (page - 1) * recordsPerPage;
      db.all('SELECT * FROM users LIMIT ' + recordsPerPage + ' OFFSET ' + startRecord, [], (err, rows) => {
        if (err) return logger.error(new Error(err.message));
        let user;
        for (let i = 0; i < rows.length; i++) {
          user = {
            'id':rows[i].user,
            'role':rows[i].role,
            'resetrequested':rows[i].resetrequested,
            'deleted':rows[i].deleted,
          };
          userList.push(user);
        }
      });
    });
    db.close((err) => {
      if (err) return logger.error(new Error(err.message));
      const payload = {
        authUser: req.session.userId,
        title: 'Administration',
        message: 'Below users are in the database',
        users: userList,
        currentPage: page,
        numPages: numPages,
        roleList: roleList,
      };
      res.render('users', payload);
    });
  }
);


app.get('/admin/users/add', (req, res) => {
  if (!checkPermissions('permSuper', req, res)) { return false; }
  const payload = {
    authUser: req.session.userId,
    title: 'Add User',
    message: 'Please enter below details to proceed',
    user: '',
    role: '',
    roleList: roleList,
  };
  res.render('users-add', payload);
});


app.post('/admin/users/add',
  body('password').escape(),
  body('password2').escape(),
  body('user').toLowerCase(),
  body('user')
    .isLength({ min: 5, })
    .withMessage('Username must be at least 5 characters long'),
  body('user')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Username contains disallowed characters'),
  body('password')
    .isLength({ min: 8, })
    .withMessage('Password must contain at least 8 characters'),
  body('password')
    .matches(/^(?=.*[!@#$%^&*]).*$/)
    .withMessage('Password must contain at least one special character'),
  body('password')
    .matches(/^(?=.*\d).*$/)
    .withMessage('Password must contain at least one digit'),
  body('password')
    .matches(/^(?=.*[a-z]).*$/)
    .withMessage('Password must contain at least one lower case letter'),
  body('password')
    .matches(/^(?=.*[A-Z]).*$/)
    .withMessage('Password must contain at least one upper case letter'),
  body('password2')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  body('role')
    .notEmpty()
    .withMessage('Role must not be empty'),
  body('role')
    .isIn(roleList)
    .withMessage('Invalid role'),
  (req, res) => {
    if (!checkPermissions('permSuper', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        authUser: req.session.userId,
        title: 'Add User',
        message: 'Errors occured. Refer below.',
        user: req.body.user,
        role: req.body.role,
        roleList: roleList,
        errors: errors.array(),
      };
      res.render('users-add', payload);
    } else {
      let errorList = [];
      let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
      let user = req.body.user;
      let passwordHash = crypto.createHash('sha256').update(req.body.password).digest('hex');
      let role = req.body.role;
      db.get('SELECT * FROM users WHERE user=\'' + user + '\'', (err, row) => {
        if (err) return logger.error(new Error(err.message));
        if (row) {
          errorList.push({ code: 101, msg: 'User already exists', });
        } else {
          db.run('INSERT INTO users(user, password, role) VALUES(?, ?, ?)', [user, passwordHash, role,], (err) => {
            if (err) {
              errorList.push({ code: err.errno, msg: err.message, });
              return logger.error(new Error(err.message));
            }
          });
        }
      });
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        if (errorList.length === 0) {
          const payload = {
            authUser: req.session.userId,
            title: 'Add User',
            message: 'User has been added successfully.',
            user: user,
            role: role,
          };
          res.render('users-add-complete', payload);
          addUserLogEntry('add_user', req.session.userId, user, null, null, null);
        } else {
          const payload = {
            authUser: req.session.userId,
            title: 'Add User',
            message: 'Errors occured. Refer below.',
            user: req.body.user,
            role: req.body.role,
            roleList: roleList,
            errors: errorList,
          };
          res.render('users-add', payload);
        }
      });
    }
  }
);


app.post('/admin/users/edit',
  body('role')
    .notEmpty()
    .withMessage('Role must not be empty'),
  body('role')
    .isIn(roleList)
    .withMessage('Invalid role'),
  (req, res) => {
    if (!checkPermissionsJson('permSuper', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        status: 'error',
        errors: errors.array(),
      };
      res.status(400).json(payload);
    } else {
      let errorList = [];
      let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
      let user = req.body.user;
      let role = req.body.role;
      if (req.session.userRole == 'Super-Admin' && role != 'Super-Admin') {
        db.get('SELECT * FROM users WHERE role = \'Super-Admin\' AND user != \'' + user + '\'', (err, row) => {
          if (err) return logger.error(new Error(err.message));
          if (!row) {
            return errorList.push({ msg: 'This action is not allowed since there are no Super-Admin users left!', });
          }
        });
      }
      db.run('UPDATE users SET role=? WHERE user = \'' + user + '\'', [role,], (err) => {
        if (err) {
          errorList.push({ code: err.errno, msg: err.message, });
          return logger.error(new Error(err.message));
        }
      });
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        if (errorList.length === 0) {
          const payload = {
            status: 'success',
            role: role,
          };
          res.json(payload);
          addUserLogEntry('edit_role', req.session.userId, user, null, null, role);
          removeUserSessions(user);
        } else {
          const payload = {
            status: 'error',
            errors: errorList,
          };
          res.status(400).json(payload);
        }
      });
    }
  }
);


app.post('/admin/users/deactivate', (req, res) => {
  if (!checkPermissionsJson('permSuper', req, res)) { return false; }
  let errorList = [];
  let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
  let user = req.body.user;
  db.all('SELECT * FROM users WHERE role=\'Super-Admin\' AND user=\'' + user + '\' AND deleted IS NOT 1', (err, rows) => {
    if (err) return logger.error(new Error(err.message));
    if (rows.length === 1) {
      errorList.push({ code: 101, msg: 'The only Super-Admin account cannot be disabled', });
    } else {
      db.run('UPDATE users SET deleted=? WHERE user = \'' + user + '\'', [1,], (err) => {
        if (err) {
          errorList.push({ code: err.errno, msg: err.message, });
          return logger.error(new Error(err.message));
        }
      });
    }
  });
  db.close((err) => {
    if (err) return logger.error(new Error(err.message));
    if (errorList.length === 0) {
      const payload = {
        status: 'success',
        user: user,
      };
      res.json(payload);
      addUserLogEntry('deactivate_user', req.session.userId, user, null, null, null);
      removeUserSessions(user);
    } else {
      const payload = {
        status: 'error',
        errors: errorList,
      };
      res.status(400).json(payload);
    }
  });
});


app.post('/admin/users/activate', (req, res) => {
  if (!checkPermissionsJson('permSuper', req, res)) { return false; }
  let errorList = [];
  let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
  let user = req.body.user;
  db.run('UPDATE users SET deleted=? WHERE user = \'' + user + '\'', [null,], (err) => {
    if (err) {
      errorList.push({ code: err.errno, msg: err.message, });
      return logger.error(new Error(err.message));
    }
  });
  db.close((err) => {
    if (err) return logger.error(new Error(err.message));
    if (errorList.length === 0) {
      const payload = {
        status: 'success',
        user: user,
      };
      res.json(payload);
      addUserLogEntry('activate_user', req.session.userId, user, null, null, null);
    } else {
      const payload = {
        status: 'error',
        errors: errorList,
      };
      res.status(400).json(payload);
    }
  });
});


app.post('/admin/users/reset',
  body('password').escape(),
  body('user').escape(),
  body('password2').escape(),
  body('password')
    .isLength({ min: 8, })
    .withMessage('Password must contain at least 8 characters'),
  body('password')
    .matches(/^(?=.*[!@#$%^&*]).*$/)
    .withMessage('Password must contain at least one special character'),
  body('password')
    .matches(/^(?=.*\d).*$/)
    .withMessage('Password must contain at least one digit'),
  body('password')
    .matches(/^(?=.*[a-z]).*$/)
    .withMessage('Password must contain at least one lower case letter'),
  body('password')
    .matches(/^(?=.*[A-Z]).*$/)
    .withMessage('Password must contain at least one upper case letter'),
  body('password2')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  (req, res) => {
    if (!checkPermissionsJson('permSuper', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        status: 'error',
        errors: errors.array(),
      };
      res.status(400).json(payload);
    } else {
      let errorList = [];
      let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
      let user = req.body.user;
      let passwordHash = crypto.createHash('sha256').update(req.body.password).digest('hex');
      db.run('UPDATE users SET password=?, resetrequested=? WHERE user = \'' + user + '\'', [passwordHash, null,], (err) => {
        if (err) {
          errorList.push({ code: err.errno, msg: err.message, });
          return logger.error(new Error(err.message));
        }
      });
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        if (errorList.length === 0) {
          const payload = {
            status: 'success',
          };
          res.json(payload);
          addUserLogEntry('admin_passreset', req.session.userId, user, null, null, null);
          removeUserSessions(user);
        } else {
          const payload = {
            status: 'error',
            errors: errorList,
          };
          res.status(400).json(payload);
        }
      });
    }
  }
);


app.get('/admin/userlog',
  query('page')
    .optional().isInt({ min: 1, })
    .withMessage('Invalid page number provided in query string'),
  (req, res) => {
    if (!checkPermissions('permAdmin', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        authUser: req.session.userId,
        title: 'Userlog',
        message: 'Below errors occured',
        errors: errors.array(),
      };
      return res.render('userlog', payload);
    }
    let page;
    if (!req.query.page) {
      page = 1;
    } else {
      page = req.query.page;
    }
    let numPages;
    let logs = [];
    let roomList = [];
    let meetingList = [];
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    db.get('SELECT COUNT(1) FROM userlog', (err, row) => {
      if (err) return logger.error(new Error(err.message));
      const numRecords = row['COUNT(1)'];
      numPages = Math.ceil(numRecords / (recordsPerPage * 2));
      const startRecord = (page - 1) * (recordsPerPage * 2);
      db.all('SELECT * FROM userlog ORDER BY datetime DESC LIMIT ' + (recordsPerPage * 2) + ' OFFSET ' + startRecord, [], (err, rows) => {
        if (err) return logger.error(new Error(err.message));
        let log;
        for (let i = 0; i < rows.length; i++) {
          log = {
            'event':rows[i].event,
            'datetime':rows[i].datetime,
            'user':rows[i].user,
            'userId':rows[i].userid,
            'roomId':rows[i].roomid,
            'meetingId':rows[i].meetingid,
            'data':rows[i].data,
          };
          logs.push(log);
        }
      });
      db.all('SELECT * FROM rooms', [], (err, rows) => {
        if (err) return logger.error(new Error(err.message));
        let room;
        for (let i = 0; i < rows.length; i++) {
          room = {
            'id':rows[i].id,
            'name':rows[i].name,
          };
          roomList.push(room);
        }
      });
      db.all('SELECT * FROM meetings', [], (err, rows) => {
        if (err) return logger.error(new Error(err.message));
        let meeting;
        for (let i = 0; i < rows.length; i++) {
          meeting = {
            'id':rows[i].id,
            'datetime':rows[i].datetime,
            'description':rows[i].description,
            'roomid':rows[i].roomid,
            'remarks':rows[i].remarks,
            'link':rows[i].link,
            'service':rows[i].service,
          };
          meetingList.push(meeting);
        }
      });  
    });
    db.close((err) => {
      if (err) return logger.error(new Error(err.message));
      const payload = {
        authUser: req.session.userId,
        title: 'Userlog',
        message: 'Below logs are in the database',
        currentPage: page,
        numPages: numPages,
        logs: logs,
        actions: actions,
        roomList: roomList,
        meetingList: meetingList,
      };
      res.render('userlog', payload);
    });
  }
);


app.get('/admin/backup', (req, res) => {
  if (!checkPermissions('permSuper', req, res)) { return false; }
  const payload = {
    authUser: req.session.userId,
    title: 'Database Backup & Export',
    quote: 'Talk is cheap, show me the code',
    author: 'Linus Torvalds (Creator of Linux)',
  };
  res.render('backup', payload);
});


app.post('/admin/backup', (req, res) => {
  if (!checkPermissionsJson('permSuper', req, res)) { return false; }
  let errorList = [];
  let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
  let backup = db.backup(dbBackupFile, (err) => {
    if (err) {
      errorList.push({ code: err.errno, msg: err.message, });
      return logger.error(new Error(err.message));
    }
  });
  backup.step(-1);
  backup.finish();
  db.close((err) => {
    if (err) return logger.error(new Error(err.message));
    if (errorList.length === 0 && !backup.failed) {
      const payload = {
        status: 'success',
        message: 'Database has been backed up successfully at ' + dbBackupFile,
      };
      res.json(payload);
      addUserLogEntry('db_backup', req.session.userId, null, null, null, null);
    } else {
      const payload = {
        status: 'error',
        errors: errorList,
      };
      res.status(400).json(payload);
    }
  });
});


app.get('/dbupgrade', (req, res) => {
  const payload = {
    authUser: req.session.userId,
    title: 'Database Upgrade Required!',
    subtitle: 'A database schema upgrade is required in order to start using the new version of the app.',
  };
  res.render('dbupgrade', payload);
});


app.post('/dbupgrade', (req, res) => {
  let errorList = [];
  let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
  let queries = [];
  let query;
  let thisVersion = 0;
  if (dbVersionFromDB == 0) {
    thisVersion = 1;
    query = 'ALTER TABLE meetings RENAME COLUMN meetinglink TO link';
    queries.push(query);
    query = 'ALTER TABLE meetings RENAME COLUMN meetingservice TO service';
    queries.push(query);
    query = 'INSERT INTO config (key, value) VALUES(\'dbVersion\', \'' + thisVersion + '\')';
    queries.push(query);
    queries.forEach(query => {
      db.run(query, (err) => {
        if (err) {
          errorList.push({ code: err.errno, msg: err.message, });
          return logger.error(new Error(err.message));
        } else {
          dbVersionFromDB = thisVersion;
          if (dbVersionFromDB == dbversion) dbUpgradeRequired = false;
        }
      });
    });
    }
  db.close((err) => {
    if (err) return logger.error(new Error(err.message));
    if (errorList.length === 0) {
      const payload = {
        status: 'success',
        message: 'Database schema has been upgraded successfully',
      };
      res.json(payload);
      addUserLogEntry('db_upgrade', req.session.userId, null, null, null, null);
    } else {
      const payload = {
        status: 'error',
        errors: errorList,
      };
      res.status(400).json(payload);
    }
  });
});


app.get('/rooms',
  query('page')
    .optional().isInt({ min: 1, })
    .withMessage('Invalid page number provided in query string'),
  (req, res) => {
    if (!checkPermissions('permAdmin', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        authUser: req.session.userId,
        title: 'List Rooms',
        message: 'Below errors occured',
        errors: errors.array(),
      };
      return res.render('rooms', payload);
    }
    let page;
    if (!req.query.page) {
      page = 1;
    } else {
      page = req.query.page;
    }
    let numPages;
    let roomList = [];
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    db.get('SELECT COUNT(1) FROM rooms WHERE deleted IS NOT 1', (err, row) => {
      if (err) return logger.error(new Error(err.message));
      const numRecords = row['COUNT(1)'];
      numPages = Math.ceil(numRecords / recordsPerPage);
      const startRecord = (page - 1) * recordsPerPage;
      db.all('SELECT * FROM rooms WHERE deleted IS NOT 1 LIMIT ' + recordsPerPage + ' OFFSET ' + startRecord, [], (err, rows) => {
        if (err) return logger.error(new Error(err.message));
        let room;
        for (let i = 0; i < rows.length; i++) {
          room = {
            'id':rows[i].id,
            'name':rows[i].name,
            'location':rows[i].location,
            'facilities':rows[i].facilities,
            'capacity':rows[i].capacity,
            'oos':rows[i].oos,
          };
          roomList.push(room);
        }
      });
    });
    db.close((err) => {
      if (err) return logger.error(new Error(err.message));
      const payload = {
        authUser: req.session.userId,
        title: 'List Rooms',
        message: 'Below rooms are in the database',
        rooms: roomList,
        currentPage: page,
        numPages: numPages,
        facilityList: facilityList,
      };
      res.render('rooms', payload);
    });
  }
);


app.get('/rooms/add', (req, res) => {
  if (!checkPermissions('permAdmin', req, res)) { return false; }
  let facilitiesStatus = [];
  for (const [value] of Object.entries(facilityList)) {
    facilitiesStatus[value] = false;
  }
  const payload = {
    authUser: req.session.userId,
    title: 'Add Room',
    message: 'Please enter room details to proceed',
    name: '',
    location: '',
    capacity: '',
    facilityList: facilityList,
    facilitiesStatus: facilitiesStatus,
  };
  res.render('rooms-add', payload);
});


app.post('/rooms/add',
  body('name')
    .notEmpty()
    .withMessage('Room name must not be empty'),
  body('name')
    .matches(/^[a-z0-9_:;,#@ .?$()[\]{}+\-*|]+$/i)
    .withMessage('Room name contains invalid characters'),
  body('location')
    .notEmpty()
    .withMessage('Location must not be empty'),
  body('location')
    .matches(/^[a-z0-9_:;,#@ .?$()[\]{}+\-*|]+$/i)
    .withMessage('Location contains invalid characters'),
  body('capacity')
    .notEmpty()
    .withMessage('Capacity must not be empty'),
  body('capacity')
    .matches(/^[0-9]+$/)
    .withMessage('Capacity must be a number'),
  body('capacity')
    .isInt({ min: 1, max: 999, })
    .withMessage('Capacity must be between 1 and 999'),
  (req, res) => {
    if (!checkPermissions('permAdmin', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      let facilitiesStatus = [];
      let thisFacilityWithPrefix;
      for (const [value] of Object.entries(facilityList)) {
        thisFacilityWithPrefix = 'facility' + value;
        facilitiesStatus[value] = req.body[thisFacilityWithPrefix];
      }
      const payload = {
        authUser: req.session.userId,
        title: 'Add Room',
        message: 'Errors occured. Please refer below',
        errors: errors.array(),
        name: req.body.name,
        location: req.body.location,
        capacity: req.body.capacity,
        facilityList: facilityList,
        facilitiesStatus: facilitiesStatus,
      };
      res.render('rooms-add', payload);
    } else {
      let facilities = '';
      let thisFacility;
      let thisFacilityWithPrefix;
      Object.keys(facilityList).forEach((key) => {
        thisFacility = facilityList[key];
        thisFacilityWithPrefix = 'facility' + thisFacility;
        if (req.body[thisFacilityWithPrefix] === 'on') {
          facilities += thisFacility + ' ';
        }
      });
      let errorList = [];
      let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
      let id = crypto.createHash('sha256').update(Math.random().toString(36).slice(-8)).digest('hex');
      let name = req.body.name;
      let location = req.body.location;
      let capacity = req.body.capacity;
      let oos = 0;
      db.run('INSERT INTO rooms(id, name, location, facilities, capacity, oos) VALUES(?, ?, ?, ?, ?, ?)', [id, name, location, facilities, capacity, oos,], (err) => {
        if (err) {
          errorList.push({ code: err.errno, msg: err.message, });
          return logger.error(new Error(err.message));
        }
      });
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        if (errorList.length === 0) {
          res.render('rooms-add-complete', {
            authUser: req.session.userId,
            title: 'Success',
            message: 'Room has been added as follows.',
            name: name,
            location: location,
            facilities: facilities,
            capacity: capacity,
          });
          addUserLogEntry('add_room', req.session.userId, null, id, null, null);
        } else {
          res.render('rooms-add', {
            authUser: req.session.userId,
            title: 'Error',
            message: 'Errors occured while adding room.',
            errors: errorList,
          });
        }
      });
    }
  }
);


app.post('/rooms/edit',
  body('name')
    .notEmpty()
    .withMessage('Room name must not be empty'),
  body('name')
    .matches(/^[a-z0-9_:;,#@ .?$()[\]{}+\-*|]+$/i)
    .withMessage('Room name contains invalid characters'),
  body('location')
    .notEmpty()
    .withMessage('Location must not be empty'),
  body('location')
    .matches(/^[a-z0-9_:;,#@ .?$()[\]{}+\-*|]+$/i)
    .withMessage('Location contains invalid characters'),
  body('capacity')
    .notEmpty()
    .withMessage('Capacity must not be empty'),
  body('capacity')
    .matches(/^[0-9]+$/)
    .withMessage('Capacity must be a number'),
  body('capacity')
    .isInt({ min: 1, max: 999, })
    .withMessage('Capacity must be between 1 and 999'),
  (req, res) => {
    if (!checkPermissionsJson('permAdmin', req, res)) { return false; }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const payload = {
        status: 'error',
        errors: errors.array(),
      };
      res.status(400).json(payload);
    } else {
      let facilities = '';
      let thisFacility;
      let thisFacilityWithPrefix;
      Object.keys(facilityList).forEach((key) => {
        thisFacility = facilityList[key];
        thisFacilityWithPrefix = 'facility' + thisFacility;
        if (req.body[thisFacilityWithPrefix] === 'on') {
          facilities += thisFacility + ' ';
        }
      });
      let errorList = [];
      let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
      let id = req.body.id;
      let name = req.body.name;
      let location = req.body.location;
      let capacity = req.body.capacity;
      let oos = req.body.oos;
      db.run('UPDATE rooms SET name=?, location=?, facilities=?, capacity=?, oos=? WHERE id = \'' + id + '\'', [name, location, facilities, capacity, oos,], (err) => {
        if (err) {
          errorList.push({ code: err.errno, msg: err.message, });
          return logger.error(new Error(err.message));
        }
      });
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        if (errorList.length === 0) {
          const payload = {
            status: 'success',
            id: id,
            name: name,
            location:location,
            facilities: facilities,
            capacity: capacity,
            oos: oos,
          };
          res.json(payload);
          addUserLogEntry('edit_room', req.session.userId, null, id, null, null);
        } else {
          const payload = {
            status: 'error',
            errors: errorList,
          };
          res.status(400).json(payload);
        }
      });
    }
  }
);


app.post('/rooms/delete', (req, res) => {
  if (!checkPermissionsJson('permAdmin', req, res)) { return false; }
  let errorList = [];
  let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
  let id = req.body.id;
  db.run('UPDATE rooms SET deleted=? WHERE id = \'' + id + '\'', [1,], (err) => {
    if (err) {
      errorList.push({ code: err.errno, msg: err.message, });
      return logger.error(new Error(err.message));
    }
  });
  db.close((err) => {
    if (err) return logger.error(new Error(err.message));
    if (errorList.length === 0) {
      const payload = {
        status: 'success',
        id: id,
      };
      res.json(payload);
      addUserLogEntry('delete_room', req.session.userId, null, id, null, null);
    } else {
      const payload = {
        status: 'error',
        errors: errorList,
      };
      res.json(payload);
    }
  });
});


app.get('/meetings',
  query('page')
    .optional().isInt({ min: 1, })
    .withMessage('Invalid page number provided in query string'),
  query('q')
    .optional({ checkFalsy: true, }).matches(/^[a-z0-9_:;,#@ .?$()[\]{}+\-*|]+$/i)
    .withMessage('Search query contains invalid characters'),
  (req, res) => {
    if (!checkPermissions('permView', req, res)) { return false; }
    const errors = validationResult(req);
    let q = req.query.q;
    if (!q) {
      q = '';
    }
  if (!errors.isEmpty()) {
      const payload = {
        authUser: req.session.userId,
        title: 'List Meetings',
        message: 'Below errors occured',
        errors: errors.array(),
        q: q,
      };
      return res.render('meetings', payload);
    }
    let page;
    if (!req.query.page) {
      page = 1;
    } else {
      page = req.query.page;
    }
    let numPages;
    let meetingList = [];
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    const roomList = getRoomList();
    const startRecord = (page - 1) * recordsPerPage;
    db.all('SELECT * FROM meetings WHERE deleted IS NOT 1 AND description LIKE \'%' + q + '%\' ORDER BY datetime DESC LIMIT ' + recordsPerPage + ' OFFSET ' + startRecord, [], (err, rows) => {
      if (err) return logger.error(new Error(err.message));
      let meeting;
      for (let i = 0; i < rows.length; i++) {
        meeting = {
          'id':rows[i].id,
          'datetime':rows[i].datetime,
          'duration':rows[i].duration,
          'repeat':rows[i].repeat,
          'description':rows[i].description,
          'roomid':rows[i].roomid,
          'remarks':rows[i].remarks,
          'link':rows[i].link,
          'service':rows[i].service,
        };
        meetingList.push(meeting);
      }
    });
    db.get('SELECT COUNT(1) AS count FROM meetings WHERE deleted IS NOT 1 AND description LIKE \'%' + q + '%\'', [], (err, row) => {
      if (err) return logger.error(new Error(err.message));
      numPages = Math.ceil(row.count / recordsPerPage);
    });
    db.close((err) => {
      if (err) return logger.error(new Error(err.message));
      const payload = {
        authUser: req.session.userId,
        title: 'List Meetings',
        message: 'Below meetings are in the database',
        meetings: meetingList,
        currentPage: page,
        numPages: numPages,
        roomList: roomList,
        serviceList: serviceList,
        q: q,
      };
      res.render('meetings', payload);
    });
  }
);


app.get('/meetings/add', (req, res) => {
  if (!checkPermissions('permEdit', req, res)) { return false; }
  const roomList = getRoomList();
  const payload = {
    authUser: req.session.userId,
    title: 'Add a new Meeting',
    message: 'Please enter meeting details to proceed',
    datetime: '',
    duration: '',
    description: '',
    room: '',
    remarks: '',
    link: '',
    service: '',
    serviceList: serviceList,
    roomList: roomList,
  };
  res.render('meetings-add', payload);
});


app.post('/meetings/add',
  body('datetime')
    .notEmpty()
    .withMessage('Date and time must not be empty'),
  body('duration')
    .notEmpty()
    .withMessage('Duration must not be empty'),
  body('repeat')
    .notEmpty()
    .withMessage('Repeat parameter must not be empty'),
  body('description')
    .notEmpty()
    .withMessage('Description must not be empty'),
  body('description')
    .matches(/^[a-z0-9_:;,#@ .?$()[\]{}+\-*|]+$/i)
    .withMessage('Description contains invalid characters'),
  body('room')
    .notEmpty()
    .withMessage('Room must not be empty'),
  body('remarks')
    .escape(),
  body('remarks')
    .optional({ checkFalsy: true, }).matches(/^[a-z0-9_/:;,#@& .?$()[\]{}+\-*|\n\r]+$/i).escape()
    .withMessage('Remarks contain invalid characters'),
  body('service')
    .escape(),
  body('link')
    .optional({ checkFalsy: true, }).isURL({ protocols: ['http','https',], require_protocol: true, validate_length: false, })
    .withMessage('Invalid meeting link'),
  (req, res) => {
    if (!checkPermissions('permEdit', req, res)) { return false; }
    const errors = validationResult(req);
    const roomId = req.body.room;
    const duration = req.body.duration;
    const repeat = req.body.repeat;
    const timeStamp = new Date(req.body.datetime).getTime() / 1000;
    const meetingStart = timeStamp;
    const meetingEnd = timeStamp + (parseInt(duration) * 60);
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    const roomList = getRoomList();
    const overlapMeeting = getOverlapMeeting(meetingStart, meetingEnd, roomId);
    if (overlapMeeting) {
      let errorList = [];
      const timeFormatOptions = { year:'numeric', month:'2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true, }
      const overlapDescription = overlapMeeting.description;
      const overlapDateTime = new Date(overlapMeeting.datetime * 1000).toLocaleString('en-GB', timeFormatOptions);
      let overlapDuration;
      if (overlapMeeting.duration/60 < 60) {
        overlapDuration = overlapMeeting.duration/60 + ' minutes';
      } else if (overlapMeeting.duration/60 == 60) {
        overlapDuration = overlapMeeting.duration/60/60 + ' hour';
      } else {
        overlapDuration = overlapMeeting.duration/60/60 + ' hours';
      }
      errorList.push({ msg: 'Overlapping meeting: ' + overlapDescription + ' at ' + overlapDateTime + ' for ' + overlapDuration, });
      res.render('meetings-add', {
        authUser: req.session.userId,
        title: 'Error',
        message: 'Errors occured. Please refer below.',
        errors: errorList,
        datetime: req.body.datetime,
        duration: req.body.duration,
        description: req.body.description,
        room: req.body.room,
        remarks: req.body.remarks,
        link: req.body.link,
        service: req.body.service,
        serviceList: serviceList,
        roomList: roomList,
      });
    } else {
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        if (!errors.isEmpty()) {
          const payload = {
            authUser: req.session.userId,
            title: 'Add a new Meetings',
            message: 'Below errors occured',
            errors: errors.array(),
            datetime: req.body.datetime,
            duration: req.body.duration,
            description: req.body.description,
            room: req.body.room,
            remarks: req.body.remarks,
            link: req.body.link,
            service: req.body.service,
            serviceList: serviceList,
            roomList: roomList,
          };
          return res.render('meetings-add', payload);
        } else {
          let errorList = [];
          let id = crypto.createHash('sha256').update(Math.random().toString(36).slice(-8)).digest('hex');
          let datetime = timeStamp;
          let description = req.body.description;
          let duration = req.body.duration * 60;
          let room = req.body.room;
          let remarks = req.body.remarks;
          let link = req.body.link;
          let service = req.body.service;
          let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
          db.run('INSERT INTO meetings(id, datetime, duration, repeat, description, roomid, remarks, link, service) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, datetime, duration, repeat, description, room, remarks, link, service,], (err) => {
            if (err) {
              errorList.push({ code: err.errno, msg: err.message, });
              return logger.error(new Error(err.message));
            }
          });
          db.close((err) => {
            if (err) return logger.error(new Error(err.message));
            if (errorList.length === 0) {
              res.render('meetings-add-complete', {
                authUser: req.session.userId,
                title: 'Success',
                message: 'Meeting has been added as follows.',
                datetime: req.body.datetime,
                duration: req.body.duration,
                repeat: req.body.repeat,
                description: req.body.description,
                room: req.body.room,
                remarks: req.body.remarks,
                link: req.body.link,
                service: req.body.service,
                serviceList: serviceList,
                roomList: roomList,
              });
              addUserLogEntry('add_meeting', req.session.userId, null, req.body.room, id, null);
            } else {
              res.render('meetings-add', {
                authUser: req.session.userId,
                title: 'Error',
                message: 'Errors occured. Please refer below.',
                errors: errorList,
                datetime: req.body.datetime,
                duration: req.body.duration,
                repeat: req.body.repeat,
                description: req.body.description,
                room: req.body.room,
                remarks: req.body.remarks,
                link: req.body.link,
                service: req.body.service,
                serviceList: serviceList,
                roomList: roomList,
              });
            }
          });
        }
      });
    }
  }
);


app.post('/meetings/edit',
  body('datetime')
    .notEmpty()
    .withMessage('Date and time must not be empty'),
  body('duration')
    .notEmpty()
    .withMessage('Duration must not be empty'),
  body('repeat')
    .notEmpty()
    .withMessage('Repeat parameter must not be empty'),
  body('description')
    .notEmpty()
    .withMessage('Description must not be empty'),
  body('description')
    .matches(/^[a-z0-9_:;,#@ .?$()[\]{}+\-*|]+$/i)
    .withMessage('Description contains invalid characters'),
  body('id')
    .notEmpty()
    .withMessage('Meeting ID must not be empty'),
  body('room')
    .notEmpty()
    .withMessage('Room must not be empty'),
  body('remarks')
    .optional({ checkFalsy: true, }).matches(/^[a-z0-9_/:;,#@& .?$()[\]{}+\-*|\n\r]+$/i).escape()
    .withMessage('Remarks contain invalid characters'),
  body('service')
    .escape(),
  body('link')
    .optional({ checkFalsy: true, }).isURL({ protocols: ['http','https',], require_protocol: true, validate_length: false, })
    .withMessage('Invalid meeting link'),
  (req, res) => {
    if (!checkPermissionsJson('permEdit', req, res)) { return false; }
    const errors = validationResult(req);
    const roomId = req.body.room;
    const duration = req.body.duration;
    const timeStamp = new Date(req.body.datetime).getTime() / 1000;
    const meetingStart = timeStamp;
    const meetingEnd = timeStamp + (parseInt(duration) * 60);
    const meetingId = req.body.id;
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    const roomList = getRoomList();
    const overlapMeeting = getOverlapMeeting(meetingStart, meetingEnd, roomId, meetingId);
    if (overlapMeeting) {
      let errorList = [];
      const timeFormatOptions = { year:'numeric', month:'2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true, }
      const overlapDescription = overlapMeeting.description;
      const overlapDateTime = new Date(overlapMeeting.datetime * 1000).toLocaleString('en-GB', timeFormatOptions);
      let overlapDuration;
      if (overlapMeeting.duration/60 < 60) {
        overlapDuration = overlapMeeting.duration/60 + ' minutes';
      } else if (overlapMeeting.duration/60 == 60) {
        overlapDuration = overlapMeeting.duration/60/60 + ' hour';
      } else {
        overlapDuration = overlapMeeting.duration/60/60 + ' hours';
      }
      errorList.push({ msg: 'Overlapping meeting: ' + overlapDescription + ' at ' + overlapDateTime + ' for ' + overlapDuration, });
      const payload = {
        status: 'error',
        errors: errorList,
      };
      res.status(400).json(payload);
    } else {
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        if (!errors.isEmpty()) {
          const payload = {
            status: 'error',
            errors: errors.array(),
          };
          res.status(400).json(payload);
      } else {
          let errorList = [];
          let id = req.body.id;
          let datetime = timeStamp;
          let duration = req.body.duration * 60;
          let repeat = req.body.repeat;
          let description = req.body.description;
          let room = req.body.room;
          let remarks = req.body.remarks;
          let link = req.body.link;
          let service = req.body.service;
          let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
          db.run('UPDATE meetings SET datetime=?, duration=?, repeat=?, description=?, roomid=?, remarks=?, link=?, service=? WHERE id = \'' + id + '\'', [datetime, duration, repeat, description, room, remarks, link, service,], (err) => {
            if (err) {
              errorList.push({ code: err.errno, msg: err.message, });
              return logger.error(new Error(err.message));
            }
          });
          db.close((err) => {
            if (err) return logger.error(new Error(err.message));
            if (errorList.length === 0) {
              const payload = {
                status: 'success',
                datetime: timeStamp,
                duration: req.body.duration,
                repeat: req.body.repeat,
                description: req.body.description,
                room: req.body.room,
                remarks: req.body.remarks,
                link: req.body.link,
                service: req.body.service,
                serviceList: serviceList,
                roomList: roomList,
              };
              res.json(payload);
              addUserLogEntry('edit_meeting', req.session.userId, null, req.body.room, id, null);
            } else {
              const payload = {
                status: 'error',
                errors: errorList,
              };
              res.status(400).json(payload);
            }
          });
        }
      });
    }
  }
);


app.post('/meetings/extend',
  body('datetime')
    .notEmpty()
    .withMessage('Date and time must not be empty'),
  body('duration')
      .notEmpty()
      .withMessage('Duration must not be empty'),
  body('extend')
      .notEmpty()
      .withMessage('Extend duration must not be empty'),
  body('id')
    .notEmpty()
    .withMessage('ID must not be empty'),
  body('roomid')
    .notEmpty()
    .withMessage('Room ID must not be empty'),
  (req, res) => {
    if (!checkPermissionsJson('permEdit', req, res)) { return false; }
    const errors = validationResult(req);
    const duration = req.body.duration;
    const extend = req.body.extend;
    const roomId = req.body.roomid;
    const timeStamp = new Date(parseInt(req.body.datetime)).getTime();
    const meetingStart = timeStamp;
    const meetingEnd = timeStamp + ((parseInt(duration)) + parseInt(extend));
    const meetingId = req.body.id;
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    const overlapMeeting = getOverlapMeeting(meetingStart, meetingEnd, roomId, meetingId);
    if (overlapMeeting) {
      let errorList = [];
      const timeFormatOptions = { year:'numeric', month:'2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true, }
      const overlapDescription = overlapMeeting.description;
      const overlapDateTime = new Date(overlapMeeting.datetime * 1000).toLocaleString('en-GB', timeFormatOptions);
      let overlapDuration;
      if (overlapMeeting.duration/60 < 60) {
        overlapDuration = overlapMeeting.duration/60 + ' minutes';
      } else if (overlapMeeting.duration/60 == 60) {
        overlapDuration = overlapMeeting.duration/60/60 + ' hour';
      } else {
        overlapDuration = overlapMeeting.duration/60/60 + ' hours';
      }
      errorList.push({ msg: 'Overlapping meeting: ' + overlapDescription + ' at ' + overlapDateTime + ' for ' + overlapDuration, });
      const payload = {
        status: 'error',
        errors: errorList,
      };
      res.status(400).json(payload);
    } else {
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        if (!errors.isEmpty()) {
          const payload = {
            status: 'error',
            errors: errors.array(),
          };
          res.status(400).json(payload);
      } else {
          let errorList = [];
          let id = req.body.id;
          let newDuration = (parseInt(req.body.duration) + parseInt(req.body.extend));
          let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
          db.run('UPDATE meetings SET duration=? WHERE id = \'' + id + '\'', [newDuration,], (err) => {
            if (err) {
              errorList.push({ code: err.errno, msg: err.message, });
              return logger.error(new Error(err.message));
            }
          });
          db.close((err) => {
            if (err) return logger.error(new Error(err.message));
            if (errorList.length === 0) {
              const newEndTime = new Date((parseInt(req.body.datetime) + parseInt(newDuration)) * 1000).getTime() / 1000;
              const payload = {
                status: 'success',
                datetime: timeStamp,
                duration: newDuration,
                endtime: newEndTime,
                room: req.body.roomid,
              };
              res.json(payload);
              addUserLogEntry('edit_meeting', req.session.userId, null, req.body.room, id, null);
            } else {
              const payload = {
                status: 'error',
                errors: errorList,
              };
              res.status(400).json(payload);
            }
          });
        }
      });
    }
  }
);


app.post('/meetings/end',
  body('datetime')
    .notEmpty()
    .withMessage('Date and time must not be empty'),
  body('duration')
      .notEmpty()
      .withMessage('Duration must not be empty'),
  body('id')
    .notEmpty()
    .withMessage('ID must not be empty'),
  body('roomid')
    .notEmpty()
    .withMessage('Room ID must not be empty'),
  (req, res) => {
    if (!checkPermissionsJson('permEdit', req, res)) { return false; }
    const errors = validationResult(req);
    const roomId = req.body.roomid;
    const timeStamp = new Date(parseInt(req.body.datetime)).getTime();
    const meetingStart = timeStamp;
    const meetingEnd = (new Date().getTime() / 1000) - (1 * 60);
    const meetingId = req.body.id;
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    const overlapMeeting = getOverlapMeeting(meetingStart, meetingEnd, roomId, meetingId);
    if (overlapMeeting) {
      let errorList = [];
      const timeFormatOptions = { year:'numeric', month:'2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true, }
      const overlapDescription = overlapMeeting.description;
      const overlapDateTime = new Date(overlapMeeting.datetime * 1000).toLocaleString('en-GB', timeFormatOptions);
      let overlapDuration;
      if (overlapMeeting.duration/60 < 60) {
        overlapDuration = overlapMeeting.duration/60 + ' minutes';
      } else if (overlapMeeting.duration/60 == 60) {
        overlapDuration = overlapMeeting.duration/60/60 + ' hour';
      } else {
        overlapDuration = overlapMeeting.duration/60/60 + ' hours';
      }
      errorList.push({ msg: 'Overlapping meeting: ' + overlapDescription + ' at ' + overlapDateTime + ' for ' + overlapDuration, });
      const payload = {
        status: 'error',
        errors: errorList,
      };
      res.status(400).json(payload);
    } else {
      db.close((err) => {
        if (err) return logger.error(new Error(err.message));
        if (!errors.isEmpty()) {
          const payload = {
            status: 'error',
            errors: errors.array(),
          };
          res.status(400).json(payload);
      } else {
          let errorList = [];
          let id = req.body.id;
          let newDuration = Math.floor((meetingEnd - meetingStart) / 60) * 60;
          let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
          db.run('UPDATE meetings SET duration=? WHERE id = \'' + id + '\'', [newDuration,], (err) => {
            if (err) {
              errorList.push({ code: err.errno, msg: err.message, });
              return logger.error(new Error(err.message));
            }
          });
          db.close((err) => {
            if (err) return logger.error(new Error(err.message));
            if (errorList.length === 0) {
              let newEndTime = new Date((parseInt(req.body.datetime) + parseInt(newDuration)) * 1000).getTime() / 1000;
              const payload = {
                status: 'success',
                datetime: timeStamp,
                duration: newDuration,
                endtime: newEndTime,
                room: req.body.roomid,
              };
              res.json(payload);
              addUserLogEntry('edit_meeting', req.session.userId, null, req.body.room, id, null);
            } else {
              const payload = {
                status: 'error',
                errors: errorList,
              };
              res.status(400).json(payload);
            }
          });
        }
      });
    }
  }
);


app.post('/meetings/delete',
  body('id')
      .notEmpty()
      .withMessage('ID must not be empty'),
  (req, res) => {
    if (!checkPermissionsJson('permAdmin', req, res)) { return false; }
    let errorList = [];
    let db = new sqlite3.Database(dbFile, (err) => { if (err) return logger.error(new Error(err.message)); });
    let id = req.body.id;
    db.run('UPDATE meetings SET deleted=? WHERE id = \'' + id + '\'', [1,], (err) => {
      if (err) {
        errorList.push({ code: err.errno, msg: err.message, });
        return logger.error(new Error(err.message));
      }
    });
    db.close((err) => {
      if (err) return logger.error(new Error(err.message));
      if (errorList.length === 0) {
        const payload = {
          status: 'success',
          id: id,
        };
        res.json(payload);
        addUserLogEntry('delete_meeting', req.session.userId, null, null, id, null);
      } else {
        const payload = {
          status: 'error',
          errors: errorList,
        };
        res.json(payload);
      }
    });
  }
);


app.get('/about', (req, res) => {
  if (!firstrunComplete()) { return res.redirect('/firstrun'); }
  let versionLogic;
  const getVersionFromGithub = async () => {
    let version = kettleCache.get('version');
    if (!version) {
      let response = await fetch('https://raw.githubusercontent.com/ameer1234567890/MeetKettle/master/package.json');
      try {
        const data = await response.json();
        kettleCache.set('version', data.version, 3600);
        versionLogic = 'github';
        return data.version;
      } catch (error) {
        logger.error(new Error(error))
        return null;
      }
    } else {
      versionLogic = 'cache';
      return version;
    }
  };
  getVersionFromGithub().then((upstreamVersion) => {
    const payload = {
      authUser: req.session.userId,
      version: version,
      upstreamVersion: upstreamVersion,
      versionLogic: versionLogic,
    };
    res.render('about', payload);
  });
});


if (fs.existsSync('cert/privkey.pem') && fs.existsSync('cert/cert.pem') && fs.existsSync('cert/chain.pem')) {
  const https = require('https');
  const privateKey = fs.readFileSync('cert/privkey.pem', 'utf8');
  const certificate = fs.readFileSync('cert/cert.pem', 'utf8');
  const ca = fs.readFileSync('cert/chain.pem', 'utf8');
  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca,
  };
  const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(PORT, () => {
    logger.info('HTTPS Server running on port ' + PORT);
  });
} else {
  const http = require('http');
  const httpServer = http.createServer(app);
  httpServer.listen(PORT, () => {
    logger.info('HTTP Server running on port ' + PORT);
  });
}
