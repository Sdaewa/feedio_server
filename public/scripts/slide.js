// Carousel initialization function that will be exposed globally
function initCarousel() {
  const slides = document.querySelectorAll(".slide");
  const nextButton = document.querySelector(".btn-next");
  const prevButton = document.querySelector(".btn-prev");
  const autoScrollEnabled = document.querySelector(".carousel").dataset.autoscroll === "true";
  
  let curSlide = 0;
  const maxSlide = slides.length - 1;
  let autoScrollInterval;

  // Functions
  const goToSlide = (slide) => {
    slides.forEach((s, i) => {
      s.style.transform = `translateX(${100 * (i - slide)}%)`;
    });
  };

  const nextSlide = () => {
    curSlide = curSlide === maxSlide ? 0 : curSlide + 1;
    goToSlide(curSlide);
  };

  const prevSlide = () => {
    curSlide = curSlide === 0 ? maxSlide : curSlide - 1;
    goToSlide(curSlide);
  };

  const startAutoScroll = () => {
    if (autoScrollEnabled) {
      autoScrollInterval = setInterval(nextSlide, 3000);
    }
  };

  const stopAutoScroll = () => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
    }
  };

  // Initialize
  goToSlide(0);
  
  // Event listeners
  nextButton?.addEventListener("click", () => {
    stopAutoScroll();
    nextSlide();
    startAutoScroll();
  });

  prevButton?.addEventListener("click", () => {
    stopAutoScroll();
    prevSlide();
    startAutoScroll();
  });

  // Start auto-scroll if enabled
  startAutoScroll();
}

// Auto-initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initCarousel);

// Make initCarousel available globally
window.initCarousel = initCarousel;
