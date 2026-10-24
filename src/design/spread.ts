/**
 * Glyphs that fall too close on a wheel are spread apart; each mark keeps its
 * real degree. Re-sorted at the start of every round (LEEME «las dos
 * cartas», tried locally on 21 Oct 2026): two points on the same degree used
 * to cross over each other and stay on top of one another.
 */
export function spreadApart(points: readonly { id: string; d: number }[], min: number): Map<string, number> {
  const order = points.map((p) => ({ id: p.id, d: p.d }));
  for (let it = 0; it < 80; it++) {
    order.sort((x, y) => x.d - y.d);
    let moved = false;
    for (let k = 0; k < order.length; k++) {
      const a = order[k]!;
      const b = order[(k + 1) % order.length]!;
      if (a === b) break;
      const gap = (b.d - a.d + 360) % 360;
      if (gap < min) {
        const m = (min - gap) / 2 + 0.01;
        a.d -= m;
        b.d += m;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return new Map(order.map((o) => [o.id, o.d]));
}
