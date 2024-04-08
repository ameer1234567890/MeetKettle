// View modal
let viewButton;
let viewModal = document.getElementById('modal-view');
viewModal.addEventListener('show.bs.modal', function (event) {
  viewButton = event.relatedTarget;
  let viewCard = viewButton.parentElement.parentElement.parentElement;
  let duration = viewButton.getAttribute('data-duration')/60;
  if (duration < 60) { duration = duration + ' minutes'; } else { duration = duration/60 + ' hour(s)'; }
  let meetingRoom = viewButton.getAttribute('data-room');
  let timezoneOffset = new Date().getTimezoneOffset().toString();
  let offsetSign;
  if (timezoneOffset.charAt(0) === '-') {
    timezoneOffset = timezoneOffset.slice(1, 4);
    offsetSign = '+';
  }
  for (let i = 0; i < roomList.length; i++) {
    if (roomList[i].id === meetingRoom) {
      meetingRoom = roomList[i].name;
    }
  }
  let timeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true, }
  viewModal.querySelector('tr:nth-child(1) > td').innerText = new Date((viewButton.getAttribute('data-datetime')) * 1000).toLocaleString('en-GB', timeFormatOptions).toUpperCase();
  viewModal.querySelector('tr:nth-child(2) > td').innerText = duration;
  viewModal.querySelector('tr:nth-child(3) > td').innerText = viewCard.querySelector('h5').innerText;
  viewModal.querySelector('tr:nth-child(4) > td').innerText = meetingRoom;
  viewModal.querySelector('tr:nth-child(5) > td').innerText = viewButton.getAttribute('data-service').split('_').map( w =>  w.substring(0,1).toUpperCase()+ w.substring(1)).join(' ');
  viewModal.querySelector('tr:nth-child(6) > td').innerHTML = '<a href="' + viewButton.getAttribute('data-link') + '" rel="noopener" target="_blank">' + viewButton.getAttribute('data-link') + '</a>';
  viewModal.querySelector('tr:nth-child(7) > td').innerText = viewButton.getAttribute('data-remarks').replaceAll('&amp;', '&').replaceAll('&#x2F;', '/');
});


// Edit modal
let editButton;
let editModal = document.getElementById('modal-edit');
let editErrorsElement = document.querySelector('#edit-errors');
editModal.addEventListener('show.bs.modal', function (event) {
  editErrorsElement.innerHTML = '';
  editButton = event.relatedTarget;
  let editCard = editButton.parentElement.parentElement.parentElement;
  let meetingDateTime = editButton.getAttribute('data-datetime');
  editModal.querySelector('#id').value = editButton.getAttribute('data-id');
  let timezoneOffset = new Date().getTimezoneOffset().toString();
  let offsetSign;
  if (timezoneOffset.charAt(0) === '-') {
    timezoneOffset = timezoneOffset.slice(1, 4);
    offsetSign = '+';
  }
  if (offsetSign === '+') {
    meetingDateTime = parseFloat(meetingDateTime) + (timezoneOffset * 60);
  } else {
    meetingDateTime = parseFloat(meetingDateTime) - (timezoneOffset * 60);
  }
  meetingDateTime = new Date((meetingDateTime) * 1000).toISOString().slice(0, -8);
  editModal.querySelector('#datetime').value = meetingDateTime;
  editModal.querySelector('#duration').value = editButton.getAttribute('data-duration');
  editModal.querySelector('#description').value = editCard.querySelector('h5').innerText;
  editModal.querySelector('#room').value = editButton.getAttribute('data-room');
  editModal.querySelector('#remarks').value = editButton.getAttribute('data-remarks').replaceAll('&amp;', '&').replaceAll('&#x2F;', '/');
  editModal.querySelector('#service').value = editButton.getAttribute('data-service');
  editModal.querySelector('#link').value = editButton.getAttribute('data-link');
});
document.querySelector('#edit-form').addEventListener('submit', function(event) {
  event.preventDefault();
  let submitButton = document.querySelector('#modal-edit .btn-primary');
  let submitButtonIcon = document.querySelector('#modal-edit .btn-primary > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-save');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#edit-form')));
  fetch('/meetings/edit', {
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
        let updatedCard = editButton.parentElement.parentElement.parentElement;
        let viewButton = editButton.previousSibling;
        let deleteButton = editButton.nextSibling;
        updatedCard.querySelector('span:nth-child(1)').innerText = getRelativeTime(+new Date(data.datetime * 1000));
        let timeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true, };
        updatedCard.querySelector('span:nth-child(1)').setAttribute('data-bs-original-title', new Date(data.datetime * 1000).toLocaleString('en-GB', timeFormatOptions).toUpperCase());
        viewButton.setAttribute('data-datetime', data.datetime);
        editButton.setAttribute('data-datetime', data.datetime);
        viewButton.setAttribute('data-duration', data.duration*60);
        editButton.setAttribute('data-duration', data.duration);
        updatedCard.querySelector('h5').innerText = data.description;
        viewButton.setAttribute('data-description', data.description);
        editButton.setAttribute('data-description', data.description);
        deleteButton.setAttribute('data-description', data.description);
        for (let i = 0; i < roomList.length; i++) {
          if (roomList[i].id === data.room) {
            updatedCard.querySelector('span:nth-child(2)').innerText = roomList[i].name;
          }
        }
        viewButton.setAttribute('data-room', data.room);
        editButton.setAttribute('data-room', data.room);
        updatedCard.querySelector('img').src = '/public/images/' + data.service + '.svg';
        viewButton.setAttribute('data-service', data.service);
        editButton.setAttribute('data-service', data.service);
        viewButton.setAttribute('data-remarks', data.remarks);
        editButton.setAttribute('data-remarks', data.remarks);
        viewButton.setAttribute('data-link', data.link);
        editButton.setAttribute('data-link', data.link);
        setTimeout(function() {
          let modal = bootstrap.Modal.getInstance(editModal);
          modal.hide();
          updatedCard.classList.add('fade-transition');
          updatedCard.classList.add('bg-warning');
          submitButtonIcon.classList.remove('fa-check');
          submitButtonIcon.classList.add('fa-save');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-primary');
          setTimeout(function() {
            updatedCard.classList.remove('bg-warning');
          }, 1000);
        }, 1000);
      }, 1000);
    } else {
      editErrorsElement.innerHTML = '';
      for (let i = 0; i < data.errors.length; i++) {
        let newLiElement = document.createElement('li');
        let newTextNode = document.createTextNode(data.errors[i].msg);
        newLiElement.appendChild(newTextNode);
        editErrorsElement.appendChild(newLiElement);
      }
      submitButton.disabled = false;
      submitButtonIcon.classList.remove('fa-pulse');
      submitButtonIcon.classList.remove('fa-spinner');
      submitButtonIcon.classList.add('fa-times');
      submitButton.classList.remove('btn-primary');
      submitButton.classList.add('btn-danger');
      setTimeout(function() {
        submitButtonIcon.classList.remove('fa-times');
        submitButtonIcon.classList.add('fa-save');
        submitButton.classList.remove('btn-danger');
        submitButton.classList.add('btn-primary');
      }, 1000);
    }
  });
});


// Delete modal
let deleteButton;
let deleteModal = document.getElementById('modal-delete');
let deleteErrorsElement = document.querySelector('#delete-errors');
deleteModal.addEventListener('show.bs.modal', function (event) {
  deleteErrorsElement.innerHTML = '';
  deleteButton = event.relatedTarget;
  deleteModal.querySelector('#meeting-desc-in-modal').innerHTML = deleteButton.getAttribute('data-description');
  deleteModal.querySelector('#delete-id').value = deleteButton.getAttribute('data-id');
});
document.querySelector('#delete-form').addEventListener('submit', function(event) {
  event.preventDefault();
  let submitButton = document.querySelector('#modal-delete .btn-danger');
  let submitButtonIcon = document.querySelector('#modal-delete .btn-danger > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-check');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#delete-form')));
  fetch('/meetings/delete', {
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
          let modal = bootstrap.Modal.getInstance(deleteModal);
          modal.hide();
          let updatedCard = deleteButton.parentElement.parentElement.parentElement;
          updatedCard.classList.add('fade-transition');
          updatedCard.classList.add('bg-danger');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-danger');
          setTimeout(function() {
            updatedCard.remove();
          }, 1000);
        }, 1000);
      }, 1000);
    } else {
      deleteErrorsElement.innerHTML = '';
      for (let i = 0; i < data.errors.length; i++) {
        let newLiElement = document.createElement('li');
        let newTextNode = document.createTextNode(data.errors[i].msg);
        newLiElement.appendChild(newTextNode);
        deleteErrorsElement.appendChild(newLiElement);
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
  datetimeElement = document.querySelectorAll('.card')[i].querySelector("span:nth-child(1)");
  timeStamp = datetimeElement.getAttribute('data-timestamp');
  datetimeElement.innerText = getRelativeTime(+new Date(timeStamp * 1000));
}


// Change background color for home page only (hack)
document.body.style.background = '#ebeff2';
