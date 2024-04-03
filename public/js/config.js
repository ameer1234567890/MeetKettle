// Set recordsPerPage form
document.querySelector('#set-rpp-form').addEventListener('submit', function(event) {
  let errorsElement = document.querySelector('#rpp-errors');
  errorsElement.innerHTML = '';
  event.preventDefault();
  let submitButton = document.querySelector('#set-rpp-form .btn-primary');
  let submitButtonIcon = document.querySelector('#set-rpp-form .btn-primary > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-save');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#set-rpp-form')));
  fetch('/admin/rpp/set', {
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
          submitButtonIcon.classList.remove('fa-check');
          submitButtonIcon.classList.add('fa-save');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-primary');
        }, 1000);
      }, 1000);
    } else {
      errorsElement.innerHTML = '';
      for (let i = 0; i < data.errors.length; i++) {
        let newLiElement = document.createElement('li');
        let newTextNode = document.createTextNode(data.errors[i].msg);
        newLiElement.appendChild(newTextNode);
        errorsElement.appendChild(newLiElement);
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


// Add facility form
document.querySelector('#add-facility-form').addEventListener('submit', function(event) {
  let errorsElement = document.querySelector('#facilities-errors');
  errorsElement.innerHTML = '';
  event.preventDefault();
  let submitButton = document.querySelector('#add-facility-form .btn-primary');
  let submitButtonIcon = document.querySelector('#add-facility-form .btn-primary > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-plus');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#add-facility-form')));
  fetch('/admin/facilities/add', {
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
        let facilityListGroup = document.querySelector('#facility-list');
        let itemElement = document.createElement('div');
        itemElement.classList.add('list-group-item', 'list-group-item-action');
        let textNode = document.createTextNode(data.facility.split('_').map( w =>  w.substring(0,1).toUpperCase()+ w.substring(1)).join(' '));
        let newButtonElement = document.createElement('button');
        newButtonElement.classList.add('float-end', 'btn-close');
        newButtonElement.setAttribute('data-bs-toggle', 'modal');
        newButtonElement.setAttribute('data-bs-target', '#modal-facility-delete');
        newButtonElement.setAttribute('data-facility', data.facility);
        itemElement.appendChild(textNode);
        itemElement.appendChild(newButtonElement);
        facilityListGroup.insertBefore(itemElement, facilityListGroup.childNodes[facilityListGroup.children.length - 1]);
        document.querySelector('#add-facility-form input').value = '';
        setTimeout(function() {
          submitButtonIcon.classList.remove('fa-check');
          submitButtonIcon.classList.add('fa-plus');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-primary');
        }, 1000);
      }, 1000);
    } else {
      errorsElement.innerHTML = '';
      for (let i = 0; i < data.errors.length; i++) {
        let newLiElement = document.createElement('li');
        let newTextNode = document.createTextNode(data.errors[i].msg);
        newLiElement.appendChild(newTextNode);
        errorsElement.appendChild(newLiElement);
      }
      submitButton.disabled = false;
      submitButtonIcon.classList.remove('fa-pulse');
      submitButtonIcon.classList.remove('fa-spinner');
      submitButtonIcon.classList.add('fa-times');
      submitButton.classList.remove('btn-primary');
      submitButton.classList.add('btn-danger');
      setTimeout(function() {
        submitButtonIcon.classList.remove('fa-times');
        submitButtonIcon.classList.add('fa-plus');
        submitButton.classList.remove('btn-danger');
        submitButton.classList.add('btn-primary');
      }, 1000);
    }
  });
});


// Delete facility modal
let deleteFacilityButton;
let deleteFacilityModal = document.getElementById('modal-facility-delete');
let deleteFacilityErrorsElement = document.querySelector('#delete-facility-errors');
deleteFacilityModal.addEventListener('show.bs.modal', function (event) {
  deleteFacilityErrorsElement.innerHTML = '';
  deleteFacilityButton = event.relatedTarget;
  deleteFacilityModal.querySelector('#facility-in-modal').innerHTML = deleteFacilityButton.getAttribute('data-facility').split('_').map( w =>  w.substring(0,1).toUpperCase()+ w.substring(1)).join(' ');
  deleteFacilityModal.querySelector('#delete-facility').value = deleteFacilityButton.getAttribute('data-facility');
});
document.querySelector('#delete-facility-form').addEventListener('submit', function(event) {
  event.preventDefault();
  let submitButton = document.querySelector('#modal-facility-delete .btn-primary');
  let submitButtonIcon = document.querySelector('#modal-facility-delete .btn-primary > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-check');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#delete-facility-form')));
  fetch('/admin/facilities/delete', {
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
          let modal = bootstrap.Modal.getInstance(deleteFacilityModal);
          modal.hide();
          let deletedRow = deleteFacilityButton.parentElement;
          deletedRow.classList.add('fade-transition');
          deletedRow.classList.add('bg-danger');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-primary');
          setTimeout(function() {
            deletedRow.remove();
          }, 1000);
        }, 1000);
      }, 1000);
    } else {
      deleteFacilityErrorsElement.innerHTML = '';
      for (let i = 0; i < data.errors.length; i++) {
        let newLiElement = document.createElement('li');
        let newTextNode = document.createTextNode(data.errors[i].msg);
        newLiElement.appendChild(newTextNode);
        deleteFacilityErrorsElement.appendChild(newLiElement);
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


// Add service form
document.querySelector('#add-service-form').addEventListener('submit', function(event) {
  let errorsElement = document.querySelector('#services-errors');
  errorsElement.innerHTML = '';
  event.preventDefault();
  let submitButton = document.querySelector('#add-service-form .btn-primary');
  let submitButtonIcon = document.querySelector('#add-service-form .btn-primary > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-plus');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#add-service-form')));
  fetch('/admin/services/add', {
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
        let serviceListGroup = document.querySelector('#service-list');
        let itemElement = document.createElement('div');
        itemElement.classList.add('list-group-item', 'list-group-item-action');
        let textNode = document.createTextNode(data.service.split('_').map( w =>  w.substring(0,1).toUpperCase()+ w.substring(1)).join(' '));
        let newButtonElement = document.createElement('button');
        newButtonElement.classList.add('float-end', 'btn-close');
        newButtonElement.setAttribute('data-bs-toggle', 'modal');
        newButtonElement.setAttribute('data-bs-target', '#modal-service-delete');
        newButtonElement.setAttribute('data-service', data.service);
        itemElement.appendChild(textNode);
        itemElement.appendChild(newButtonElement);
        serviceListGroup.insertBefore(itemElement, serviceListGroup.childNodes[serviceListGroup.children.length - 1]);
        document.querySelector('#add-service-form input').value = '';
        setTimeout(function() {
          submitButtonIcon.classList.remove('fa-check');
          submitButtonIcon.classList.add('fa-plus');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-primary');
        }, 1000);
      }, 1000);
    } else {
      errorsElement.innerHTML = '';
      for (let i = 0; i < data.errors.length; i++) {
        let newLiElement = document.createElement('li');
        let newTextNode = document.createTextNode(data.errors[i].msg);
        newLiElement.appendChild(newTextNode);
        errorsElement.appendChild(newLiElement);
      }
      submitButton.disabled = false;
      submitButtonIcon.classList.remove('fa-pulse');
      submitButtonIcon.classList.remove('fa-spinner');
      submitButtonIcon.classList.add('fa-times');
      submitButton.classList.remove('btn-primary');
      submitButton.classList.add('btn-danger');
      setTimeout(function() {
        submitButtonIcon.classList.remove('fa-times');
        submitButtonIcon.classList.add('fa-plus');
        submitButton.classList.remove('btn-danger');
        submitButton.classList.add('btn-primary');
      }, 1000);
    }
  });
});


// Delete service modal
let deleteServiceButton;
let deleteServiceModal = document.getElementById('modal-service-delete');
let deleteServiceErrorsElement = document.querySelector('#delete-service-errors');
deleteServiceModal.addEventListener('show.bs.modal', function (event) {
  deleteServiceErrorsElement.innerHTML = '';
  deleteServiceButton = event.relatedTarget;
  deleteServiceModal.querySelector('#service-in-modal').innerHTML = deleteServiceButton.getAttribute('data-service').split('_').map( w =>  w.substring(0,1).toUpperCase()+ w.substring(1)).join(' ');
  deleteServiceModal.querySelector('#delete-service').value = deleteServiceButton.getAttribute('data-service');
});
document.querySelector('#delete-service-form').addEventListener('submit', function(event) {
  event.preventDefault();
  let submitButton = document.querySelector('#modal-service-delete .btn-primary');
  let submitButtonIcon = document.querySelector('#modal-service-delete .btn-primary > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-check');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  let data = new URLSearchParams(new FormData(document.querySelector('#delete-service-form')));
  fetch('/admin/services/delete', {
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
          let modal = bootstrap.Modal.getInstance(deleteServiceModal);
          modal.hide();
          let deletedRow = deleteServiceButton.parentElement;
          deletedRow.classList.add('fade-transition');
          deletedRow.classList.add('bg-danger');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-primary');
          setTimeout(function() {
            deletedRow.remove();
          }, 1000);
        }, 1000);
      }, 1000);
    } else {
      deleteServiceErrorsElement.innerHTML = '';
      for (let i = 0; i < data.errors.length; i++) {
        let newLiElement = document.createElement('li');
        let newTextNode = document.createTextNode(data.errors[i].msg);
        newLiElement.appendChild(newTextNode);
        deleteServiceErrorsElement.appendChild(newLiElement);
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
