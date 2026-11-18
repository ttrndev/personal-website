#version 300 es
// Procedural brush stroke, part 2: paint.
//
// A dab is a sparse, speckled disc baked into `uDab` (see dab.ts). Pixels where
// it is "on" get the ink colour; everything else is left alone. Hundreds of
// randomly rotated dabs overlap, so the middle of the stroke ends up solid and
// the edge stays a hard-edged, chalky speckle — no blending involved, which also
// means the order the dabs are drawn in doesn't matter.
precision highp float;

uniform sampler2D uDab;
uniform vec3 uInk;

in vec2 vUV;
out vec4 outColor;

void main() {
  if (texture(uDab, vUV).r < 0.5) discard;
  outColor = vec4(uInk, 1.0);
}
