<script setup>
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
  onConfirmFunction: {type: Function, default: null}
})
// --------------------
//   Emits
// --------------------
// Variables that are passed up from this component
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

// --------------------
//        Methods
// --------------------
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

</script>
<template>
    <teleport to="body">
        <div v-if="modelValue" class="confirmation-window" @click.self="onCancel">
            <div class="confirm-box" role="dialog" aria-modal="true">
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
</style>
