/* global Chart, serviceList, countByService, roomList, countByRoom, weekdayList, countByWeekday, countByDayOfMonth */

const chartMeetingsByType = document.getElementById('chart-meetings-by-type');
const chartMeetingsByRoom = document.getElementById('chart-meetings-by-room');
const chartMeetingsByWeekday = document.getElementById('chart-meetings-by-weekday');
const chartMeetingsByDayOfMonth = document.getElementById('chart-meetings-by-dayofmonth');

new Chart(chartMeetingsByType, {
  type: 'pie',
  data: {
    labels: serviceList,
    datasets: [{
      label: 'Meetings',
      data: countByService,
    }]
  },
  options: {
    plugins: {
      title: {
        display: true,
        text: 'Meetings by Type'
      },
    },
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
  options: {
    plugins: {
      title: {
        display: true,
        text: 'Meetings by Room'
      },
    },
  },
});

new Chart(chartMeetingsByWeekday, {
  type: 'bar',
  data: {
    labels: weekdayList,
    datasets: [{
      label: 'Meetings',
      data: countByWeekday,
    }]
  },
  options: {
    plugins: {
      title: {
        display: true,
        text: 'Meetings by Weekday'
      },
    },
    maintainAspectRatio: false,
  },
});

new Chart(chartMeetingsByDayOfMonth, {
  type: 'bar',
  data: {
    datasets: [{
      label: 'Meetings',
      data: countByDayOfMonth,
    }]
  },
  options: {
    plugins: {
      title: {
        display: true,
        text: 'Meetings by Day of Month'
      },
    },
    maintainAspectRatio: false,
  },
});
