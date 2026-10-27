// AgentLoop ring: 4 arc quadrants (clockwise from 12 o'clock):
// 0 assess (red), 1 calculate (blue), 2 evaluate (green), 3 execute (gold).
// uLevel.q  = extra glow per quadrant, uFill.q = 0..1 sweep of that glow along the arc.
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec3 uColD;
uniform vec3 uGuide;
uniform vec4 uLevel;
uniform vec4 uFill;
uniform float uBase;
uniform float uRadius;
uniform float uWidth;
uniform float uTime;
uniform float uOpacity;

varying vec2 vPos;

#define PI 3.141592653589793
#define TAU 6.283185307179586

float pick(vec4 v, float q) {
  if (q < 0.5) return v.x;
  if (q < 1.5) return v.y;
  if (q < 2.5) return v.z;
  return v.w;
}

vec3 pickCol(float q) {
  if (q < 0.5) return uColA;
  if (q < 1.5) return uColB;
  if (q < 2.5) return uColC;
  return uColD;
}

void main() {
  float r = length(vPos);
  float a = mod(PI * 0.5 - atan(vPos.y, vPos.x), TAU); // clockwise from top
  float qf = a / (PI * 0.5);
  float q = floor(qf);
  float local = fract(qf);

  // gaps between quadrants
  float gap = smoothstep(0.0, 0.018, local) * (1.0 - smoothstep(0.982, 1.0, local));

  float d = abs(r - uRadius);
  float aa = fwidth(r) * 1.5;
  float core = 1.0 - smoothstep(uWidth * 0.5 - aa, uWidth * 0.5 + aa, d);
  float glow = exp(-d * d / (uWidth * uWidth * 9.0));

  float level = pick(uLevel, q);
  float fill = pick(uFill, q);
  float sweep = 1.0 - smoothstep(fill - 0.02, fill + 0.02, local);
  // bright leading edge while the sweep is in progress
  float head = (fill > 0.001 && fill < 0.999) ? exp(-pow((local - fill) * 18.0, 2.0)) : 0.0;

  vec3 col = pickCol(q);
  float lit = level * sweep;
  float intensity = core * (uBase + lit * 1.6) + glow * lit * 0.55 + head * core * level * 1.2;
  intensity *= gap;

  // faint dashed guide ring outside the arcs
  float gd = abs(r - uRadius * 1.12);
  float guide = (1.0 - smoothstep(0.0, aa * 1.2 + 0.002, gd)) * step(0.5, fract(a * 24.0 / PI + uTime * 0.05)) * 0.22;

  vec3 rgb = col * intensity + uGuide * guide;
  // additive blending: alpha fixed at 1 so rgb is added as-is
  gl_FragColor = vec4(rgb * uOpacity, 1.0);
  #include <colorspace_fragment>
}
