document.addEventListener("DOMContentLoaded", function () {
  const wrapperForArrows = document.querySelector(".wrapper-for-arrows");
  const reviewWraps = document.querySelectorAll(".review-wrap");
  const leftArrow = document.getElementById("leftArrow");
  const rightArrow = document.getElementById("rightArrow");
  let currentReviewIndex = 0;
  let autoSlideInterval;

  const autoScroll = wrapperForArrows.dataset.autoScroll === "true";

  const updateReviewDisplay = () => {
    reviewWraps.forEach((wrap, index) => {
      wrap.style.display = index === currentReviewIndex ? "flex" : "none";
    });
  };

  const showNextReview = () => {
    currentReviewIndex = (currentReviewIndex + 1) % reviewWraps.length;
    updateReviewDisplay();
  };

  const showPreviousReview = () => {
    currentReviewIndex =
      (currentReviewIndex - 1 + reviewWraps.length) % reviewWraps.length;
    updateReviewDisplay();
  };

  const startAutoSlide = () => {
    if (autoScroll) {
      autoSlideInterval = setInterval(showNextReview, 3000);
    }
  };

  leftArrow.addEventListener("click", () => {
    showPreviousReview();
    clearInterval(autoSlideInterval);
    startAutoSlide();
  });

  rightArrow.addEventListener("click", () => {
    showNextReview();
    clearInterval(autoSlideInterval);
    startAutoSlide();
  });

  updateReviewDisplay(currentReviewIndex);
  startAutoSlide();
});
