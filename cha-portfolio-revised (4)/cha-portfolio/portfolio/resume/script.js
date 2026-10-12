(() => {
  const portrait = document.querySelector('.resume-photo');
  if (portrait) {
    portrait.loading = 'eager';
    portrait.decoding = 'async';
  }
})();
