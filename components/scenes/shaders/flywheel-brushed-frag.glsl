// Injected after <roughnessmap_fragment>: concentric hairline streaks + a fixed anisotropic sheen
// band that stays still in world space while the wheel spins.
{
  float rr = length(vFwLocal.xy);
  float ang = atan(vFwLocal.y, vFwLocal.x);
  float hair = fwNoise(rr * 900.0) * 0.55 + fwNoise(rr * 230.0 + 3.1) * 0.45;
  hair *= 0.85 + 0.15 * fwNoise(ang * 36.0 + rr * 40.0);
  diffuseColor.rgb *= 0.8 + 0.4 * hair;
  roughnessFactor = clamp(roughnessFactor + (hair - 0.5) * 0.24, 0.04, 1.0);
  float rel = ang + uFwRot - uFwSheenAngle;
  float sheen = pow(abs(cos(rel)), 28.0) + 0.4 * pow(abs(sin(rel)), 80.0);
  totalEmissiveRadiance += uFwSheenColor * sheen * (0.35 + 0.65 * hair) * smoothstep(0.15, 0.6, rr) * 0.09;
}
