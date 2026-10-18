<script setup>
// This is a deviation bar for the homepage, its aim is to clearly show the deviation of selected camera in more detail.
// IMPORTS
import { computed, toValue } from "vue";

// global Min max values
import { usePersistentSliderRange } from "../composables/usePersistentSliderRange";
const {
  // data
  sliderRange
} = usePersistentSliderRange();
// -----------------------
//         Props
// -----------------------
const props = defineProps({
  alertBelow: { type: Number, required: true },
  warnBelow: { type: Number, required: true },
  warnAbove: { type: Number, required: true },
  alertAbove: { type: Number, required: true },
  deviation: { type: Number, required: true },
});

// ----------------------------
//  Component scoped constants
// ----------------------------
// Range padding for when the range extends over the global min max for the slider
const RANGE_PADDING = 5;
// Interval number (number of gaps between the notches / number of notches + 1)
const NUMBER_OF_INTERVALS = 10;

// -----------------------
//       Computed
// -----------------------

// Deviation bar range
const range = computed(() => {
  const base = toValue(sliderRange) ?? {};
  let min = Number.isFinite(base.min) ? base.min : 90;
  let max = Number.isFinite(base.max) ? base.min : 110;
  // adds padding to deviation bar if the global min max values are cutting of the thresholds
  if (props.alertBelow < min) min = props.alertBelow - RANGE_PADDING;
  if (props.alertAbove > max) max = props.alertAbove + RANGE_PADDING;

  return { min, max };
});

// percentage for the thresholds
const alertBelowPercent = computed(() => toPercentage(props.alertBelow));
const warnBelowPercent = computed(() => toPercentage(props.warnBelow));
const warnAbovePercent = computed(() => toPercentage(props.warnAbove));
const alertAbovePercent = computed(() => toPercentage(props.alertAbove));

// coloured sections on the bar
const trackCSS = computed(() => ({
  background: `linear-gradient(to right,
    var(--range-alert) 0%, var(--range-alert) ${alertBelowPercent.value}%,
    var(--range-warn) ${alertBelowPercent.value}%, var(--range-warn) ${warnBelowPercent.value}%,
    var(--range-safe) ${warnBelowPercent.value}%, var(--range-safe) ${warnAbovePercent.value}%,
    var(--range-warn) ${warnAbovePercent.value}%, var(--range-warn) ${alertAbovePercent.value}%,
    var(--range-alert) ${alertAbovePercent.value}%, var(--range-alert) 100%)`,
}));

// Deviation marker
const markerPct = computed(() => toPercentage(props.deviation));

// check for the deviation marker being off the scale
const isOffScale = computed(
  () => props.deviation < range.value.min || props.deviation > range.value.max
);

// calculate the deviation status
const status = computed(() => {
  if (props.deviation < props.alertBelow || props.deviation > props.alertAbove) return "alert";
  if (props.deviation < props.warnBelow || props.deviation > props.warnAbove) return "warn";
  return "safe";
});


const formattedDeviation = computed(() => {
  props.deviation.toFixed(2);
})

const scaledNotches = computed(() => {
  const { min, max } = range.value;
  const increment = (max - min) / NUMBER_OF_INTERVALS;
  const notches = [];
  let counter = min;
  notches.push({
    value: Math.round(min * 100) / 100,
    percent: toPercentage(min),
  });
  for (let i = 0; i <= (NUMBER_OF_INTERVALS - 1); i++) {
    counter += increment;
    notches.push({
      value: Math.round(counter * 100) / 100,
      percent: toPercentage(counter),
    });
  }
  return notches;
})
// -----------------------
//       Functions
// -----------------------

// Positions on the track from 0 - 100
function toPercentage(value) {
  // in case the deviation is ever 0
  if (value === 0) return 0;
  const { min, max } = range.value;
  const span = max - min;
  return Math.min(Math.max(((value - min) / span) * 100, 0), 100);
}
</script>
<template>
<div
  class="deviation-bar" role="meter" aria-label="Deviation"
  :aria-valuemin="range.min" :aria-valuemax="range.max"
  :aria-valuenow="deviation" :aria-valuetext="`${formattedDeviation}, ${status}`">
      <!-- Track and Marker -->
    <div class="track-section">
        <div class="track" :style="trackCSS"></div>
        <div
            class="marker"
            :class="[`is-${status}`, { 'is-off-scale': isOffScale }]"
            :style="{ left: `${markerPct}%` }"
        >
            <span class="marker-label">
            {{ formattedDeviation }}
            <span v-if="isOffScale" aria-hidden="true">{{ deviation < range.min ? "«" : "»" }}</span>
            </span>
            <span class="marker-pointer"></span>
        </div>
    </div>
    <!-- Scaled notches -->
    <div class="scale-labels">
      <span
        v-for="notch in scaledNotches"
        :key="notch.key"
        class="scale-notch"
        :style="{ left: `${notch.percent}%` }">
        {{ notch.value }}
      </span>
    </div>
</div>
</template>
<style scoped>
.deviation-bar {
    --track-height: 0.75rem;
    --marker-width: 3px;
    --marker-height: 1.75rem;
    width: 100%;
    padding: 2.75rem 1.25rem 0.5rem;
    box-sizing: border-box;
}

.track-section {
  position: relative;
  height: var(--track-height);
}

.track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
}

/* ---------- Marker ---------- */
.marker {
  --marker-color: var(--range-safe);
  position: absolute;
  top: 50%;
  transform: translateX(-50%);
  height: 0;
  width: 0;
  transition: left 0.35s ease;
}

.marker.is-warn { --marker-color: var(--range-warn); }
.marker.is-alert { --marker-color: var(--range-alert); }


.marker::before {
  content: "";
  position: absolute;
  left: calc(var(--marker-width) / -2);
  top: calc(var(--marker-height) / -2);
  width: var(--marker-width);
  height: var(--marker-height);
  border-radius: 999px;
  background: var(--bs-body-color);
  box-shadow: 0 0 0 2px var(--bs-body-bg);
}


.scale-labels {
  position: relative;
  height: 1.5rem;
  margin-top: 1.25rem;
}
.scale-notch {
  position: absolute;
  transform: translateX(-50%);
  font-size: 10pt;
  color: var(--bs-body-color);
}
.scale-notch::before {
  content: "";
  position: absolute;
  top: -1rem;
  left: 50%;
  width: 2px;
  height: 0.6rem;
  background: currentColor;
}
</style>
