// Turbine ledger edges: per-instance state (x = seal glow, y = hash sweep 0..1, z = alpha).
attribute vec3 aState;
varying vec2 vUv;
varying vec3 vState;

void main() {
  vUv = uv;
  vState = aState;
  vec4 p = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * p;
}
