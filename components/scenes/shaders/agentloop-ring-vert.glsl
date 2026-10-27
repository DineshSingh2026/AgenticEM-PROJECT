// AgentLoop ring: passes local XY so the fragment shader can work in polar coordinates.
varying vec2 vPos;

void main() {
  vPos = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
