uniform vec3 uBase;     // resting edge colour
uniform vec3 uGlow;     // copper (or steel in monochrome)
uniform float uOpacity;
uniform float uFadeLeft; // world x where the chain fades out
varying vec2 vUv;
varying vec2 vState;
varying float vWorldX;

void main() {
  // pixel-constant distance to the nearest face edge
  vec2 fw = max(fwidth(vUv), vec2(1e-5));
  vec2 e = min(vUv, 1.0 - vUv) / fw;
  float d = min(e.x, e.y);
  float line = 1.0 - smoothstep(0.8, 2.2, d);
  float bloom = exp(-d / 9.0);

  float g = vState.x;
  vec3 rgb = uBase * line * 0.55 + uGlow * (line * 2.4 + bloom * 0.45) * g;
  float fade = smoothstep(uFadeLeft, uFadeLeft + 1.6, vWorldX);
  gl_FragColor = vec4(rgb * vState.y * fade * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
