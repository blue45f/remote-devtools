/**
 * 엘리먼트를 드래그 가능하게 만드는 함수
 */
export const makeDraggable = (element: HTMLElement) => {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialX = 0;
  let initialY = 0;

  const handleStart = (clientX: number, clientY: number) => {
    isDragging = true;
    const rect = element.getBoundingClientRect();
    initialX = rect.right;
    initialY = rect.bottom;
    startX = clientX - initialX;
    startY = clientY - initialY;
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    initialX = clientX - startX;
    initialY = clientY - startY;
    element.style.right = `${window.innerWidth - initialX}px`;
    element.style.bottom = `${window.innerHeight - initialY}px`;
  };

  const handleEnd = () => {
    isDragging = false;
  };

  // 터치 디바이스 감지
  const isTouchDevice =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (isTouchDevice) {
    // 터치 이벤트 핸들러
    const handleTouchStart = (e: TouchEvent) => {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    element.addEventListener("touchstart", handleTouchStart);
    element.addEventListener("touchmove", handleTouchMove);
    element.addEventListener("touchend", handleEnd);
  } else {
    // 마우스 이벤트 핸들러
    let initialClientX = 0;
    let initialClientY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      initialClientX = e.clientX;
      initialClientY = e.clientY;
      handleStart(e.clientX, e.clientY);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseEnd);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const threshold = 10;
      if (
        Math.abs(e.clientX - initialClientX) < threshold &&
        Math.abs(e.clientY - initialClientY) < threshold
      )
        return;
      handleMove(e.clientX, e.clientY);
      element
        .querySelectorAll("button")
        .forEach((button) => (button.style.pointerEvents = "none"));
    };

    const handleMouseEnd = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseEnd);
      element
        .querySelectorAll("button")
        .forEach((button) => (button.style.pointerEvents = ""));
      handleEnd();
    };

    element.addEventListener("mousedown", handleMouseDown);
  }
};
