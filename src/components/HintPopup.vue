<!-- This component provides a icon when clicked shows a text box relative to the icons location on the dom
    This is used for explaining more complex parts of the interface, providing useful information on
    what parts of the system the given input dictates, e.g. what the each vision processing label does.

    They can be closed by clicking outside a pop up or by clicking the escape button

-->
<script>
let hintCount = 0;
</script>
<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
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
const root = ref(null); // The warper around the icon button
const popup = ref(null); // the teleported hint box
const popupStyle = ref({top: '0px', left: '0px'})
const boxID = `hint-box-${++hintCount}`;

const GAP = 8; // space between icon and popup
const MARGIN = 8; // min space between popup and viewport

// --------------------
//      Functions
// --------------------

// toggles the popup
function togglePopup() {
  showPopup.value = !showPopup.value;
}

// function to update the popups position in relation to the icon.
function updatePosition() {
  if (!root.value || !popup.value) return;

  const iconRect = root.value.getBoundingClientRect();
  const popupRect = popup.value.getBoundingClientRect();

  // horizontal calc for the popup
  let x;
  if (props.align === 'left') x = iconRect.left;
  else if (props.align === 'right') x = iconRect.right - popupRect.width;
  else x = iconRect.left + iconRect.width / 2 - popupRect.width / 2;

  // restrain the popup in the viewport
  x = Math.max(MARGIN, Math.min(x, window.innerWidth - popupRect.width - MARGIN));

  let y = iconRect.bottom + GAP;

  // update the style values
  popupStyle.value = { top: `${y}px`, left: `${x}px` };

}

// Close the pop up when the user clicks outside the box.
function closeOnClick(event) {
  const target = event.target;
  const insideIcon = root.value && root.value.contains(target);
  const insidePopup = popup.value && popup.value.contains(target);
  if (!insideIcon && !insidePopup) showPopup.value = false;
}

function closeOnEscp(event) {
  if (event.key === 'Escape') showPopup.value = false;
}

// init event listeners
function addListeners() {
  document.addEventListener('click', closeOnClick);
  document.addEventListener('keydown', closeOnEscp);
  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', updatePosition, true);
}

// clean up and remove listeners when the pop up is closed
function removeListeners() {
  document.removeEventListener('click', closeOnClick);
  document.removeEventListener('keydown', closeOnEscp);
  window.removeEventListener('resize', updatePosition);
  window.removeEventListener('scroll', updatePosition, true);
}

// --------------------
//      Watchers
// --------------------
watch(showPopup, async (isOpen) => {
  if (isOpen) {
    addListeners();
    await nextTick();
    updatePosition();
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
    <Teleport to="body">
        <Transition name="hint-fade">
            <div v-if="showPopup" ref="popup" class="hint-box"
                :id="boxID" :style="popupStyle" role="tooltip">
                <p class="hint-message">{{message}}</p>
            </div>
        </Transition>
    </Teleport>

</div>
</template>
<style scoped>
.hint {
  position: relative;
  display: inline-block;
  vertical-align: middle;
}

.hint-box{
    position: fixed;
    z-index: 2000;
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
