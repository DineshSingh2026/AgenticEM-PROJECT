// Merged CatmullRom tubes. uv.x = u along the curve; aBundle = 0..2; aSeed = 0..1.
attribute float aBundle;
attribute float aSeed;
varying float vU;
varying float vBundle;
varying float vSeed;
varying vec3 vWorld;

void main() {
  vU = uv.x;
  vBundle = aBundle;
  vSeed = aSeed;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
