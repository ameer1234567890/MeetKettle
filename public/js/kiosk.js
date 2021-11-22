/* jshint esversion: 6 */
/* jshint browser: true */
/* jshint curly: true */
/* jshint trailingcomma: true */
/* jshint unused: true */
/* jshint undef: true */
/* jshint varstmt: true */
/* jshint eqeqeq: true */

let roomListItems = document.querySelectorAll('#room-list > li');
let item;
for (let i = 0; i < roomListItems.length; i++) {
  item = roomListItems[i];
  /*jshint -W083 */
  item.addEventListener('click', function() {
    window.location = '/kioskroom?room=' + item.getAttribute('data-id');
  });
  /*jshint +W083 */
}
