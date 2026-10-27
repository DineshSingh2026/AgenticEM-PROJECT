// CasinoWheel gold dust: slow upward drift with per-mote twinkle.
attribute float aSeed;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform vec3 uBox; // half extents for wrapping
varying float vAlpha;

void main() {
  vec3 p = position;
  float t = uTime * (0.04 + aSeed * 0.05);
  p.y = mod(p.y + t + uBox.y, uBox.y * 2.0) - uBox.y;
  p.x += sin(uTime * 0.2 + aSeed * 40.0) * 0.08;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.5 + 0.5 * sin(uTime * (0.6 + aSeed * 1.7) + aSeed * 90.0);
  float edge = 1.0 - smoothstep(uBox.y * 0.75, uBox.y, abs(p.y));
  vAlpha = (0.25 + 0.75 * tw * tw) * edge;
  gl_PointSize = uSize * (0.6 + aSeed * 0.9) * uPixelRatio * (8.0 / -mv.z);
}
