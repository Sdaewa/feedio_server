document.addEventListener("DOMContentLoaded", function () {
  const widgets = document.querySelectorAll(".widget.masonry_scroll");

  widgets.forEach((widget) => {
    const scrollContainer = widget.querySelector(".scroll-container");
    const scrollContent = widget.querySelector(".scroll-content");
    const reviewItems = scrollContent.querySelectorAll(".review-item");

    if (reviewItems.length <= 3) {
      return; // No need to scroll if there are 3 or fewer items
    }

    // Remove transform transition for smooth manual scrolling
    scrollContent.style.transition = "none";
    scrollContent.style.transform = "none";
  });
});
