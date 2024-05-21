/*
  global Chart,
  serviceList,
  countByService,
  roomList,
  countByRoom,
  weekdayList,
  countByWeekday,
  countByDayOfMonth,
  durationByWeekday,
  durationByDayOfMonth,
  */

const chartMeetingsByType = document.getElementById('chart-meetings-by-type');
const chartMeetingsByRoom = document.getElementById('chart-meetings-by-room');
const chartMeetingsByWeekday = document.getElementById('chart-meetings-by-weekday');
const chartMeetingsByDayOfMonth = document.getElementById('chart-meetings-by-dayofmonth');
const chartDurationByWeekday = document.getElementById('chart-duration-by-weekday');
const chartDurationByDayOfMonth = document.getElementById('chart-duration-by-dayofmonth');

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

new Chart(chartDurationByWeekday, {
  type: 'bar',
  data: {
    labels: weekdayList,
    datasets: [{
      label: 'Duration',
      data: durationByWeekday,
    }]
  },
  options: {
    plugins: {
      title: {
        display: true,
        text: 'Duration by Weekday (in minutes)'
      },
    },
    maintainAspectRatio: false,
  },
});

new Chart(chartDurationByDayOfMonth, {
  type: 'bar',
  data: {
    datasets: [{
      label: 'Duration',
      data: durationByDayOfMonth,
    }]
  },
  options: {
    plugins: {
      title: {
        display: true,
        text: 'Duration by Day of Month (in minutes)'
      },
    },
    maintainAspectRatio: false,
  },
});
