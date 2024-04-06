document.addEventListener("DOMContentLoaded", function() {
  validateMeetingTime();
  getWakeLock();
  setTimeout(updateTime, 1000);
});
document.getElementById('timeCustom').addEventListener("click", function() {
  var timeBoxes = document.getElementsByName('time');
  for (var i = 0; i < timeBoxes.length; i++) {
    if (timeBoxes[i].type === 'radio' && timeBoxes[i].checked) {
      timeBoxes[i].checked = false;
    }
  }
});
document.getElementById('addMeetingForm').addEventListener("submit", function(event) {
  event.preventDefault();
  var dateString = new Date().getFullYear() + '/' + new Date().getMonth() + '/' + new Date().getDay();
  var timeString;
  if (document.querySelectorAll('input[name=time]:checked')[0]) {
    timeString = document.querySelectorAll('input[name=time]:checked')[0].value;
  } else {
    timeString = document.getElementById('timeCustom').value;
  }
  document.getElementsByName('datetime').value = new Date(dateString + ' ' + timeString);
  document.getElementById('addMeetingForm').submit();
});
function validateMeetingTime() {
  const inputs = Array.from(
    document.querySelectorAll('input[name=time]')
  );
  const inputListener = e => {
    inputs
      .filter(i => i !== e.target)
      .forEach(i => (i.required = !e.target.value.length));
  };
  inputs.forEach(i => i.addEventListener('input', inputListener));
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
  const timeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, };
  const now = new Date().toLocaleTimeString('en-GB', timeFormatOptions).toUpperCase();
  document.getElementById('clock').innerHTML =  now;
  setTimeout(updateTime, 1000);
}