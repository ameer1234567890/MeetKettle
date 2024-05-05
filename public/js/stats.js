/* global Chart, serviceList, countByService, roomList, countByRoom */

const chartMeetingsByType = document.getElementById('chart-meetings-by-type');
const chartMeetingsByRoom = document.getElementById('chart-meetings-by-room');

new Chart(chartMeetingsByType, {
  type: 'pie',
  data: {
    labels: serviceList,
    datasets: [{
      label: 'Meetings',
      data: countByService,
    }]
  },
});

new Chart(chartMeetingsByRoom, {
  type: 'pie',
  data: {
    labels: roomList,
    datasets: [{
      label: 'Meetings',
      data: countByRoom,
    }]
  },
});
