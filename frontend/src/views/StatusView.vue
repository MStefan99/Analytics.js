<template lang="pug">
#overview(v-if="!!app")
	h1 {{app.name}} status
	.row(v-if="overview")
		.row.card.accent
			.mx-4
				h2 Active users
				span.large {{overview.currentUsers}}
			.mx-4
				h2 Server errors
				span.large {{logCount.server['3'] ?? 0}}
			.mx-4
				h2 Client errors
				span.large {{logCount.client['3'] ?? 0}}
		.card
			h2 Page views
			TimedChart(:data="viewsChart")
			RouterLink(:to="{name: 'audience', params: {id: $route.params.id}}") View audience
		.card
			h2 Server logs
			TimedChart(:data="serverChart")
			RouterLink(:to="{name: 'logs', params: {id: $route.params.id, type: 'server'}}") View server logs
		.card
			h2 Client logs
			TimedChart(:data="clientChart")
			RouterLink(:to="{name: 'logs', params: {id: $route.params.id, type: 'client'}}") View client logs
</template>

<script setup lang="ts">
import {computed, onUnmounted, ref} from 'vue';
import type {App, AppOverview} from '../scripts/types';
import Api from '../scripts/api';
import {useRoute} from 'vue-router';
import TimedChart from '../components/TimedChart.vue';

const app = ref<App | null>(null);
const overview = ref<AppOverview | null>(null);
const route = useRoute();

const serverChart = computed(() => [
	{
		label: 'Debug logs',
		color: '#0967c5',
		data: overview.value.serverLogs['0']
	},
	{
		label: 'Info logs',
		color: '#44c40c',
		data: overview.value.serverLogs['1']
	},
	{
		label: 'Warnings',
		color: '#ef8105',
		data: overview.value.serverLogs['2']
	},
	{
		label: 'Errors',
		color: '#f10962',
		data: overview.value.serverLogs['3']
	}
]);
const clientChart = computed(() => [
	{
		label: 'Debug logs',
		color: '#0967c5',
		data: overview.value.clientLogs['0']
	},
	{
		label: 'Info logs',
		color: '#44c40c',
		data: overview.value.clientLogs['1']
	},
	{
		label: 'Warnings',
		color: '#ef8105',
		data: overview.value.clientLogs['2']
	},
	{
		label: 'Errors',
		color: '#f10962',
		data: overview.value.clientLogs['3']
	}
]);
const viewsChart = computed(() => [
	{
		label: 'Page views',
		color: '#44c40c',
		data: overview.value.sessions
	}
]);
const logCount = computed(() => {
	return {
		server: overview.value.serverLogs
			? Object.keys(overview.value.serverLogs).reduce<{[key: string]: number}>((prev, k) => {
					prev[k] = Object.keys(overview.value.serverLogs[Number(k)]).reduce<number>(
						(prev1, k1) => prev1 + overview.value.serverLogs[Number(k)][Number(k1)],
						0
					);
					return prev;
			  }, {})
			: null,
		client: overview.value.clientLogs
			? Object.keys(overview.value.clientLogs).reduce<{[key: string]: number}>((prev, k) => {
					prev[k] = Object.keys(overview.value.clientLogs[Number(k)]).reduce<number>(
						(prev1, k1) => prev1 + overview.value.clientLogs[Number(k)][Number(k1)],
						0
					);
					return prev;
			  }, {})
			: null
	};
});

Api.apps.getByID(+route.params.id).then((a) => (app.value = a));
Api.apps.getOverview(+route.params.id).then((o) => (overview.value = o));
const interval = setInterval(
	() => Api.apps.getOverview(+route.params.id).then((o) => (overview.value = o)),
	1000 * 30
);

onUnmounted(() => clearInterval(interval));
</script>

<style>
.row .card {
	@apply basis-1/3;
}
</style>
