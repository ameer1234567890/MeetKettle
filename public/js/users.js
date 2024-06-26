/* global bootstrap */

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#passwordBox a').addEventListener('click', (event) => {
    event.preventDefault();
    const inputElement = document.querySelector('#passwordBox input');
    const iconElement = document.querySelector('#passwordBox i');
    if (inputElement.getAttribute('type') == 'text') {
      inputElement.setAttribute('type', 'password');
      iconElement.classList.add( 'fa-eye-slash' );
      iconElement.classList.remove( 'fa-eye' );
    } else if (inputElement.getAttribute('type') == 'password') {
      inputElement.setAttribute('type', 'text');
      iconElement.classList.remove( 'fa-eye-slash' );
      iconElement.classList.add( 'fa-eye' );
    }
  });
  document.querySelector('#passwordBox2 a').addEventListener('click', (event) => {
    event.preventDefault();
    const inputElement = document.querySelector('#passwordBox2 input');
    const iconElement = document.querySelector('#passwordBox2 i');
    if (inputElement.getAttribute('type') == 'text') {
      inputElement.setAttribute('type', 'password');
      iconElement.classList.add( 'fa-eye-slash' );
      iconElement.classList.remove( 'fa-eye' );
    } else if (inputElement.getAttribute('type') == 'password') {
      inputElement.setAttribute('type', 'text');
      iconElement.classList.remove( 'fa-eye-slash' );
      iconElement.classList.add( 'fa-eye' );
    }
  });
});


// Reset Password Modal
let resetButton;
let resetModal = document.getElementById('modal-reset');
let resetErrorsElement = document.querySelector('#reset-errors');
resetModal.addEventListener('show.bs.modal', (event) => {
  resetErrorsElement.innerHTML = '';
  resetButton = event.relatedTarget;
  let resetRow = resetButton.parentElement.parentElement.parentElement;
  resetModal.querySelector('#reset-id').value = resetButton.getAttribute('data-id');
  resetModal.querySelector('#user-name-in-reset-modal').innerText = resetRow.childNodes[0].innerText;
});
document.querySelector('#reset-form').addEventListener('submit', (event) => {
  event.preventDefault();
  let submitButton = document.querySelector('#modal-reset .btn-primary');
  let submitButtonIcon = document.querySelector('#modal-reset .btn-primary > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-save');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#reset-form')));
  fetch('/admin/users/reset', {
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
        let updatedRow = resetButton.parentElement.parentElement.parentElement;
        updatedRow.childNodes[3].innerText = 'None';
        updatedRow.childNodes[3].classList.remove('bg-danger', 'text-white');
        setTimeout(() => {
          let modal = bootstrap.Modal.getInstance(resetModal);
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
      resetErrorsElement.innerHTML = '';
      for (let i = 0; i < data.errors.length; i++) {
        let newLiElement = document.createElement('li');
        let newTextNode = document.createTextNode(data.errors[i].msg);
        newLiElement.appendChild(newTextNode);
        resetErrorsElement.appendChild(newLiElement);
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


// Change Role Modal
let editButton;
let editModal = document.getElementById('modal-edit');
let editErrorsElement = document.querySelector('#edit-errors');
editModal.addEventListener('show.bs.modal', (event) => {
  editErrorsElement.innerHTML = '';
  editButton = event.relatedTarget;
  let editRow = editButton.parentElement.parentElement.parentElement;
  editModal.querySelector('#role').value = editRow.childNodes[1].innerText;
  editModal.querySelector('#edit-id').value = editButton.getAttribute('data-id');
  editModal.querySelector('#user-name-in-change-modal').innerText = editRow.childNodes[0].innerText;
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
  fetch('/admin/users/edit', {
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
        updatedRow.childNodes[1].innerText = data.role;
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


// Deactivate Modal
let deactivateButton;
let deactivateModal = document.getElementById('modal-deactivate');
let deactivateErrorsElement = document.querySelector('#deactivate-errors');
deactivateModal.addEventListener('show.bs.modal', (event) => {
  deactivateErrorsElement.innerHTML = '';
  deactivateButton = event.relatedTarget;
  let deactivateRow = deactivateButton.parentElement.parentElement.parentElement;
  deactivateModal.querySelector('#user-name-in-deactivate-modal').innerHTML = deactivateRow.childNodes[0].innerText;
  deactivateModal.querySelector('#deactivate-user').value = deactivateButton.getAttribute('data-id');
});
document.querySelector('#deactivate-form').addEventListener('submit', (event) => {
  event.preventDefault();
  let submitButton = document.querySelector('#modal-deactivate .btn-primary');
  let submitButtonIcon = document.querySelector('#modal-deactivate .btn-primary > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-check');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#deactivate-form')));
  fetch('/admin/users/deactivate', {
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
          let modal = bootstrap.Modal.getInstance(deactivateModal);
          modal.hide();
          let deactivatedRow = deactivateButton.parentElement.parentElement.parentElement;
          deactivatedRow.classList.add('fade-transition');
          deactivatedRow.classList.add('bg-danger');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-primary');
          setTimeout(() => {
            deactivatedRow.classList.remove('bg-danger');
            deactivatedRow.childNodes[2].classList.add('bg-secondary', 'text-white');
            deactivatedRow.childNodes[2].innerText = 'Inactive';
            bootstrap.Tooltip.getInstance(deactivatedRow.querySelector('.action-activate-deactivate')).hide();
            deactivatedRow.querySelector('.action-activate-deactivate').setAttribute('data-bs-original-title', 'Activate');
            deactivatedRow.querySelector('.action-activate-deactivate > a').setAttribute('data-bs-target', '#modal-activate');
            deactivatedRow.querySelector('.action-activate-deactivate > a > i').classList.remove('fa-lock');
            deactivatedRow.querySelector('.action-activate-deactivate > a > i').classList.add('fa-unlock');
          }, 1000);
        }, 1000);
      }, 1000);
    } else {
      deactivateErrorsElement.innerHTML = '';
      for (let i = 0; i < data.errors.length; i++) {
        let newLiElement = document.createElement('li');
        let newTextNode = document.createTextNode(data.errors[i].msg);
        newLiElement.appendChild(newTextNode);
        deactivateErrorsElement.appendChild(newLiElement);
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


// Activate Modal
let activateButton;
let activateModal = document.getElementById('modal-activate');
let activateErrorsElement = document.querySelector('#activate-errors');
activateModal.addEventListener('show.bs.modal', (event) => {
  activateErrorsElement.innerHTML = '';
  activateButton = event.relatedTarget;
  let activateRow = activateButton.parentElement.parentElement.parentElement;
  activateModal.querySelector('#user-name-in-activate-modal').innerHTML = activateRow.childNodes[0].innerText;
  activateModal.querySelector('#activate-user').value = activateButton.getAttribute('data-id');
});
document.querySelector('#activate-form').addEventListener('submit', (event) => {
  event.preventDefault();
  let submitButton = document.querySelector('#modal-activate .btn-primary');
  let submitButtonIcon = document.querySelector('#modal-activate .btn-primary > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-check');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#activate-form')));
  fetch('/admin/users/activate', {
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
          let modal = bootstrap.Modal.getInstance(activateModal);
          modal.hide();
          let activatedRow = activateButton.parentElement.parentElement.parentElement;
          activatedRow.classList.add('fade-transition');
          activatedRow.classList.add('bg-danger');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-primary');
          setTimeout(() => {
            activatedRow.classList.remove('bg-danger');
            activatedRow.childNodes[2].classList.remove('bg-secondary', 'text-white');
            activatedRow.childNodes[2].innerText = 'Active';
            bootstrap.Tooltip.getInstance(activatedRow.querySelector('.action-activate-deactivate')).hide();
            activatedRow.querySelector('.action-activate-deactivate').setAttribute('data-bs-original-title', 'Deactivate');
            activatedRow.querySelector('.action-activate-deactivate > a').setAttribute('data-bs-target', '#modal-deactivate');
            activatedRow.querySelector('.action-activate-deactivate > a > i').classList.remove('fa-unlock');
            activatedRow.querySelector('.action-activate-deactivate > a > i').classList.add('fa-lock');
          }, 1000);
        }, 1000);
      }, 1000);
    } else {
      activateErrorsElement.innerHTML = '';
      for (let i = 0; i < data.errors.length; i++) {
        let newLiElement = document.createElement('li');
        let newTextNode = document.createTextNode(data.errors[i].msg);
        newLiElement.appendChild(newTextNode);
        activateErrorsElement.appendChild(newLiElement);
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
