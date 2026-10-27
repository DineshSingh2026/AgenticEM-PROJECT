// Screen-space blueprint grid with crop marks.
uniform vec2 uResolution;   // drawing-buffer pixels
uniform float uDpr;
uniform float uCell;        // CSS px
uniform float uOpacity;     // overall line opacity (0.05)
uniform vec3 uColor;
varying vec2 vUv;

float gridLine(float coord, float cell, float width) {
  float d = abs(mod(coord + 0.5 * width, cell) - 0.5 * width);
  return 1.0 - step(width, d);
}

void main() {
  vec2 px = gl_FragCoord.xy / uDpr;            // CSS pixels from bottom-left
  vec2 res = uResolution / uDpr;
  // Centre the grid horizontally so the layout looks balanced.
  vec2 p = px - vec2(mod(res.x * 0.5, uCell), 0.0);
  float w = 1.0;
  float g = max(gridLine(p.x, uCell, w), gridLine(p.y, uCell, w));

  // Crop marks: 12px L-shapes inset 24px from each viewport corner.
  float inset = 24.0;
  float len = 12.0;
  vec2 c = min(px, res - px);                 // distance to nearest edges
  vec2 q = c - vec2(inset);
  float hx = step(0.0, q.x) * step(q.x, len) * step(0.0, q.y) * step(q.y, w);
  float vy = step(0.0, q.y) * step(q.y, len) * step(0.0, q.x) * step(q.x, w);
  float crop = max(hx, vy);

  float a = g * uOpacity + crop * uOpacity * 4.0;
  if (a <= 0.0) discard;
  gl_FragColor = vec4(uColor, a);
}
