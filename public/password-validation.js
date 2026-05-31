(function () {
  'use strict';
  window.validatePassword = function (pw) {
    if (pw.length < 16) return 'Wachtwoord moet minimaal 16 tekens bevatten';
    if (pw.length > 128) return 'Wachtwoord mag maximaal 128 tekens bevatten';
    if (!/[A-Z]/.test(pw)) return 'Wachtwoord moet minimaal één hoofdletter bevatten';
    if (!/[a-z]/.test(pw)) return 'Wachtwoord moet minimaal één kleine letter bevatten';
    if (!/[0-9]/.test(pw)) return 'Wachtwoord moet minimaal één cijfer bevatten';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Wachtwoord moet minimaal één speciaal teken bevatten (bijv. !@#$%^&*)';
    return null;
  };
})();
