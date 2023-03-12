<template lang="pug">
#status(v-if="!!app")
	h1 {{app.name}} status
	.row(v-if="overview")
		.card.accent.m-4
			h2 Overview
			.row
				.mx-4
					h2 Active users
					span.large {{overview.currentUsers}}
				.mx-4
					h2 Server errors
					span.large {{logCount.server['3'] ?? 0}}
				.mx-4
					h2 Client errors
					span.large {{logCount.client['3'] ?? 0}}
			.m-4
				RouterLink.btn(:to="{name: 'feedback', params: {id: $route.params.id}}") Feedback
				RouterLink.btn(:to="{name: 'system', params: {id: $route.params.id}}") System
				RouterLink.btn(:to="{name: 'settings', params: {id: $route.params.id}}") Settings
		.card.m-4
			h2 Page views
			TimedChart(:data="viewsChart")
			RouterLink.btn(:to="{name: 'audience', params: {id: $route.params.id}}") View audience
		.card.m-4
			h2 Server logs
			TimedChart(:data="serverChart")
			RouterLink.btn(:to="{name: 'logs', params: {id: $route.params.id, type: 'server'}}") View server logs
		.card.m-4
			h2 Client logs
			TimedChart(:data="clientChart")
			RouterLink.btn(:to="{name: 'logs', params: {id: $route.params.id, type: 'client'}}") View client logs
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

const colors = {
	debug: '#4f46e5',
	info: '#059669',
	warning: '#ca8a04',
	error: '#ea580c',
	critical: '#e11d48'
};

const serverChart = computed(() => [
	{
		label: 'Debug logs',
		color: colors.debug,
		data: overview.value.serverLogs['0']
	},
	{
		label: 'Info logs',
		color: colors.info,
		data: overview.value.serverLogs['1']
	},
	{
		label: 'Warnings',
		color: colors.warning,
		data: overview.value.serverLogs['2']
	},
	{
		label: 'Errors',
		color: colors.error,
		data: overview.value.serverLogs['3']
	},
	{
		label: 'Critical',
		color: colors.critical,
		data: overview.value.serverLogs['4']
	}
]);
const clientChart = computed(() => [
	{
		label: 'Debug logs',
		color: colors.debug,
		data: overview.value.clientLogs['0']
	},
	{
		label: 'Info logs',
		color: colors.info,
		data: overview.value.clientLogs['1']
	},
	{
		label: 'Warnings',
		color: colors.warning,
		data: overview.value.clientLogs['2']
	},
	{
		label: 'Errors',
		color: colors.error,
		data: overview.value.clientLogs['3']
	},
	{
		label: 'Critical',
		color: colors.critical,
		data: overview.value.clientLogs['4']
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
					prev[k] = Object.keys(overview.value.serverLogs[k]).reduce<number>(
						(prev1, k1) => prev1 + overview.value.serverLogs[k][k1],
						0
					);
					return prev;
			  }, {})
			: null,
		client: overview.value.clientLogs
			? Object.keys(overview.value.clientLogs).reduce<{[key: string]: number}>((prev, k) => {
					prev[k] = Object.keys(overview.value.clientLogs[k]).reduce<number>(
						(prev1, k1) => prev1 + overview.value.clientLogs[k][k1],
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
	flex-basis: 500px;
}
</style>
