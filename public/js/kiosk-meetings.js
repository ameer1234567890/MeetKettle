document.addEventListener('DOMContentLoaded', function() {
  getWakeLock();
  setTimeout(updateTime, 1000);
});


async function getWakeLock() {
  try {
    await navigator.wakeLock.request('screen');
    console.log('Wake Lock is active!');
  } catch (err) {
    console.log(`${err.name}, ${err.message}`);
  }
}


function updateTime() {
  const timeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, };
  const now = new Date().toLocaleTimeString('en-GB', timeFormatOptions).toUpperCase();
  document.getElementById('clock').innerHTML =  now;
  setTimeout(updateTime, 1000);
}


let getRelativeDay = (d1, d2 = new Date()) => {
  let secondsInADay = 86400000;
  let secondsInAWeek = secondsInADay * 7;
  let diffDays = Math.floor((d1.getTime() - d2.getTime()) / secondsInADay);
  let diffWeeks = Math.floor((d1.getTime() - d2.getTime()) / secondsInAWeek);
  if (d1.toLocaleDateString('en-GB') == d2.toLocaleDateString('en-GB')) {
    return 'Today';
  } else if (diffDays == 1  || diffDays == 0) {
    return 'Tomorrow'
  } else if (diffWeeks == 1) {
    return 'in ' + diffWeeks + ' week';
  } else if (diffWeeks >= 1) {
    return 'in ' + diffWeeks + ' weeks';
  } else {
    return 'in ' + diffDays + ' days';
  }
};

let items = document.querySelectorAll('.list-group-item');
let datetimeElement;
let timeStamp;
for (let i = 0; i < items.length; i++) {
  datetimeElement = document.querySelectorAll('.list-group-item')[i].querySelector('span:nth-child(1)');
  timeStamp = datetimeElement.getAttribute('data-timestamp');
  datetimeElement.innerText = getRelativeDay(new Date(timeStamp * 1000)) + ' ' + datetimeElement.innerText;
}
