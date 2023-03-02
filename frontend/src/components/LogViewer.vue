<template lang="pug">
.log-viewer
	table.cells
		thead
			tr
				th Tag
				th Time
				th Message
		tbody
			tr.log-row(:class="'log-' + log.level" v-for="log in logs" :key="log.time")
				td {{log.tag}}
				td {{new Date(log.time).toLocaleString()}}
				td.code {{log.message}}
</template>

<script setup lang="ts">
import {useRoute} from 'vue-router';
import {ref} from 'vue';
import type {Log} from '../scripts/types';
import Api from '../scripts/api';

const route = useRoute();
const logs = ref<Log[]>([]);

Api.apps
	.getLogs(+route.params.id, route.params.type === 'client' ? 'client' : 'server')
	.then((l) => (logs.value = l));
</script>

<style scoped></style>
