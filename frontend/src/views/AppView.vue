<template lang="pug">
h1 Your websites
.d-flex
	p.new-website-btn.btn.btn-outline-success Add website

#apps-container(v-if="apps.length")
	router-link(v-for="app in apps" :key="app.id" :to="{name: 'audience', params: {id: app.id}}") {{app.name}}
div(v-else)
	.jumbotron
		h2 Seems like here are no websites yet!
		p Add a website to start
		p.new-website-btn.btn.btn-success Add website
</template>

<script setup lang="ts">
import {ref} from 'vue';
import type {App} from '../scripts/types';
import Api from '../scripts/api';

const apps = ref<App[]>([]);

Api.apps.getAll().then((a) => (apps.value = a));
</script>

<style scoped></style>
