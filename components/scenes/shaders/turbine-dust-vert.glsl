// Turbine gold dust: slow upward drift with per-mote twinkle, inside the pipeline volume.
attribute float aSeed;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform vec2 uY; // min, max height
varying float vAlpha;

void main() {
  vec3 p = position;
  float span = uY.y - uY.x;
  p.y = uY.x + mod(p.y - uY.x + uTime * (0.03 + aSeed * 0.04), span);
  p.x += sin(uTime * 0.17 + aSeed * 40.0) * 0.06;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.5 + 0.5 * sin(uTime * (0.6 + aSeed * 1.7) + aSeed * 90.0);
  float t = (p.y - uY.x) / span;
  vAlpha = (0.2 + 0.8 * tw * tw) * smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.7, 1.0, t));
  gl_PointSize = uSize * (0.6 + aSeed * 0.9) * uPixelRatio * (8.0 / -mv.z);
}
