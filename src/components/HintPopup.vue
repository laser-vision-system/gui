<script>
let hintCount = 0;
</script>
<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import hintIcon from '../assets/images/book-question-mark-24-filled.svg'
// --------------------
//        Props
// --------------------
// Variables that are passed down from parent component
const props = defineProps({
  message: { type: String, required: true },
  size: { type: Number, default: 24 },
  align: {
    type: String,
    default: 'center',
    validator: (value) => ['center', 'left', 'right'].includes(value),
  },
});

// --------------------
//      Ref Values
// --------------------
// Constant references to values
const showPopup = ref(false);
const root = ref(null);
const boxID = `hint-box-${++hintCount}`;

// --------------------
//      Functions
// --------------------

// toggles the popup
function togglePopup() {
  showPopup.value = !showPopup.value;
}

// Close the pop up when the user clicks outside the box.
function closeOnClick(event) {
  if (root.value && !root.value.contains(event.target)) {
    showPopup.value = false;
  }
}

function closeOnEscp(event) {
  if (event.key === 'Escape') showPopup.value = false;
}

// clean up and remove listeners when the pop up is closed
function removeListeners() {
  document.removeEventListener('click', closeOnClick);
  document.removeEventListener('keydown', closeOnEscp);

}

// --------------------
//      Watchers
// --------------------
watch(showPopup, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', closeOnClick);
    document.addEventListener('keydown', closeOnEscp);
  } else {
    removeListeners();
  }
});

// --------------------
//    Mount Conditions
// --------------------
onBeforeUnmount(removeListeners);
</script>
<template>
<div ref="root" class="hint">
    <button type="button" class="hint-button" aria-label="Show Hint"
        :aria-expanded="showPopup" :aria-controls="boxID" @click="togglePopup">
        <img :src="hintIcon" alt="" class="hint-image"
            :style="{ width: size + 'px', height: size + 'px' }" />
    </button>
    <transition name="hint-fade">
        <div v-if="showPopup" class="hint-box"
            :id="boxID" :class="`hint-box--${align}`" role="tooltip">
            <p class="hint-message">{{message}}</p>
        </div>
    </transition>
</div>
</template>
<style scoped>
.hint {
  position: relative;
  display: inline-block;
  vertical-align: middle;
}

.hint-image {
    display: block;
    filter: var(--filter-background);
}

.hint-button {
  display: block;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.hint-box{
    position: absolute;
    top: calc(100% + 8px);
    z-index: 100;
    width: max-content;
    max-width: min(260px, 80vw);
    padding: 10px 14px;
    border-radius: 8px;
    background: var(--bs-body-bg);
    color: var(--bs-body-color);
    border: 3px solid var(--button-hover);
    box-shadow: 0 5px 20px var(--nav-bg);
}
/* Alignment variants */
.hint-box--center { left: 50%; transform: translateX(-50%); }
.hint-box--left   { left: 0; }
.hint-box--right  { right: 0; }

.hint-message{
    margin: 0;
    font-size: 8pt;
    line-height: 1.2;
}

.hint-fade-enter-active, .hint-fade-leave-active {
  transition: opacity 0.15s ease;
}
.hint-fade-enter-from, .hint-fade-leave-to {
  opacity: 0;
}
</style>
