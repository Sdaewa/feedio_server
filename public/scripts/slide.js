// Carousel initialization function that will be exposed globally
function initCarousel() {
  const carousel = document.querySelector('.widget.carousel');
  if (!carousel) return;

  const track = carousel.querySelector('.carousel-track');
  const slides = carousel.querySelectorAll('.carousel-slide');
  const prevButton = carousel.querySelector('.carousel-button.prev');
  const nextButton = carousel.querySelector('.carousel-button.next');
  const indicators = carousel.querySelectorAll('.indicator');
  const autoScrollEnabled = carousel.dataset.autoscroll === "true";

  let currentSlide = 0;
  const maxSlide = slides.length - 1;
  let autoScrollInterval;
  let touchStartX = 0;
  let touchEndX = 0;

  // Functions
  const updateSlidePosition = (index) => {
    // Update track position
    track.style.transform = `translateX(-${index * 100}%)`;
    
    // Update active states
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
      indicators[i]?.classList.toggle('active', i === index);
    });
  };

  const goToSlide = (index) => {
    currentSlide = index;
    updateSlidePosition(currentSlide);
  };

  const nextSlide = () => {
    currentSlide = currentSlide === maxSlide ? 0 : currentSlide + 1;
    goToSlide(currentSlide);
  };

  const prevSlide = () => {
    currentSlide = currentSlide === 0 ? maxSlide : currentSlide - 1;
    goToSlide(currentSlide);
  };

  const startAutoScroll = () => {
    if (autoScrollEnabled && !autoScrollInterval) {
      autoScrollInterval = setInterval(nextSlide, 5000);
    }
  };

  const stopAutoScroll = () => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  };

  // Event listeners
  prevButton?.addEventListener('click', () => {
    stopAutoScroll();
    prevSlide();
  });

  nextButton?.addEventListener('click', () => {
    stopAutoScroll();
    nextSlide();
  });

  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      stopAutoScroll();
      goToSlide(index);
    });
  });

  // Touch events for mobile swipe
  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    stopAutoScroll();
  }, { passive: true });

  carousel.addEventListener('touchmove', (e) => {
    touchEndX = e.touches[0].clientX;
  }, { passive: true });

  carousel.addEventListener('touchend', () => {
    const swipeDistance = touchEndX - touchStartX;
    const minSwipeDistance = 50;

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    }
  });

  // Pause auto-scroll when user hovers over the carousel
  carousel.addEventListener('mouseenter', stopAutoScroll);
  carousel.addEventListener('mouseleave', startAutoScroll);

  // Initialize
  goToSlide(0);
  startAutoScroll();
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initCarousel);

// Make initCarousel available globally
window.initCarousel = initCarousel;
