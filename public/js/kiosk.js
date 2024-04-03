let roomListItems = document.querySelectorAll('#room-list > a');
let item;
for (let i = 0; i < roomListItems.length; i++) {
  item = roomListItems[i];
  item.href = '/kioskroom?room=' + item.getAttribute('data-id');
}
