document.addEventListener("DOMContentLoaded", function () {
  const widgets = document.querySelectorAll(".widget.masonry_scroll");

  widgets.forEach((widget) => {
    const container = widget.querySelector(".scroll-container");
    const content = widget.querySelector(".scroll-content");
    const scrollSpeed = parseInt(widget.dataset.scrollSpeed) || 50;
    const autoScroll = widget.dataset.autoScroll === "true";

    let scrollInterval;
    let isPaused = false;

    function setupScroll() {
      const containerHeight = container.offsetHeight;
      const contentHeight = content.offsetHeight;

      if (contentHeight <= containerHeight) {
        while (content.offsetHeight <= containerHeight * 2) {
          const clone = content.cloneNode(true);
          container.appendChild(clone);
        }
      } else {
        const clone = content.cloneNode(true);
        container.appendChild(clone);
      }
    }

    function scrollContent() {
      if (isPaused) return;

      const containerHeight = container.offsetHeight;
      const contentHeight = content.offsetHeight;
      const currentPosition = parseFloat(getComputedStyle(content).top) || 0;

      if (Math.abs(currentPosition) >= contentHeight / 2) {
        content.style.transition = "none";
        content.style.top = "0px";
        content.offsetHeight;
        content.style.transition = "top 0.5s linear";
      } else {
        content.style.top = `${currentPosition - 1}px`;
      }
    }

    function startScrolling() {
      if (autoScroll) {
        scrollInterval = setInterval(scrollContent, scrollSpeed);
      }
    }

    function stopScrolling() {
      clearInterval(scrollInterval);
    }

    container.addEventListener("mouseenter", () => {
      isPaused = true;
    });

    container.addEventListener("mouseleave", () => {
      isPaused = false;
    });

    setupScroll();
    startScrolling();
  });
});
