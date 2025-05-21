<template>
  <div v-if="errorStore.message" :class="['global-error-handler', `global-error--${errorStore.type}`]">
    <p>{{ errorStore.message }}</p>
    <button @click="clearError" class="dismiss-button">Dismiss</button>
  </div>
</template>

<script setup>
import { errorStore, clearError } from '@/stores/errorStore';
</script>

<style scoped>
.global-error-handler {
  position: fixed;
  top: 40px; /* Adjust based on global loading indicator height or other fixed elements */
  left: 50%;
  transform: translateX(-50%);
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9990; /* Below loading indicator but above most content */
  width: auto;
  max-width: 90%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: top 0.3s ease-in-out, opacity 0.3s ease-in-out;
}

.global-error--error {
  background-color: #f8d7da; /* Bootstrap danger red */
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.global-error--success {
  background-color: #d4edda; /* Bootstrap success green */
  color: #155724;
  border: 1px solid #c3e6cb;
}

.global-error--info {
  background-color: #d1ecf1; /* Bootstrap info blue */
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.global-error-handler p {
  margin: 0;
  margin-right: 20px;
  font-size: 0.95em;
}

.dismiss-button {
  background: none;
  border: 1px solid currentColor;
  color: inherit;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  opacity: 0.8;
}
.dismiss-button:hover {
  opacity: 1;
}
</style>
