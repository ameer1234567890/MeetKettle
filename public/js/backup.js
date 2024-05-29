// Set recordsPerPage form
document.querySelector('#dbbackup').addEventListener('click', (event) => {
  let resultElement = document.querySelector('#result');
  resultElement.innerHTML = '';
  resultElement.classList.remove('text-danger');
  event.preventDefault();
  let submitButton = document.querySelector('#dbbackup');
  let submitButtonIcon = document.querySelector('#dbbackup > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-database');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  fetch('/admin/backup', {
    method: 'POST',
  })
  .then(response => response.json())
  .then((data) => {
    resultElement.classList.remove('text-success');
    if (data.status === 'success') {
    setTimeout(() => {
      submitButton.disabled = false;
      submitButtonIcon.classList.remove('fa-pulse');
      submitButtonIcon.classList.remove('fa-spinner');
      submitButtonIcon.classList.add('fa-check');
      submitButton.classList.remove('btn-primary');
      submitButton.classList.add('btn-success');
      setTimeout(() => {
      submitButtonIcon.classList.remove('fa-check');
      submitButtonIcon.classList.add('fa-database');
      submitButton.classList.remove('btn-success');
      submitButton.classList.add('btn-primary');
      resultElement.innerHTML = data.message;
      resultElement.classList.add('text-success');
      }, 1000);
    }, 1000);
    } else {
    resultElement.innerHTML = '';
    resultElement.classList.add('text-danger');
    for (let i = 0; i < data.errors.length; i++) {
      let newLiElement = document.createElement('li');
      let newTextNode = document.createTextNode(data.errors[i].msg);
      newLiElement.appendChild(newTextNode);
      resultElement.appendChild(newLiElement);
    }
    submitButton.disabled = false;
    submitButtonIcon.classList.remove('fa-pulse');
    submitButtonIcon.classList.remove('fa-spinner');
    submitButtonIcon.classList.add('fa-times');
    submitButton.classList.remove('btn-primary');
    submitButton.classList.add('btn-danger');
    setTimeout(() => {
      submitButtonIcon.classList.remove('fa-times');
      submitButtonIcon.classList.add('fa-database');
      submitButton.classList.remove('btn-danger');
      submitButton.classList.add('btn-primary');
    }, 1000);
    }
  });
});
