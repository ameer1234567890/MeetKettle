// Set recordsPerPage form
document.querySelector('#dbupgrade').addEventListener('click', function(event) {
  let resultElement = document.querySelector('#result');
  resultElement.innerHTML = '';
  resultElement.classList.remove('text-danger');
  event.preventDefault();
  let submitButton = document.querySelector('#dbupgrade');
  let submitButtonIcon = document.querySelector('#dbupgrade > i');
  submitButton.disabled = true;
  submitButtonIcon.classList.remove('fa-database');
  submitButtonIcon.classList.add('fa-spinner');
  submitButtonIcon.classList.add('fa-pulse');
  fetch('/dbupgrade', {
      method: 'POST',
  })
  .then(response => response.json())
  .then(function(data) {
      if (data.status === 'success') {
      setTimeout(function() {
        //   submitButton.disabled = false;
          submitButtonIcon.classList.remove('fa-pulse');
          submitButtonIcon.classList.remove('fa-spinner');
          submitButtonIcon.classList.add('fa-check');
          submitButton.classList.remove('btn-primary');
          submitButton.classList.add('btn-success');
          setTimeout(function() {
          submitButtonIcon.classList.remove('fa-check');
          submitButtonIcon.classList.add('fa-database');
          submitButton.classList.remove('btn-success');
          submitButton.classList.add('btn-primary');
          resultElement.innerHTML = data.message;
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
      setTimeout(function() {
          submitButtonIcon.classList.remove('fa-times');
          submitButtonIcon.classList.add('fa-database');
          submitButton.classList.remove('btn-danger');
          submitButton.classList.add('btn-primary');
      }, 1000);
      }
  });
});
