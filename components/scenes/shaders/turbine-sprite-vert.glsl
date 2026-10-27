// Turbine glow sprites: instanced camera-facing quads (token halo, station glows, flow sparks, bursts).
attribute vec3 aOffset;
attribute vec4 aColor; // rgb (HDR), w = size in local units
varying vec2 vUv;
varying vec3 vColor;

void main() {
  vUv = uv;
  vColor = aColor.rgb;
  float sc = length(modelMatrix[0].xyz);
  vec4 mv = modelViewMatrix * vec4(aOffset, 1.0);
  mv.xy += position.xy * aColor.w * sc;
  gl_Position = projectionMatrix * mv;
}
