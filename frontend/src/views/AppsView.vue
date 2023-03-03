<template lang="pug">
#apps
	h1 Your apps
	#apps-container(v-if="apps.length")
		RouterLink.block.card.my-4(
			v-for="app in apps"
			:key="app.id"
			:to="{name: 'overview', params: {id: app.id}}")
			h2 {{app.name}}
			p {{app.description}}
		.d-flex
			button.mt-4 Add an app
	div(v-else)
		.card
			h2 No apps yet
			p Add an app to start
			button.mt-4 Add an app
</template>

<script setup lang="ts">
import {ref} from 'vue';
import type {App} from '../scripts/types';
import Api from '../scripts/api';

const apps = ref<App[]>([]);

Api.apps.getAll().then((a) => (apps.value = a));
</script>

<style scoped></style>
