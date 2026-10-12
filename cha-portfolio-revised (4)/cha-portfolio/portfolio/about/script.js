(() => {
  // Replace each gallery image's src in about/index.html with your own image path.
  document.querySelectorAll('.photo-tile img, .about-feature-photo img, .origin-image').forEach((image) => {
    image.loading = 'lazy';
    image.decoding = 'async';
  });
})();
