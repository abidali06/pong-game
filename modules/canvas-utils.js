export function initCanvas(selector, options = {}) {
  const canvas = document.querySelector(selector);

  if (!canvas) {
    throw new Error(`Canvas not found: ${selector}`);
  }

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create 2D rendering context.");
  }

  const maxDpr = options.maxDpr ?? 2;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { width, height, dpr };
  }

  resize();

  return {
    canvas,
    ctx,
    resize,
    get width() {
      return canvas.clientWidth;
    },
    get height() {
      return canvas.clientHeight;
    },
  };
} // takes #id or .class of element as the argument. returns game object with ctx, width, and height.

export function observeCanvasResize(game) {
  const observer = new ResizeObserver(() => {
    game.resize();
  });

  observer.observe(game.canvas);

  return () => observer.disconnect();
} // detects change in canvas size and re calculates size.

export function clearCanvas(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
} // clears area of specified width and height starting at 0,0.

export function fillCanvas(ctx, width, height, color = "#fff") {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
} // same as above but for filling. can take color as argument or defaults to white.

export function drawCircle(ctx, x, y, radius, options = {}) {
  const {
    fill = "#000",
    stroke = null,
    lineWidth = 1,
    startAngle = 0,
    endAngle = Math.PI * 2,
  } = options;

  ctx.beginPath();
  ctx.arc(x, y, radius, startAngle, endAngle);

  if (fill !== null) {
    ctx.fillStyle = fill;
    ctx.fill();
  }

  if (stroke !== null) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
} // optional arguments include specification for fill color, stroke, lineWidth, startAngle, and endAngle. last two specifications are for partial circles.

export function drawRect(ctx, x, y, width, height, options = {}) {
  const { fill = "#000", stroke = null, lineWidth = 1 } = options;

  if (fill !== null) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
  }

  if (stroke !== null) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, width, height);
  }
} // optional: fill, stroke, lineWidth

export function drawLine(ctx, x1, y1, x2, y2, options = {}) {
  const { color = "#000", width = 1, cap = "butt" } = options;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = cap;
  ctx.stroke();
} // optional: color, width, cap. defaults to black, 1, and butt, respectively.

export function drawText(ctx, text, x, y, options = {}) {
  const {
    color = "#000",
    font = "16px sans-serif",
    align = "left",
    baseline = "alphabetic",
  } = options;

  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  ctx.fillText(text, x, y);
} // optional: color, font, align, baseline.

export function drawImage(
  ctx,
  image,
  x,
  y,
  width = image.width,
  height = image.height,
) {
  ctx.drawImage(image, x, y, width, height);
} // x,y are top left coordinates. width and height default to image size.
