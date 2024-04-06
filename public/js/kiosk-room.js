document.addEventListener("DOMContentLoaded", function() {
  let roomId = new URLSearchParams(document.location.search).get('room');
  document.getElementById('book-button').href = '/kiosk/meetingadd?room=' + roomId;
  getWakeLock();
  setTimeout(updateTime, 1000);
});
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
