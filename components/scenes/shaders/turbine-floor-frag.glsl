// Turbine stage floor: hairline gold grid fading to black, warm pools under lit stations.
uniform float uOpacity;
uniform vec2 uExtent;
uniform vec3 uGold;
uniform vec3 uStations[5]; // x, z, intensity
varying vec2 vUv;
varying vec3 vPos;

void main() {
  vec2 p = vec2(vPos.x, -vPos.y); // plane authored in XY, rotated flat: local z = -y
  vec2 g = p / 0.25;
  vec2 fw = max(fwidth(g), vec2(1e-4));
  vec2 gl = abs(fract(g - 0.5) - 0.5) / fw;
  float line = 1.0 - smoothstep(0.0, 1.2, min(gl.x, gl.y));
  float dotm = 1.0 - smoothstep(0.6, 2.2, length(gl));
  vec2 q = p / uExtent;
  float fade = exp(-dot(q, q) * 2.4);
  vec3 col = uGold * (line * 0.02 + dotm * 0.08) * fade;
  for (int i = 0; i < 5; i++) {
    vec2 d = p - uStations[i].xy;
    float k = uStations[i].z;
    col += uGold * k * (exp(-dot(d, d) * 7.0) * 0.07 + (line * 0.05 + dotm * 0.2) * exp(-dot(d, d) * 3.0));
  }
  gl_FragColor = vec4(col * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
