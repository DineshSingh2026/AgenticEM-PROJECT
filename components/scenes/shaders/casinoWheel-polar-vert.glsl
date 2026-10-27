// CasinoWheel: shared vertex shader for flat overlays authored in wheel space (Y up, wheel plane XZ).
// Passes the wheel-space position (for polar coords) and the world-space x (for the calm-left fade).
varying vec3 vPos;
varying float vWorldX;

void main() {
  vPos = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldX = world.x;
  gl_Position = projectionMatrix * viewMatrix * world;
}
