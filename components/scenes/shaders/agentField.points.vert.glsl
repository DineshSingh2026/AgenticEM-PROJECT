// position.xy = uv into the position texture, position.z = particle index.
#define MAX_FLASH 16
uniform sampler2D uPositions;
uniform float uDpr;
uniform float uTime;
uniform float uFlashDur;
uniform float uSizeMin;
uniform float uSizeMax;
uniform float uFlashIdx[MAX_FLASH];
uniform float uFlashTime[MAX_FLASH];
varying float vFlash;

float hash11(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

void main() {
  vec3 pos = texture2D(uPositions, position.xy).xyz;
  float idx = position.z;
  float flash = 0.0;
  for (int i = 0; i < MAX_FLASH; i++) {
    float age = uTime - uFlashTime[i];
    if (abs(idx - uFlashIdx[i]) < 0.5 && age >= 0.0 && age < uFlashDur) {
      flash = max(flash, 1.0 - age / uFlashDur);
    }
  }
  vFlash = flash;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = mix(uSizeMin, uSizeMax, hash11(idx));
  gl_PointSize = (size + flash * 5.0) * uDpr;
}
