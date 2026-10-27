// AgentLoop background particles: orbit the ring on the GPU (no per-frame buffer uploads).
// aSeed: x = radius offset (fraction of ring radius), y = start angle, z = angular speed, w = depth
attribute vec4 aSeed;
uniform float uTime;
uniform float uRadius;
uniform float uSize;
uniform float uPixelRatio;
varying float vFade;

void main() {
  float ang = aSeed.y + uTime * aSeed.z;
  float r = uRadius * (1.0 + aSeed.x) + sin(uTime * 0.6 + aSeed.y * 7.0) * 0.03;
  vec3 p = vec3(cos(ang) * r, sin(ang) * r, aSeed.w);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float near = 1.0 - clamp(abs(aSeed.x) / 1.2, 0.0, 1.0);
  vFade = 0.25 + 0.75 * near;
  gl_PointSize = uSize * uPixelRatio * (0.6 + near) * (8.0 / max(0.1, -mv.z));
}
