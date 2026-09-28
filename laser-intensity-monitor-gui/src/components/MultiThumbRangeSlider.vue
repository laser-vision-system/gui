<script setup>
import { ref, computed, watch } from "vue";

// --------------------
//   Props
// --------------------
// Variables that are passed down from parent component
const props = defineProps({
  min: { type: Number, default: 0 },
  max: { type: Number, default: 200 },
  step: { type: Number, default: 0.1 },
});

// -----------------------
//  2-way bound values
//  (allows for one v-model per thumb)
// -----------------------
const alertBelow = defineModel("alertBelow", { type: Number, default: 70 });
const warnBelow = defineModel("warnBelow", { type: Number, default: 95 });
const warnAbove = defineModel("warnAbove", { type: Number, default: 105 });
const alertAbove = defineModel("alertAbove", { type: Number, default: 120 });



// --------------------
//   V-model Data
// --------------------
// ref verable to track the active thumb being moved
const activeThumb = ref(null);

// array size for the salced notches
const NUMBER_OF_INTERVALS = 10;
// --------------------
//   Methods
// --------------------

// function to get the progress of the slider
function toPercentage(value) {
  return ((value - props.min) / (props.max - props.min)) * 100;
};

// function to set the css variable for the progress
function setCSSProgress (progress) {
  slider.value.style.setProperty("--ProgressPercent", `${progress}%`);
};


// used by the thumb handeler function to block overlap between thumbs.
function clampRange(value, low, high) {
  return Math.min(Math.max(value, low), high)
};

// Thumb manager  / input event handler
function thumbManager(modelReference, rangeReference) {
  return (event) => {
    const thumbValue = parseFloat(event.target.value);
    if (Number.isNaN(thumbValue)) return;
    const clampedValue = clampRange(thumbValue, rangeReference.value.min, rangeReference.value.max);
    // update the value
    modelReference.value = clampedValue;
    event.target.value = clampedValue;
  };
}


// --------------------
//   Computed
// --------------------

// range for the red alert below slider section
const alertBelowRange = computed(() => ({
  min: props.min, max: warnBelow.value
}));

// range for the yellow warn below slider section
const warnBelowRange = computed(() => ({
  min: alertBelow.value, max: warnAbove.value
}));

// range for yellow warn above slider section
const warnAboveRange = computed(() => ({
  min: warnBelow.value, max: alertAbove.value
}));

// range for the red alert above slider section
const alertAboveRange = computed(() => ({
  min: warnAbove.value, max: props.max
}));

// calculated percentages
// used to fill in the slider range behind and between the thumbs
const alertBelowPercentage = computed(() => toPercentage(alertBelow.value));
const warnBelowPercentage = computed(() => toPercentage(warnBelow.value));
const warnAbovePercentage = computed(() => toPercentage(warnAbove.value));
const alertAbovePercentage = computed(() => toPercentage(alertAbove.value));

// Track the CSS styling for the range slider inputs on the slider track
const trackCSS = computed(() => ({
  background: `linear-gradient(to right,
  var(--range-alert) 0%, var(--range-alert) ${alertBelowPercentage.value}%,
  var(--range-warn) ${alertBelowPercentage.value}%, var(--range-warn) ${warnBelowPercentage.value}%,
  var(--range-safe) ${warnBelowPercentage.value}%, var(--range-safe) ${warnAbovePercentage.value}%,
  var(--range-warn) ${warnAbovePercentage.value}%, var(--range-warn) ${alertAbovePercentage.value}%,
  var(--range-alert) ${alertAbovePercentage.value}%, var(--range-alert) 100%)`,
}));

const scaledNotches = computed(() => {
  const notches = [];
  const increament = ((props.max - props.min) / NUMBER_OF_INTERVALS);
  let counter = props.min;
  notches.push({
    value: Math.round(props.min * 100) / 100,
    percent: toPercentage(props.min),
  });
  for (let i = 0; i <= (NUMBER_OF_INTERVALS - 1); i++) {
    counter += increament;
    notches.push({
      value: Math.round(counter * 100) / 100,
      percent: toPercentage(counter),
    });
  }
  return notches;
})

// ---------------------------
//   Thumb Input event vlaues
// ---------------------------
const onAlertBelowInput = thumbManager(alertBelow, alertBelowRange);
const onWarnBelowInput = thumbManager(warnBelow, warnBelowRange);
const onWarnAboveInput = thumbManager(warnAbove, warnAboveRange);
const onAlertAboveInput = thumbManager(alertAbove, alertAboveRange);


</script>
<template>
    <div class="multi-thumb-slider">
        <!-- Slider Track -->
        <div class="track-section">
            <!-- Background track style -->
            <div class="track" :style="trackCSS"></div>
            <!-- Alert Below thumb input -->
            <input
                type="range"
                class="thumb thumb-alert-below"
                :class="{'is-active': activeThumb === 'alertBelow'}"
                :min="min"
                :max="max"
                :step="step"
                :value="alertBelow"
                @input="onAlertBelowInput"
                @pointerdown="activeThumb = 'alertBelow'"
                @focus="activeThumb = 'alertBelow'"
                aria-label="Alert Below"
            />
            <!-- Warn Below thumb input -->
            <input
                type="range"
                class="thumb thumb-warn-below"
                :class="{'is-active' : activeThumb === 'warnBelow'}"
                :min="min"
                :max="max"
                :step="step"
                :value="warnBelow"
                @input="onWarnBelowInput"
                @pointerdown="activeThumb = 'warnBelow'"
                @focus="activeThumb = 'warnBelow'"
                aria-label="Warn Below"
            />
            <!-- Warn Above thumb input -->
            <input
                type="range"
                class="thumb thumb-warn-above"
                :class="{'is-active' : activeThumb === 'warnAbove'}"
                :min="min"
                :max="max"
                :step="step"
                :value="warnAbove"
                @input="onWarnAboveInput"
                @pointerdown="activeThumb = 'warnAbove'"
                @focus="activeThumb = 'warnAbove'"
                aria-label="Warn Above"
            />
            <!-- Alert Above thumb input -->
            <input
                type="range"
                class="thumb thumb-alert-above"
                :class="{'is-active': activeThumb === 'alertAbove'}"
                :min="min"
                :max="max"
                :step="step"
                :value="alertAbove"
                @input="onAlertAboveInput"
                @pointerdown="activeThumb = 'alertAbove'"
                @focus="activeThumb = 'alertAbove'"
                aria-label="Alert Above"
            />
        </div>
        <div class="scale-labels">
            <span
                v-for="notch in scaledNotches"
                :key="notch.value"
                class="scale-notch"
                :style="{ left: `${notch.percent}%` }"
            >
                {{notch.value}}
            </span>
        </div>
        <!-- Number Inputs for each thumb on the same line -->
        <div class="number-row">

            <!-- Alert Below number input -->
            <label class="number-input alert-number">
                <span>Alert Below</span>
                <input
                    type="number"
                    :min="alertBelowRange.min"
                    :max="alertBelowRange.max"
                    :step="step"
                    :value="alertBelow"
                    @change="onAlertBelowInput"
                />
            </label>
            <!-- Warn Below number input -->
            <label class="number-input warn-number">
                <span>Warn Below</span>
                <input
                    type="number"
                    :min="warnBelowRange.min"
                    :max="warnBelowRange.max"
                    :step="step"
                    :value="warnBelow"
                    @change="onWarnBelowInput"
                />
            </label>
            <!-- Warn Above number input -->
            <label class="number-input warn-number">
                <span>Warn Above</span>
                <input
                type="number"
                :min="warnAboveRange.min"
                :max="warnAboveRange.max"
                :step="step"
                :value="warnAbove"
                @change="onWarnAboveInput"
                />
            </label>
            <!-- Alert Above number input -->
            <label class="number-input alert-number">
                <span>Alert Above</span>
                <input
                    type="number"
                    :min="alertAboveRange.min"
                    :max="alertAboveRange.max"
                    :step="step"
                    :value="alertAbove"
                    @change="onAlertAboveInput"
                />
            </label>
        </div>
    </div>
</template>
<style scoped>
    .multi-thumb-slider {
        --track-height: 0.5rem;
        --thumb-size: 1rem;
        --track-inset: calc(var(--thumb-size) / 2);
        width: 100%;
        padding-bottom: 2rem;
    }

    .track-section{
        position: relative;
        height: var(--thumb-size);
        display: flex;
        align-items: center;
    }

    /* Shares on visable track and makes the other ones Invisible */
    .track {
        position: absolute;
        left: var(--track-inset);
        right: var(--track-inset);
        height: var(--track-height);
        border-radius: 999px;
    }

    /*  one visable track that is shared by 4 thumb inputs */
    .thumb {
        position: absolute;
        left: 0;
        right: 0;
        width: 100%;
        margin: 0;
        appearance: none;
        background: transparent;
        pointer-events: none;
    }
    .thumb:focus {
        outline: none;
    }

    .thumb-alert-below, .thumb-alert-above {
        z-index: 1;
    }

    .thumb-warn-below, .thumb-warn-above {
        z-index: 2;
    }

    .thumb.is-active {
      z-index: 5;
    }

    /* Make the thumb tracks invisable so only the main track is showing */
    /* Chrome and Safari */
    .thumb::-webkit-slider-runnable-track {
      appearance: none;
      height: var(--track-height);
      background: transparent;
    }

    /* Firefox */
    .thumb::-moz-range-track {
      appearance: none;
      height: var(--track-height);
      background: transparent;
      border: none;
    }

    /*CSS for the thumb for different browsers*/
    /*Chrome and Safari*/
    .thumb::-webkit-slider-thumb {
        appearance: none;
        pointer-events: auto;
        box-sizing: border-box;
        width: var(--thumb-size);
        height: var(--thumb-size);
        margin-top: calc((var(--track-height) - var(--thumb-size))/ 2);
        border-radius: 999px;
        background: var(--thumb-bg);
        border: 2px solid var(--button-hover);
        cursor: grab;
    }

    /*Firefox*/
    .thumb::-moz-range-thumb {
        pointer-events: auto;
        box-sizing: border-box;
        width: var(--thumb-size);
        height: var(--thumb-size);
        border-radius: 999px;
        background: var(--thumb-bg);
        border: 2px solid var(--button-hover);
        cursor: grab;
    }

    /*Thumb CSS when in active state*/
    .thumb.is-active::-webkit-slider-thumb,
    .thumb.is-active::-moz-range-thumb {
      cursor: grabbing;
      border: 2px solid var(--nav-bg);
      box-shadow: 0 0 0 2px var(--nav-bg);
    }
    /* Thumb background*/
    /*Chrome and Safari*/
    .thumb-alert-below::-webkit-slider-thumb, .thumb-alert-above::-webkit-slider-thumb,
    .thumb-alert-below::-moz-range-thumb, .thumb-alert-above::-moz-range-thumb {
        background: var(--thumb-bg-alert);
    }

    /*Firefox*/
    .thumb-warn-below::-webkit-slider-thumb, .thumb-warn-above::-webkit-slider-thumb,
    .thumb-warn-below::-moz-range-thumb, .thumb-warn-above::-moz-range-thumb {
        background: var(--thumb-bg-warn);
    }

    .number-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 1rem;
        margin-left: 2rem;
        margin-right: 2rem;
    }

    .number-input {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-size: 10pt;
        font-weight: 600;
        gap: 0.3rem;

    }

    .number-input input {
        width: 4.5rem;
        padding: 0.25rem;
        border-radius: 0.5rem;
        background-color: var(--bs-body-bg);
        color: var(--bs-body-color);
    }

    .alert-number input {
        border: 3px solid var(--range-alert);
    }

    .warn-number input {
        border: 3px solid var(--range-warn);
    }

    .scale-labels {
        position: relative;
        height: 1.5rem;
        margin: 0 var(--track-inset) 0;
    }

    .scale-notch {
        position: absolute;
        transform: translateX(-50%);
        font-size: 1rem;
        color: var(--bs-body-color);
    }

    .scale-notch::before {
        content: "";
        position: absolute;
        top: -1rem;
        left: 50%;
        width: 2px;
        height: 1rem;
        background: currentColor;
    }

</style>
