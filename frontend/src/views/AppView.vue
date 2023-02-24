<template lang="pug">
#apps
	#apps-container.card(v-if="apps.length")
		h1.text-2xl.font-bold.mb-4 Your apps
		RouterLink(v-for="app in apps" :key="app.id" :to="{name: 'audience', params: {id: app.id}}") {{app.name}}
		.d-flex
			button.mt-4 Add an app
	div(v-else)
		.jumbotron
			h2 Seems like here are no apps yet!
			p Add an app to start
			p.new-website-btn.btn.btn-success Add an app
</template>

<script setup lang="ts">
import {ref} from 'vue';
import type {App} from '../scripts/types';
import Api from '../scripts/api';

const apps = ref<App[]>([]);

Api.apps.getAll().then((a) => (apps.value = a));
</script>

<style scoped></style>
