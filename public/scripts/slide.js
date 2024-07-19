document.addEventListener("DOMContentLoaded", function () {
  const carousels = document.querySelectorAll(".widget.carousel");

  carousels.forEach((carousel) => {
    const container = carousel.querySelector(".scroll-container");
    const content = carousel.querySelector(".scroll-content");
    const items = content.querySelectorAll(".masonry-item");
    const prevBtn = carousel.querySelector(".left-arrow-wrap");
    const nextBtn = carousel.querySelector(".right-arrow-wrap");

    let currentIndex = 0;
    const itemCount = items.length;

    function goToSlide(index) {
      if (index < 0) {
        index = itemCount - 1;
      } else if (index >= itemCount) {
        index = 0;
      }
      currentIndex = index;
      const offset = -index * 100;
      content.style.transform = `translateX(${offset}%)`;
    }

    function nextSlide() {
      goToSlide(currentIndex + 1);
    }

    function prevSlide() {
      goToSlide(currentIndex - 1);
    }

    nextBtn.addEventListener("click", nextSlide);
    prevBtn.addEventListener("click", prevSlide);

    // Auto-scroll functionality
    const scrollSpeed = parseInt(carousel.dataset.scrollSpeed) || 5000; // Default to 5 seconds
    const autoScroll = carousel.dataset.autoScroll === "true";

    let autoScrollInterval;

    function startAutoScroll() {
      if (autoScroll) {
        autoScrollInterval = setInterval(nextSlide, scrollSpeed);
      }
    }

    function stopAutoScroll() {
      clearInterval(autoScrollInterval);
    }

    container.addEventListener("mouseenter", stopAutoScroll);
    container.addEventListener("mouseleave", startAutoScroll);

    startAutoScroll();
  });
});
