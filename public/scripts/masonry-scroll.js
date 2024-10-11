document.addEventListener("DOMContentLoaded", function () {
  const widgets = document.querySelectorAll(".widget.masonry_scroll");

  widgets.forEach((widget) => {
    const scrollContainer = widget.querySelector(".scroll-container");
    const scrollContent = widget.querySelector(".scroll-content");
    const reviewItems = scrollContent.querySelectorAll(".review-item");

    if (reviewItems.length <= 3) {
      return; // No need to scroll if there are 3 or fewer items
    }

    const containerHeight = scrollContainer.offsetHeight;
    const contentHeight = scrollContent.offsetHeight;
    let currentScroll = 0;
    let isPaused = false;
    const scrollSpeed = 0.5; // Pixels to scroll per frame

    function autoScroll() {
      if (isPaused) {
        requestAnimationFrame(autoScroll);
        return;
      }

      currentScroll += scrollSpeed;
      if (currentScroll >= contentHeight) {
        currentScroll = 0;
        scrollContent.style.transition = "none";
        scrollContent.style.transform = "translateY(0)";
        // Force a reflow
        scrollContent.offsetHeight;
        scrollContent.style.transition = "transform 0.5s ease";
      } else {
        scrollContent.style.transform = `translateY(-${currentScroll}px)`;
      }

      requestAnimationFrame(autoScroll);
    }

    // Start auto-scrolling
    requestAnimationFrame(autoScroll);

    // Pause scrolling on hover
    scrollContainer.addEventListener("mouseenter", () => {
      isPaused = true;
    });

    // Resume scrolling when not hovering
    scrollContainer.addEventListener("mouseleave", () => {
      isPaused = false;
    });
  });
});
