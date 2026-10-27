<!-- This component provides a icon when clicked shows a text box relative to the icons location on the dom
    This is used for explaining more complex parts of the interface, providing useful information on
    what parts of the system the given input dictates, e.g. what the each vision processing label does.

    They can be closed by clicking outside a pop up or by clicking the escape button

-->
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

.hint-box{
    position: absolute;
    top: calc(100% + 8px);
    z-index: 100;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: max-content;
    max-width: min(260px, 80vw);
    max-height: 144px;
    padding: 10px 6px 10px 14px;
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
    max-height: 118px;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 8px;
    font-size: 10.5pt;
    line-height: 1.2;
}

.hint-fade-enter-active, .hint-fade-leave-active {
  transition: opacity 0.15s ease;
}
.hint-fade-enter-from, .hint-fade-leave-to {
  opacity: 0;
}
</style>
