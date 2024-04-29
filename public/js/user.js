document.addEventListener('DOMContentLoaded', function() {
  document.querySelector('#passwordBox a').addEventListener('click', function(event) {
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
  document.querySelector('#passwordBox2 a').addEventListener('click', function(event) {
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
