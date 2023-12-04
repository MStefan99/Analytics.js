<template lang="pug">
header.no-print.shadow-md
	NavBar

main
	RouterView(v-if="appState.user")
	div(v-else)
		p.text-red.text-xl Please sign in to use the app
	PopupContainer

footer
	img.footer-logo.mx-auto(src="/logo.svg" alt="Crash Course logo")
</template>

<script setup lang="ts">
import {onMounted} from 'vue';

import NavBar from './components/NavBar.vue';
import PopupContainer from './components/PopupContainer.vue';
import Api from './scripts/api';
import appState from './scripts/store';

onMounted(checkConnection);

function checkConnection() {
	Api.auth
		.me()
		.then((user) => {
			appState.setUser(user);
		})
		.catch((err) => console.warn('Not authenticated:', err));
}
</script>

<style></style>
