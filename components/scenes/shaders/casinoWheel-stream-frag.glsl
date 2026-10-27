// CasinoWheel settlement streams: a packet runs radially out of the winning pocket, then splits
// both ways along the gold rim lip. Up to 12 live packets, driven from the CPU.
#define MAX_PACKETS 12
#define TAU 6.28318530718
#define PI 3.14159265359

uniform vec4 uPackets[MAX_PACKETS]; // x: angle (rad, wheel frame) y: age (s) z: unused w: intensity (0 = free)
uniform float uOpacity;
uniform float uRadialDur;
uniform float uArcSpeed;
uniform float uLife;
uniform vec2 uRadial;   // start / end radius of the radial run
uniform float uLipR;
uniform vec3 uColor;
uniform vec3 uHot;
varying vec3 vPos;
varying float vWorldX;

float wrapPi(float x) { return mod(x + PI, TAU) - PI; }

void main() {
  float r = length(vPos.xz);
  float a = atan(-vPos.z, vPos.x);
  vec3 col = vec3(0.0);

  for (int i = 0; i < MAX_PACKETS; i++) {
    vec4 p = uPackets[i];
    if (p.w <= 0.0) continue;
    float age = p.y;
    float da = abs(wrapPi(a - p.x));
    float env = 1.0 - smoothstep(uLife * 0.55, uLife, age);

    // Phase 1: radial dart from the pocket to the rim.
    float tr = clamp(age / uRadialDur, 0.0, 1.0);
    float headR = mix(uRadial.x, uRadial.y, tr * tr * (3.0 - 2.0 * tr));
    float across = da * r;
    float radial = exp(-pow(across / 0.0065, 2.0));
    radial *= smoothstep(headR - 0.26, headR, r) * (1.0 - smoothstep(headR, headR + 0.012, r));
    radial *= 1.0 - smoothstep(uRadialDur, uRadialDur + 0.3, age);

    // Phase 2: twin comets racing along the rim lip.
    float ta = max(age - uRadialDur * 0.85, 0.0);
    float head = uArcSpeed * ta * (1.0 - 0.25 * ta);
    float tail = min(head, 0.85);
    float along = smoothstep(head - tail, head, da) * (1.0 - smoothstep(head, head + 0.015, da));
    float lip = exp(-pow((r - uLipR) / 0.0075, 2.0));
    float arc = along * lip * step(0.0001, ta);
    float headGlow = exp(-pow((da - head) / 0.02, 2.0)) * lip * step(0.0001, ta);

    float k = (radial + arc * 0.75 + headGlow * 0.9) * env * p.w;
    col += mix(uColor, uHot, clamp(radial + headGlow, 0.0, 1.0)) * k;
  }

  gl_FragColor = vec4(col * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
