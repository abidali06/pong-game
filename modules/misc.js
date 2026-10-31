export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };

    image.src = src;
  });
} // src is a string specifying the image's URL or path.

export function createKeyboardInput() {
  const keys = new Set();

  function onKeyDown(event) {
    keys.add(event.code);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  return {
    isDown(code) {
      return keys.has(code);
    },

    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      keys.clear();
    },
  };
} // returns keyboard object with isDown property (use like this: const keyboard = createKeyboardInput();  keyboard.isDown(keyW) // a boolean checking if the key w is pressed.), and a .destroy property for removing listeners.

export function createPointerInput(canvas) {
  const pointer = {
    x: 0,
    y: 0,
    down: false,
  };

  function updatePosition(event) {
    const rect = canvas.getBoundingClientRect();

    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
  }

  function onPointerDown(event) {
    updatePosition(event);
    pointer.down = true;
  }

  function onPointerMove(event) {
    updatePosition(event);
  }

  function onPointerUp() {
    pointer.down = false;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("blur", onPointerUp);

  return {
    pointer,

    destroy() {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("blur", onPointerUp);
    },
  };
} // returns pointer object with .x, and .y properties (coordinates), and .down property to check if pointer is down, and .destroy.
