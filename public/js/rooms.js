/* global bootstrap */

// Edit Modal
let editButton;
let editModal = document.getElementById('modal-edit');
let editErrorsElement = document.querySelector('#edit-errors');
editModal.addEventListener('show.bs.modal', (event) => {
  editErrorsElement.innerHTML = '';
  editButton = event.relatedTarget;
  let editRow = editButton.parentElement.parentElement.parentElement;
  let roomOos = editRow.childNodes[4].innerText;
  if (roomOos === 'Active') {
    roomOos = 0;
  } else {
    roomOos = 1;
  }
  editModal.querySelector('#id').value = editButton.getAttribute('data-id');
  editModal.querySelector('#name').value = editRow.childNodes[0].innerText;
  editModal.querySelector('#location').value = editRow.childNodes[1].innerText;
  let facilitiesArr = editButton.getAttribute('data-facilities').trim().split(' ');
  let allCheckboxes = editModal.querySelectorAll('input[type=checkbox]');
  let i;
  for (i = 0; i < allCheckboxes.length; i++) {
    allCheckboxes[i].checked = false;
  }
  if (facilitiesArr[0] !== '') {
    for (i = 0; i < facilitiesArr.length; i++) {
      editModal.querySelector('#facility' + facilitiesArr[i]).checked = true;
    }
  }
  editModal.querySelector('#capacity').value = editRow.childNodes[3].innerText;
  editModal.querySelector('#oos').value = roomOos;
});
document.querySelector('#edit-form').addEventListener('submit', (event) => {
  event.preventDefault();
  let submitButton = document.querySelector('#modal-edit .btn-primary');
  let submitButtonIcon = document.querySelector('#modal-edit .btn-primary > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-save');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#edit-form')));
  fetch('/rooms/edit', {
    method: 'POST',
    body: data,
  })
  .then(response => response.json())
  .then((data) => {
    if (data.status === 'success') {
      setTimeout(() => {
        submitButton.disabled = false;
        submitButtonIcon.classList.remove('fa-pulse');
        submitButtonIcon.classList.remove('fa-spinner');
        submitButtonIcon.classList.add('fa-check');
        submitButton.classList.remove('btn-primary');
        submitButton.classList.add('btn-success');
        let updatedRow = editButton.parentElement.parentElement.parentElement;
        updatedRow.childNodes[0].innerText = data.name;
        updatedRow.childNodes[1].innerText = data.location;
        let cellElement = updatedRow.childNodes[2];
        cellElement.innerHTML = '';
        let facilitiesArr = data.facilities.trim().split(' ');
        editButton.setAttribute('data-facilities', data.facilities);
        for (let i = 0; i < facilitiesArr.length; i++) {
          let spanElement = document.createElement('span');
          let spacerElement = document.createElement('span');
          spanElement.appendChild(document.createTextNode(facilitiesArr[i]));
          spacerElement.appendChild(document.createTextNode(' '));
          spanElement.classList.add('badge', 'bg-success');
          cellElement.appendChild(spanElement);
          cellElement.appendChild(spacerElement);
        }
        updatedRow.childNodes[3].innerText = data.capacity;
        let roomOos = data.oos;
        if (roomOos === '0') {
          roomOos = 'Active';
        } else {
          roomOos = 'Out-of-Order';
        }
        updatedRow.childNodes[4].innerText = roomOos;
        setTimeout(() => {
          let modal = bootstrap.Modal.getInstance(editModal);
          modal.hide();
          updatedRow.classList.add('fade-transition');
          updatedRow.classList.add('bg-warning');
          submitButtonIcon.classList.remove('fa-check');
          submitButtonIcon.classList.add('fa-save');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-primary');
          setTimeout(() => {
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
      setTimeout(() => {
        submitButtonIcon.classList.remove('fa-times');
        submitButtonIcon.classList.add('fa-save');
        submitButton.classList.remove('btn-danger');
        submitButton.classList.add('btn-primary');
      }, 1000);
    }
  });
});


// Delete Modal
let deleteButton;
let deleteModal = document.getElementById('modal-delete');
let deleteErrorsElement = document.querySelector('#delete-errors');
deleteModal.addEventListener('show.bs.modal', (event) => {
  deleteErrorsElement.innerHTML = '';
  deleteButton = event.relatedTarget;
  deleteModal.querySelector('#room-name-in-modal').innerHTML = deleteButton.getAttribute('data-name');
  deleteModal.querySelector('#delete-id').value = deleteButton.getAttribute('data-id');
});
document.querySelector('#delete-form').addEventListener('submit', (event) => {
  event.preventDefault();
  let submitButton = document.querySelector('#modal-delete .btn-primary');
  let submitButtonIcon = document.querySelector('#modal-delete .btn-primary > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-check');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#delete-form')));
  fetch('/rooms/delete', {
    method: 'POST',
    body: data,
  })
  .then(response => response.json())
  .then((data) => {
    if (data.status === 'success') {
      setTimeout(() => {
        submitButton.disabled = false;
        submitButtonIcon.classList.remove('fa-pulse');
        submitButtonIcon.classList.remove('fa-spinner');
        submitButtonIcon.classList.add('fa-check');
        submitButton.classList.remove('btn-primary');
        submitButton.classList.add('btn-success');
        setTimeout(() => {
          let modal = bootstrap.Modal.getInstance(deleteModal);
          modal.hide();
          let deletedRow = deleteButton.parentElement.parentElement.parentElement;
          deletedRow.classList.add('fade-transition');
          deletedRow.classList.add('bg-danger');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-primary');
          setTimeout(() => {
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
      submitButton.classList.remove('btn-primary');
      submitButton.classList.add('btn-danger');
      setTimeout(() => {
        submitButtonIcon.classList.remove('fa-times');
        submitButtonIcon.classList.add('fa-check');
        submitButton.classList.remove('btn-danger');
        submitButton.classList.add('btn-primary');
      }, 1000);
    }
  });
});
