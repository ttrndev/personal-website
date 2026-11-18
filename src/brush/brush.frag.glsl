#version 300 es
// Procedural brush stroke, part 2: paint.
//
// Each pixel of the ribbon knows where it sits along the stroke (vT) and how
// far it is from the centre line (vLat). From those two numbers it works out
//   * the ragged, bristly leading edge while the stroke is being drawn,
//   * the soft, chalky edge of the finished stroke,
// and then dithers the result against a clumpy grain so the edge is made of
// hard speckles rather than a smooth gradient — like chalk on dark paper.
precision highp float;

uniform vec3 uInk;     // stroke colour
uniform vec2 uSeed;    // per-stroke offsets into the noise domain
uniform float uLen;    // approximate stroke length (CSS px)
uniform float uHead;   // how far the brush has travelled (CSS px along the stroke)
uniform float uGrain;  // device pixels per grain cell (1 grain = 1 CSS px)

in float vT;
in float vLat;
in float vHalf;

out vec4 outColor;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  float s = vT * uLen; // CSS px along the stroke
  float lat = vLat;    // CSS px across the stroke

  // --- The moving brush tip --------------------------------------------------
  // Individual bristles run ahead of or lag behind the rest, which gives the
  // leading edge its streaky, dry-brush look.
  float lead = (vnoise(vec2(lat * 0.2, 3.7) + uSeed) - 0.5) * 340.0;
  float rag = (fbm(vec2(s * 0.014, lat * 0.05) + uSeed.yx) - 0.47) * 120.0;
  float behind = uHead - s + lead + rag; // CSS px behind the tip; < 0 = not painted yet
  if (behind < -30.0) discard;

  // The tip is narrower than the body of the stroke and widens as pressure builds.
  float tip = mix(0.4, 1.0, smoothstep(0.0, 300.0, behind));

  // --- The stroke itself -----------------------------------------------------
  float wobble = fbm(vec2(s * 0.012, lat * 0.022) + uSeed) - 0.47;   // slow edge drift
  float streak = vnoise(vec2(lat * 0.30, s * 0.007) + uSeed.yx) - 0.5; // bristle lines

  float e = 1.0 - abs(lat) / (vHalf * tip); // 1 at the centre line, 0 at the nominal edge
  e += wobble * 0.9 + streak * 0.3;

  float coverage = smoothstep(-0.30, 0.62, e);
  coverage *= smoothstep(-30.0, 80.0, behind); // grain-in at the very tip

  // --- Chalk grain -----------------------------------------------------------
  vec2 cell = floor(gl_FragCoord.xy / uGrain);
  float fine = hash12(cell + uSeed * 13.0);
  float clump = vnoise(cell * 0.45 + uSeed * 7.0);
  float grain = fine * 0.7 + clump * 0.3;
  if (grain >= coverage) discard;

  outColor = vec4(uInk, 1.0);
}
