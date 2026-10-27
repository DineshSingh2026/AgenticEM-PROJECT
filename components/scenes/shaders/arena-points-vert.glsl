// Soft glowing point sprites (ArenaGraph nodes/pulses, also reused by HeartbeatRing nodes).
// aSize is a size in world units; uScale converts world size at depth 1 into device pixels.
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;

uniform float uScale;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(aSize * uScale / max(-mv.z, 0.001), 0.0);
}
