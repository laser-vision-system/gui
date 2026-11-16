<!-- This component is for the confirmation pop up window
    which acts as a stop gap for any miss inputs the user may have
    it should be used as a precaution for inputs that may have a critical impact on the system
-->
<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

// --------------------
//   Props
// --------------------
// Variables that are passed down from parent component
const props = defineProps({
  // Bool to show the confirm window
  modelValue: { type: Boolean, default: false },
  // Custom confirmation message
  message: { type: String, required: true },
  // Custom confirm button message (if needed)
  confirmButtonText: { type: String, default: 'Confirm' },
  // Custom cancel button (if needed)
  cancelButtonText: { type: String, default: 'Cancel' },
  // The function that is executed on confirmation
  onConfirmFunction: { type: Function, default: null }
});
// --------------------
//   Emits
// --------------------
// Variables that are passed up from this component
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

// --------------------
//   References / state
// --------------------
const dialog = ref(null);
const cancelButton = ref(null);
// Element that had focus before the window opened (restored on close)
let previouslyElement = null

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')
// --------------------
//        Methods
// --------------------
// deselect active inputs
function deselectInputs() {
  const active = document.activeElement
  if (active && active !== document.body && typeof active.blur === 'function') {
    previouslyElement = active
    active.blur()
  } else {
    previouslyElement = null
  }
  // Clear any highlighted text (including selected text inside inputs)
  window.getSelection()?.removeAllRanges()
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    onCancel()
    return
  }
  if (event.key !== 'Tab' || !dialog.value) return

  const focusable = Array.from(dialog.value.querySelectorAll(FOCUSABLE_SELECTOR))
  if (focusable.length === 0) {
    event.preventDefault()
    dialog.value.focus()
    return
  }
}
// Function to handle confirmation event
function onConfirm() {
  // execute function
  if (typeof props.onConfirmFunction === 'function') {
    props.onConfirmFunction()
  }
  // emits
  emit('confirm')
  // reset visibilityState on event
  emit('update:modelValue', false)
}
// Function that handles cancel event
function onCancel() {
  // emits
  emit('cancel')
  // reset visibilityState on event
  emit('update:modelValue', false)
}

// --------------------
//   Focus management
// --------------------
  watch(
    () => props.modelValue,
    async (isOpen, wasOpen) => {
      if (isOpen) {
        deselectInputs()
        // wait for the dialog to render, then move focus into it
        await nextTick()
          // Cancel is the default for a critical action
        ;(cancelButton.value || dialog.value)?.focus()
      } else if (wasOpen) {
        // return focus to where the user was
        previouslyElement?.focus?.();
        previouslyElement = null;
      }
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    if (props.modelValue) {
      previouslyElement?.focus?.()
      previouslyElement = null
    }
  });
</script>
<template>
    <teleport to="body">
        <div v-if="modelValue" class="confirmation-window" @click.self="onCancel">
            <div
                class="confirm-box"
                ref="dialog"
                role="dialog"
                aria-modal="true"
                aria-describedby="confirm-message"
                tabindex="-1"
                @keydown="onKeydown"
            >
                <p class="confirm-message">{{message}}</p>
                <div class="confirm-options">
                    <button class="btn btn-success" @click="onConfirm">
                        {{confirmButtonText}}
                    </button>
                    <button class="btn btn-danger" @click="onCancel">
                        {{cancelButtonText}}
                    </button>
                </div>
            </div>
        </div>
    </teleport>
</template>
<style scoped>
.confirmation-window {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
.confirm-message {
  margin: 0 0 20px;
  font-size: 18px;
  color: white;
}
.confirm-options {
  display: flex;
  justify-content: center;
  gap: 2em;
  font-size: 18px;
}
.confirm-box:focus,
.confirm-box:focus-visible {
  outline: none;
}
</style>
