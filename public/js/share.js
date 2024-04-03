window.addEventListener('load', () => {
  const parsedUrl = new URL(window.location);
  const { searchParams } = parsedUrl;
  const title = searchParams.get('title');
  const text = searchParams.get('text');
  const url = searchParams.get('url');
  if (title || text || url) {
    let meetingName = '';
    let meetingDateTime = '';
    let meetingService = '';
    let meetingUrl = '';
    let meetingRemarks = '';
    if (text.match('click this link: https://meet.google.com/')) {
      meetingName = 'Meeting with ' + title.substring(15, title.indexOf('is inviting') - 1);
      meetingService = 'google_meet';
      meetingUrl = text.substring(text.indexOf('https://'), text.indexOf(' ', text.indexOf('https://')));
      meetingRemarks = text;
    } else if (text.match('Video call link: https://meet.google.com/')) {
      meetingName = title;
      meetingDateTime = new Date(text.substring(0, text.indexOf('–') - 1).replaceAll(' • ', new Date().getFullYear()) + text.substring(text.indexOf('–') + 7, text.indexOf('–') + 10)).getTime() / 1000;
      let timezoneOffset = new Date().getTimezoneOffset().toString();
      let offsetSign;
      if (timezoneOffset.charAt(0) === '-') {
        timezoneOffset = timezoneOffset.slice(1, 4);
        offsetSign = '+';
      }
      if (offsetSign === '+') {
        meetingDateTime = parseFloat(meetingDateTime) + (timezoneOffset * 60);
      } else {
        meetingDateTime = parseFloat(meetingDateTime) - (timezoneOffset * 60);
      }
      meetingDateTime = new Date(meetingDateTime * 1000).toISOString().slice(0, -8);
      meetingService = 'google_meet';
      meetingUrl = text.substring(text.indexOf('https://'));
      meetingRemarks = text.substring(text.indexOf('Google Meet'));
    }
    document.querySelector('#description').value = meetingName;
    document.querySelector('#datetime').value = meetingDateTime;
    document.querySelector('#service').value = meetingService;
    document.querySelector('#link').value = meetingUrl;
    document.querySelector('#remarks').value = meetingRemarks;
  }
});
