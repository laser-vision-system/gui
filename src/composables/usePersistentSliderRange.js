import { ref } from 'vue';

const DEFAULTS = { min: 80, max: 120 };
const STORAGE_KEY = 'multi-thumb-slider-range';

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Number.isFinite(saved.min) && Number.isFinite(saved.max)) {
      return { min: saved.min, max: saved.max };
    }
  } catch (e) {
    console.warn("Could not load saved sliders range", e);
  }
  return { ...DEFAULTS };
}
// Module level singlton
const sliderRange = ref(load());
// shared functions
export function usePersistentSliderRange() {
  // saves the sliderRange of the deviation
  const saveDeviationSliderRange = () => {
    if (sliderRange.value.min >= sliderRange.value.max) {
      sliderRange.value.min -= 1;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sliderRange.value));
      return true;
    } catch (e) {
      console.warn('unable to save the slides range values', e);
      return false;
    }
  }

  // sets the min and max values to the last save values in the local storage
  const revertDeviationSliderRange = () =>{
    sliderRange.value = load();
  }

  // sets the min and max values to the defualt values that are hard coded.
  const resetDeviationSliderRange = () => {
    sliderRange.value = { ...DEFAULTS };
  }

  return {
    sliderRange,
    saveDeviationSliderRange,
    revertDeviationSliderRange,
    resetDeviationSliderRange
  };
}
