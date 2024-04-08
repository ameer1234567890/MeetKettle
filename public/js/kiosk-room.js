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
  // A single if statement with the || (OR) operator does not work (hack)
  if (document.getElementById('modal-end').style.display != 'block') {
    if (document.getElementById('modal-extend').style.display != 'block') {
      if (new Date().getSeconds() == 1) window.location.reload();
    }
  }
  const timeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, };
  const now = new Date().toLocaleTimeString('en-GB', timeFormatOptions).toUpperCase();
  document.getElementById('clock').innerHTML =  now;
  setTimeout(updateTime, 1000);
}


// Extend modal
let extendButton;
let extendModal = document.getElementById('modal-extend');
let extendErrorsElement = document.querySelector('#extend-errors');
extendModal.addEventListener('show.bs.modal', function (event) {
  extendErrorsElement.innerHTML = '';
  extendButton = event.relatedTarget;
  extendModal.querySelector('#extend-id').value = extendButton.getAttribute('data-id');
  extendModal.querySelector('#extend-roomid').value = extendButton.getAttribute('data-roomid');
  extendModal.querySelector('#extend-datetime').value = extendButton.getAttribute('data-datetime');
  extendModal.querySelector('#extend-duration').value = extendButton.getAttribute('data-duration');
});
document.querySelector('#extend-form').addEventListener('submit', function(event) {
  event.preventDefault();
  let submitButton = document.querySelector('#modal-extend .btn-primary');
  let submitButtonIcon = document.querySelector('#modal-extend .btn-primary > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-check');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#extend-form')));
  fetch('/meetings/extend', {
    method: 'POST',
    body: data,
  })
  .then(response => response.json())
  .then(function(data) {
    if (data.status === 'success') {
      setTimeout(function() {
        submitButton.disabled = false;
        submitButtonIcon.classList.remove('fa-pulse');
        submitButtonIcon.classList.remove('fa-spinner');
        submitButtonIcon.classList.add('fa-check');
        submitButton.classList.remove('btn-primary');
        submitButton.classList.add('btn-success');
        setTimeout(function() {
          let modal = bootstrap.Modal.getInstance(extendModal);
          modal.hide();
          let timeElement = document.querySelector("#until > span");
          timeElement.classList.add('fade-transition');
          timeElement.classList.add('bg-warning');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-primary');
          setTimeout(function() {
            const timeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true, };
            let newEndTime = new Date(data.endtime * 1000).toLocaleTimeString('en-GB', timeFormatOptions).toUpperCase();
            timeElement.innerHTML = newEndTime;
            extendModal.querySelector('#extend-duration').value = data.duration;
            document.querySelector('#until').querySelector('button:nth-child(3)').setAttribute('data-duration', data.duration);
            timeElement.classList.remove('bg-warning');
          }, 1000);
        }, 1000);
      }, 1000);
    } else {
      extendErrorsElement.innerHTML = '';
      for (let i = 0; i < data.errors.length; i++) {
        let newLiElement = document.createElement('li');
        let newTextNode = document.createTextNode(data.errors[i].msg);
        newLiElement.appendChild(newTextNode);
        extendErrorsElement.appendChild(newLiElement);
      }
      submitButton.disabled = false;
      submitButtonIcon.classList.remove('fa-pulse');
      submitButtonIcon.classList.remove('fa-spinner');
      submitButtonIcon.classList.add('fa-times');
      submitButton.classList.remove('btn-primary');
      submitButton.classList.add('btn-danger');
      setTimeout(function() {
        submitButtonIcon.classList.remove('fa-times');
        submitButtonIcon.classList.add('fa-check');
        submitButton.classList.remove('btn-danger');
        submitButton.classList.add('btn-primary');
      }, 1000);
    }
  });
});


// End modal
let endButton;
let endModal = document.getElementById('modal-end');
let endErrorsElement = document.querySelector('#end-errors');
endModal.addEventListener('show.bs.modal', function (event) {
  endErrorsElement.innerHTML = '';
  endButton = event.relatedTarget;
  endModal.querySelector('#end-id').value = endButton.getAttribute('data-id');
  endModal.querySelector('#end-roomid').value = endButton.getAttribute('data-roomid');
  endModal.querySelector('#end-datetime').value = endButton.getAttribute('data-datetime');
  endModal.querySelector('#end-duration').value = endButton.getAttribute('data-duration');
});
document.querySelector('#end-form').addEventListener('submit', function(event) {
  event.preventDefault();
  let submitButton = document.querySelector('#modal-end .btn-danger');
  let submitButtonIcon = document.querySelector('#modal-end .btn-danger > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-check');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#end-form')));
  fetch('/meetings/end', {
    method: 'POST',
    body: data,
  })
  .then(response => response.json())
  .then(function(data) {
    if (data.status === 'success') {
      setTimeout(function() {
        submitButton.disabled = false;
        submitButtonIcon.classList.remove('fa-pulse');
        submitButtonIcon.classList.remove('fa-spinner');
        submitButtonIcon.classList.add('fa-check');
        submitButton.classList.remove('btn-danger');
        submitButton.classList.add('btn-success');
        setTimeout(function() {
          let modal = bootstrap.Modal.getInstance(endModal);
          modal.hide();
          let timeElement = document.querySelector("#until > span");
          timeElement.classList.add('fade-transition');
          timeElement.classList.add('bg-warning');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-danger');
          setTimeout(function() {
            const timeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true, };
            let newEndTime = new Date(data.endtime * 1000).toLocaleTimeString('en-GB', timeFormatOptions).toUpperCase();
            timeElement.innerHTML = newEndTime;
            endModal.querySelector('#end-duration').value = data.duration;
            document.querySelector('#until').querySelector('button:nth-child(3)').setAttribute('data-duration', data.duration);
            timeElement.classList.remove('bg-warning');
            window.location.reload();
          }, 1000);
        }, 1000);
      }, 1000);
    } else {
      endErrorsElement.innerHTML = '';
      for (let i = 0; i < data.errors.length; i++) {
        let newLiElement = document.createElement('li');
        let newTextNode = document.createTextNode(data.errors[i].msg);
        newLiElement.appendChild(newTextNode);
        endErrorsElement.appendChild(newLiElement);
      }
      submitButton.disabled = false;
      submitButtonIcon.classList.remove('fa-pulse');
      submitButtonIcon.classList.remove('fa-spinner');
      submitButtonIcon.classList.add('fa-times');
      submitButton.classList.remove('btn-danger');
      submitButton.classList.add('btn-danger');
      setTimeout(function() {
        submitButtonIcon.classList.remove('fa-times');
        submitButtonIcon.classList.add('fa-check');
        submitButton.classList.remove('btn-danger');
        submitButton.classList.add('btn-danger');
      }, 1000);
    }
  });
});


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
  datetimeElement = document.querySelectorAll('.card')[i].querySelector('span:nth-child(1)');
  timeStamp = datetimeElement.getAttribute('data-timestamp');
  datetimeElement.innerText = getRelativeTime(+new Date(timeStamp * 1000));
}
