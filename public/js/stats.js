/* global Chart */

const ctx = document.getElementById('chart-meetings-per-day');

new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    datasets: [{
      label: 'Meetings',
      data: [12, 19, 3, 5, 2, 3, 1],
      borderWidth: 1
    }]
  },
  options: {
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});
