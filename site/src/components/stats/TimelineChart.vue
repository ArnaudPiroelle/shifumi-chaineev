<script setup lang="ts">
import { computed } from "vue";
import { useShifumi } from "../../composables/useShifumi";
import { fmtDate } from "../../domain/format";
import { PLAYER_IDS } from "../../domain/moves";
import PlayerLegend from "./PlayerLegend.vue";

const { players, matches, stats, cumulative } = useShifumi();

const W = 1000;
const H = 260;
const pad = { l: 36, r: 16, t: 16, b: 28 };

const chart = computed(() => {
  const n = Math.max(matches.length, 1);
  const max = Math.max(stats.wins.a, stats.wins.b, 1);
  const x = (i: number) => pad.l + (i / n) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const step = Math.max(1, Math.ceil(max / 5));
  const grid: { v: number; y: number }[] = [];
  for (let v = 0; v <= max; v += step) grid.push({ v, y: y(v) });
  const lines = PLAYER_IDS.map((id) => ({
    id,
    color: players[id].color,
    points: cumulative.map((c, i) => `${x(i)},${y(c[id])}`).join(" "),
    // un point par victoire, avec la voiture et la date en infobulle
    dots: matches.flatMap((m, i) =>
      m.winner === id ? [{ cx: x(i + 1), cy: y(cumulative[i + 1]![id]), title: `${m.car} — ${fmtDate(m.date)}` }] : [],
    ),
  }));
  return { grid, lines };
});
const first = matches[0];
const last = matches[matches.length - 1];
</script>

<template>
  <div class="chart">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="Victoires cumulées">
      <template v-for="g in chart.grid" :key="g.v">
        <line class="grid-line" :x1="pad.l" :x2="W - pad.r" :y1="g.y" :y2="g.y" />
        <text :x="pad.l - 8" :y="g.y + 4" text-anchor="end">{{ g.v }}</text>
      </template>
      <template v-for="l in chart.lines" :key="l.id">
        <polyline fill="none" :stroke="l.color" stroke-width="3" stroke-linejoin="round" :points="l.points" />
        <circle v-for="(d, i) in l.dots" :key="i" :cx="d.cx" :cy="d.cy" r="4" :fill="l.color">
          <title>{{ d.title }}</title>
        </circle>
      </template>
      <template v-if="first && last">
        <text :x="pad.l" :y="H - 6">{{ fmtDate(first.date) }}</text>
        <text :x="W - pad.r" :y="H - 6" text-anchor="end">{{ fmtDate(last.date) }}</text>
      </template>
    </svg>
    <PlayerLegend />
  </div>
</template>
