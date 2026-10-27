// Trail line segments: position.x = flash slot, position.y = 0 (head) / 1 (tail toward centre).
#define MAX_FLASH 16
uniform sampler2D uPositions;
uniform float uSize;         // texture side length
uniform float uTime;
uniform float uFlashDur;
uniform float uTrailLen;
uniform float uFlashIdx[MAX_FLASH];
uniform float uFlashTime[MAX_FLASH];
varying float vAlpha;

void main() {
  int slot = int(position.x + 0.5);
  float idx = uFlashIdx[slot];
  float age = uTime - uFlashTime[slot];
  float live = step(0.0, idx) * step(0.0, age) * step(age, uFlashDur);
  vec2 ref = vec2((mod(idx, uSize) + 0.5) / uSize, (floor(idx / uSize) + 0.5) / uSize);
  vec3 head = texture2D(uPositions, ref).xyz;
  vec3 toC = vec3(0.0, 0.0, head.z) - head;
  float grow = smoothstep(0.0, 0.35, age / uFlashDur);
  vec3 p = head + toC * uTrailLen * grow * position.y;
  float fade = 1.0 - age / uFlashDur;
  vAlpha = live * fade * (1.0 - position.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
