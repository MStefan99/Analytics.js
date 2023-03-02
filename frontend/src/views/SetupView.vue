<template lang="pug">
#setup(v-if="app")
	h1 App setup
	.card.accent
		h2 Audience
		p.mb-4 To start collecting audience data, please add the following script to every page of your website:
		pre.code.script.
			&lt;script async src="{{appState.backendURL + '/cc?k=' + app.audienceKey}}"&gt;
			&lt;script&gt;
				window.cc = window.cc || [];

				window.cc.pop();
			&lt;/script&gt;
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {useRoute} from 'vue-router';
import type {App} from '../scripts/types';
import Api from '../scripts/api';
import appState from '../scripts/store';

const route = useRoute();
const app = ref<App | null>(null);

Api.apps.getByID(+route.params.id).then((a) => (app.value = a));
</script>

<style scoped></style>
