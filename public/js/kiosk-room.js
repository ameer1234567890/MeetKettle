document.addEventListener("DOMContentLoaded", function() {
  let roomId = new URLSearchParams(document.location.search).get('room');
  document.getElementById('book-button').href = '/kiosk/meetingadd?room=' + roomId;
  activateTooltips()
  getWakeLock();
  setTimeout(updateTime, 1000);
});

function activateTooltips() {
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

async function getWakeLock() {
  let wakeLock = null;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    console.log('Wake Lock is active!');
  } catch (err) {
    console.log(`${err.name}, ${err.message}`);
  }
}

function updateTime() {
  if (new Date().getSeconds() == 1) window.location.reload();
  const timeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, };
  const now = new Date().toLocaleTimeString('en-GB', timeFormatOptions).toUpperCase();
  document.getElementById('clock').innerHTML =  now;
  setTimeout(updateTime, 1000);
}

// Relative time
let units = {
  year  : 24 * 60 * 60 * 1000 * 365,
  month : 24 * 60 * 60 * 1000 * 365/12,
  day   : 24 * 60 * 60 * 1000,
  hour  : 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000,
};

let rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', });

let getRelativeTime = (d1, d2 = new Date()) => {
  let elapsed = d1 - d2;

  // "Math.abs" accounts for both "past" & "future" scenarios
  for (let u in units) {
    if (Math.abs(elapsed) > units[u] || u === 'second') {
      return rtf.format(Math.round(elapsed/units[u]), u);
    }
  }
};

let cards = document.querySelectorAll('.card');
let datetimeElement;
let timeStamp;
for (let i = 0; i < cards.length; i++) {
  datetimeElement = document.querySelectorAll('.card')[i].querySelector("span:nth-child(1)");
  timeStamp = datetimeElement.getAttribute('data-timestamp');
  datetimeElement.innerText = getRelativeTime(+new Date(timeStamp * 1000));
}
