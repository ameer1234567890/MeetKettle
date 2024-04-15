// Edit modal
let editButton;
let editModal = document.getElementById('modal-edit');
let editErrorsElement = document.querySelector('#edit-errors');
editModal.addEventListener('show.bs.modal', function (event) {
  editErrorsElement.innerHTML = '';
  editButton = event.relatedTarget;
  let editRow = editButton.parentElement.parentElement.parentElement;
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
  editModal.querySelector('#datetime').value = new Date((meetingDateTime) * 1000).toISOString().slice(0, -8);
  editModal.querySelector('#duration').value = editButton.getAttribute('data-duration');
  editModal.querySelector('#repeat').value = editButton.getAttribute('data-repeat');
  editModal.querySelector('#description').value = editButton.getAttribute('data-description');
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
        let updatedRow = editButton.parentElement.parentElement.parentElement;
        let timeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true, };
        updatedRow.childNodes[0].innerText = new Date(data.datetime * 1000).toLocaleString('en-GB', timeFormatOptions).toUpperCase();
        editButton.setAttribute('data-datetime', data.datetime);
        let duration; if (data.duration < 60) { duration = data.duration + ' minutes'; } else { duration = data.duration/60 + ' hour(s)'; }
        updatedRow.childNodes[1].innerText = duration;
        editButton.setAttribute('data-duration', data.duration);
        updatedRow.childNodes[2].innerText = data.repeat.charAt(0).toUpperCase() + data.repeat.slice(1);
        editButton.setAttribute('data-repeat', data.repeat);
        updatedRow.childNodes[3].innerText = data.description;
        editButton.setAttribute('data-description', data.description);
        for (let i = 0; i < roomList.length; i++) {
          if (roomList[i].id === data.room) {
            updatedRow.childNodes[4].innerText = roomList[i].name;
          }
        }
        editButton.setAttribute('data-room', data.room);
        updatedRow.childNodes[5].innerHTML = '<img class="align-top me-2" src="/public/images/' + data.service + '.svg" width="25">' + data.service.split('_').map( w =>  w.substring(0,1).toUpperCase()+ w.substring(1)).join(' ');
        editButton.setAttribute('data-service', data.service);
        editButton.setAttribute('data-remarks', data.remarks);
        editButton.setAttribute('data-link', data.link);
        setTimeout(function() {
          let modal = bootstrap.Modal.getInstance(editModal);
          modal.hide();
          updatedRow.classList.add('fade-transition');
          updatedRow.classList.add('bg-warning');
          submitButtonIcon.classList.remove('fa-check');
          submitButtonIcon.classList.add('fa-save');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-primary');
          setTimeout(function() {
            updatedRow.classList.remove('bg-warning');
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
          let deletedRow = deleteButton.parentElement.parentElement.parentElement;
          deletedRow.classList.add('fade-transition');
          deletedRow.classList.add('bg-danger');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-danger');
          setTimeout(function() {
            deletedRow.remove();
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
