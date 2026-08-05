/**
 * The two regional vocabularies, as procedural GLSL.
 *
 * Every one of these is generated rather than sampled — no textures ship, so
 * there is nothing to load, nothing to 404 behind a basePath, and nothing that
 * resolves at a different resolution on somebody else's phone. It is the same
 * decision the Devanagari pipeline makes, for the same reasons.
 *
 * राजस्थान — leheriya (the diagonal "wave"), bandhani (tie-dye resist dots)
 * अवध      — Banarasi butti (the brocade motif on its zari lattice)
 *
 * All return 0..1 masks in UV space. The caller decides whether that mask
 * becomes colour, roughness or a hole.
 */
export const patterns = /* glsl */ `
  /* ── लहरिया ────────────────────────────────────────────────────────────
   * Diagonal bands, and the name means "waves" — so they are not ruled
   * straight lines. Real leheriya is resist-tied on rolled cloth, and the
   * resist wanders; a perfectly straight stripe reads as printed vinyl.
   * ------------------------------------------------------------------- */
  float leheriya(vec2 uv, float freq, float angle) {
    float c = cos(angle), s = sin(angle);
    float d = uv.x * c + uv.y * s;
    d += sin(uv.y * 9.0) * 0.012 + sin(uv.x * 6.3 + 1.7) * 0.008;
    float band = fract(d * freq);
    // a wide dyed band and a narrow undyed one, with a soft dye edge
    float e = 0.06;
    return smoothstep(0.5 - e, 0.5 + e, band) * smoothstep(1.0, 1.0 - e, band);
  }

  /* ── बंधनी ─────────────────────────────────────────────────────────────
   * Thousands of tiny points tied off before dyeing. The grid is staggered,
   * never square, and each dot is imperfect — the craft is hand-tied and a
   * lattice of identical circles is the giveaway that it was not.
   * ------------------------------------------------------------------- */
  float bandhani(vec2 uv, float freq) {
    vec2 g = uv * freq;
    g.x += step(1.0, mod(floor(g.y), 2.0)) * 0.5;   // stagger alternate rows
    vec2 cell = fract(g) - 0.5;
    vec2 id = floor(g);
    float jitter = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
    float r = 0.17 + jitter * 0.09;
    return 1.0 - smoothstep(r * 0.6, r, length(cell));
  }

  /* ── बनारसी बूटी ───────────────────────────────────────────────────────
   * The brocade motif, sitting on the zari lattice that carries it. Two
   * layers, because that is what the weave is: a ground of fine gold thread,
   * and the figure worked on top of it.
   * ------------------------------------------------------------------- */
  float buttiMotif(vec2 p) {
    // a kalga — the paisley: a teardrop with a curled tip
    p.y -= 0.06;
    float bend = p.y * p.y * 1.9;
    p.x += bend * 0.55;
    float body = 1.0 - smoothstep(0.14, 0.2, length(p * vec2(1.5, 1.0)));
    float curl = 1.0 - smoothstep(0.045, 0.075, length(p - vec2(-0.1, 0.17)));
    return clamp(body + curl, 0.0, 1.0);
  }

  float butti(vec2 uv, float freq) {
    vec2 g = uv * freq;
    g.x += step(1.0, mod(floor(g.y), 2.0)) * 0.5;
    vec2 cell = fract(g) - 0.5;

    float motif = buttiMotif(cell);

    // the zari ground: a fine diagonal lattice of gold thread
    vec2 l = uv * freq * 3.0;
    float lat = max(
      1.0 - smoothstep(0.02, 0.06, abs(fract(l.x + l.y) - 0.5)),
      1.0 - smoothstep(0.02, 0.06, abs(fract(l.x - l.y) - 0.5))
    );

    return clamp(motif + lat * 0.22, 0.0, 1.0);
  }

  /* ── जाली ──────────────────────────────────────────────────────────────
   * The pierced stone screen. Returns 1 where the stone *is* — the caller
   * discards the rest, so light comes through the holes rather than being
   * faked with a texture.
   *
   * Built from an eight-fold star repeat, which is the geometry actual
   * Rajput jaali is cut on: overlapping octagons leaving eight-pointed voids.
   * ------------------------------------------------------------------- */
  float jaali(vec2 uv, float freq) {
    vec2 g = uv * freq;
    vec2 cell = fract(g) - 0.5;

    float a = atan(cell.y, cell.x);
    float r = length(cell);

    // an eight-pointed star: the radius the void reaches at this angle
    float star = 0.30 + 0.085 * cos(a * 8.0);
    float hole = 1.0 - smoothstep(star - 0.02, star + 0.02, r);

    // the ribs between cells, so the screen holds together as one carved slab
    float rib = max(
      1.0 - smoothstep(0.03, 0.055, abs(cell.x)),
      1.0 - smoothstep(0.03, 0.055, abs(cell.y))
    );

    return clamp(1.0 - hole + rib, 0.0, 1.0);
  }
`
