// Turbine token halo: camera-facing quad (billboarded in view space).
varying vec2 vUv;
uniform float uSize;

void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += (uv - 0.5) * uSize;
  gl_Position = projectionMatrix * mv;
}
