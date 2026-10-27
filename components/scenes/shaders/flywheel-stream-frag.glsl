// FlywheelScene data track: twin rails plus a clockwise-flowing dash stream whose density grows with volume.
#define TAU 6.28318530718
uniform float uOpacity;
uniform float uFlow;   // accumulated clockwise phase (laps)
uniform float uLead;   // 0..1 lead comet position (clockwise from node 0)
uniform float uVol;
uniform vec3 uGold;
uniform vec3 uPale;
varying vec2 vPos;

float line(float d, float w) {
  float aa = fwidth(d);
  return 1.0 - smoothstep(w - aa, w + aa, abs(d));
}

void main() {
  float r = length(vPos);
  float a = atan(vPos.y, vPos.x);
  float s = fract((2.35619449 - a) / TAU);
  vec3 col = vec3(0.0);
  col += uGold * (line(r - 0.772, 0.0016) + line(r - 0.828, 0.0016)) * 0.5;
  float core = exp(-pow((r - 0.8) / 0.012, 2.0));
  float dash = smoothstep(0.55, 1.0, fract(s * 64.0 - uFlow * 16.0));
  float dens = 0.25 + 0.75 * uVol;
  col += uGold * core * dash * dens * 0.8;
  col += uGold * exp(-pow((r - 0.8) / 0.03, 2.0)) * 0.06 * (0.5 + uVol);
  float d = fract(uLead - s); // 0 at head, grows along the tail
  float tail = exp(-d * 18.0) * step(0.0, d);
  col += uPale * tail * core * (1.6 + uVol * 1.6);
  gl_FragColor = vec4(col * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
