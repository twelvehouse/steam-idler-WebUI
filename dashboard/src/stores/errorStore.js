import { reactive, readonly } from 'vue';

const state = reactive({
  message: null,
  type: 'error', // 'error' or 'success' or 'info'
  id: null, // To allow multiple unique messages if needed, or to force re-render
});

let timeoutId = null;

export const errorStore = readonly(state);

export function setError(newMessage, type = 'error', duration = 5000) {
  state.message = newMessage;
  state.type = type;
  state.id = Date.now(); // Force reactivity

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (duration !== null) {
    timeoutId = setTimeout((){
      clearError();
    }, duration);
  }
}

export function setSuccess(newMessage, duration = 3000) {
    setError(newMessage, 'success', duration);
}

export function setInfo(newMessage, duration = 3000) {
    setError(newMessage, 'info', duration);
}

export function clearError() {
  state.message = null;
  state.type = 'error';
  state.id = null;
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}
