// Ledger block edge shell (instanced). aState.x = copper glow 0..1, aState.y = alpha 0..1
attribute vec2 aState;
varying vec2 vUv;
varying vec2 vState;
varying float vWorldX;

void main() {
  vUv = uv;
  vState = aState;
  vec4 wp = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    wp = instanceMatrix * wp;
  #endif
  wp = modelMatrix * wp;
  vWorldX = wp.x;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
