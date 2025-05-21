import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAccountStore = defineStore('account', () => {
  const accounts = ref([]); // アカウント名配列
  const selectedAccount = ref('');

  function setAccounts(list) {
    accounts.value = list;
    if (!selectedAccount.value && list.length > 0) {
      selectedAccount.value = list[0];
    }
  }
  function setSelectedAccount(name) {
    selectedAccount.value = name;
  }

  return { accounts, selectedAccount, setAccounts, setSelectedAccount };
});
