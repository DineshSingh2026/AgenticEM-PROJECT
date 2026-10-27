// CasinoWheel HUD: three thin instrument rings coplanar with the wheel.
//  A (inner): fine 2-degree ticks, rotates with network load.
//  B (middle): game-mix arcs (cumulative fractions in uMix) + rotating labels; pulses on settled rounds.
//  C (outer): sparse ticks with a load-driven sweep comet.
#define TAU 6.28318530718

uniform float uOpacity;
uniform vec3 uRot;          // ring angles A, B, C (rad)
uniform float uMix[5];      // cumulative end fraction of each game segment
uniform float uPulse[5];    // 0..1 per game, decays on the CPU
uniform vec3 uGold;
uniform vec3 uPale;
uniform vec3 uDeep;
uniform sampler2D uLabels;
uniform vec4 uRadii;        // A, B, label inner, C
varying vec3 vPos;
varying float vWorldX;

float line(float d, float w) {
  float aa = fwidth(d);
  return 1.0 - smoothstep(w - aa, w + aa, abs(d));
}

float ticks(float u, float count, float r, float width) {
  float t = u * count;
  float d = (abs(fract(t + 0.5) - 0.5) / count) * TAU * r; // arc distance to nearest tick
  return line(d, width);
}

void main() {
  float r = length(vPos.xz);
  float a = atan(-vPos.z, vPos.x);
  vec3 col = vec3(0.0);

  // Ring A
  float uA = fract((a - uRot.x) / TAU);
  float rA = uRadii.x;
  float baseA = line(r - rA, 0.0016);
  float minor = ticks(uA, 180.0, r, 0.0018) * step(rA, r) * (1.0 - step(rA + 0.028, r));
  float major = ticks(uA, 36.0, r, 0.0024) * step(rA, r) * (1.0 - step(rA + 0.055, r));
  col += uGold * (baseA * 0.55 + minor * 0.35 + major * 0.75);

  // Ring B: game mix arcs
  float uB = fract((a - uRot.y) / TAU);
  float rB = uRadii.y;
  float inBand = step(rB - 0.012, r) * (1.0 - step(rB + 0.012, r));
  float prev = 0.0;
  vec3 segCol = vec3(0.0);
  float segOn = 0.0;
  for (int i = 0; i < 5; i++) {
    float lo = prev;
    float hi = uMix[i];
    float inSeg = step(lo + 0.0035, uB) * (1.0 - step(hi - 0.0035, uB));
    float tone = float(i) / 4.0;
    vec3 c = mix(uGold, uDeep, tone * 0.85);
    c = mix(c, uPale * 1.8, uPulse[i]);
    segCol += c * inSeg * (0.55 + 0.9 * uPulse[i]);
    segOn += inSeg;
    prev = hi;
  }
  float edgeSoft = 1.0 - smoothstep(0.009, 0.012, abs(r - rB));
  col += segCol * inBand * edgeSoft;
  // hairline under the arcs
  col += uGold * line(r - (rB + 0.022), 0.0012) * 0.35;

  // Labels (rotate with ring B)
  float lr0 = uRadii.z;
  float lv = (r - lr0) / 0.05;
  if (lv > 0.0 && lv < 1.0) {
    float lab = texture2D(uLabels, vec2(uB, lv)).r;
    col += uPale * lab * 0.45;
  }

  // Ring C: sparse ticks + load sweep
  float uC = fract((a - uRot.z) / TAU);
  float rC = uRadii.w;
  float baseC = line(r - rC, 0.0014);
  float tc = ticks(uC, 24.0, r, 0.0022) * step(rC - 0.03, r) * (1.0 - step(rC, r));
  float dots = ticks(uC, 120.0, r, 0.0035) * line(r - (rC + 0.03), 0.0035);
  float sweep = exp(-uC * 9.0) * line(r - rC, 0.004);
  col += uGold * (baseC * 0.3 + tc * 0.5 + dots * 0.35) + uPale * sweep * 2.2;

  // Keep the headline side calm: fade towards world-left.
  float side = smoothstep(-1.0, 1.4, vWorldX);
  gl_FragColor = vec4(col * side * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
