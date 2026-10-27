// position.x/z = footprint position, position.y = seed (0..1).
uniform float uTime;
uniform float uBottom;
uniform float uHeight;
uniform float uDpr;
uniform float uSize;
varying float vLife;

void main() {
  float seed = position.y;
  float life = fract(uTime * (0.08 + 0.06 * fract(seed * 7.13)) + seed);
  vLife = life;
  vec3 p = vec3(position.x, uBottom + life * uHeight, position.z);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uDpr * (0.7 + 0.6 * fract(seed * 3.7));
}
