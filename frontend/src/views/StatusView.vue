<template lang="pug">
#status(v-if="!!app")
	h1 {{app.name}} status
	.row(v-if="overview")
		.card.accent.m-4
			h2 Overview
			.row
				.mx-4
					h2 Active users
					span.large {{currentUsers}}
				.mx-4
					h2 Server errors
					span.large {{(logCount.server['3'] || 0) + (logCount.server['4'] || 0)}}
				.mx-4
					h2 Client errors
					span.large {{(logCount.client['3'] || 0) + (logCount.client['4'] || 0)}}
			.m-4
				RouterLink.btn(:to="{name: 'feedback', params: {id: $route.params.id}}") Feedback
				RouterLink.btn(:to="{name: 'system', params: {id: $route.params.id}}") System
				RouterLink.btn(:to="{name: 'settings', params: {id: $route.params.id}}") Settings
		.card.m-4
			h2 Audience
			TimedChart(:data="audienceDataset" :y-stacked="false" :step-size="1000 * 60")
			.flex.gap-2
				RouterLink.btn.grow(:to="{name: 'audience-today', params: {id: $route.params.id}}") View audience today
				RouterLink.btn.grow(:to="{name: 'audience-history', params: {id: $route.params.id}}") View audience history
		.card.m-4
			h2 Server logs
			TimedChart(:data="serverLogsDataset" :step-size="1000 * 60")
			RouterLink.btn(:to="{name: 'logs', params: {id: $route.params.id, type: 'server'}}") View server logs
		.card.m-4
			h2 Client logs
			TimedChart(:data="clientLogsDataset" :step-size="1000 * 60")
			RouterLink.btn(:to="{name: 'logs', params: {id: $route.params.id, type: 'client'}}") View client logs
</template>

<script setup lang="ts">
import {computed, onUnmounted, ref} from 'vue';
import type {App, Overview} from '../scripts/types';
import Api from '../scripts/api';
import {useRoute} from 'vue-router';
import TimedChart from '../components/TimedChart.vue';
import {alert, PopupColor} from '../scripts/popups';

const app = ref<App | null>(null);
const overview = ref<Overview | null>(null);
const route = useRoute();

const colors = {
	debug: '#4f46e5',
	info: '#059669',
	warning: '#ca8a04',
	error: '#ea580c',
	critical: '#e11d48'
};

const serverLogsDataset = computed(() => [
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
const clientLogsDataset = computed(() => [
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
const audienceDataset = computed(() => [
	{
		label: 'Users',
		color: '#ef8105',
		data: overview.value.users
	},
	{
		label: 'Page views',
		color: '#44c40c',
		data: overview.value.views
	}
]);

const logCount = computed(() => {
	return {
		server: Object.keys(overview.value?.serverLogs).reduce<{[key: string]: number}>((prev, k) => {
			prev[k] = Object.keys(overview.value.serverLogs[k]).reduce<number>(
				(prev1, k1) => prev1 + overview.value.serverLogs[k][k1],
				0
			);
			return prev;
		}, {}),
		client: Object.keys(overview.value?.clientLogs).reduce<{[key: string]: number}>((prev, k) => {
			prev[k] = Object.keys(overview.value.clientLogs[k]).reduce<number>(
				(prev1, k1) => prev1 + overview.value.clientLogs[k][k1],
				0
			);
			return prev;
		}, {})
	};
});
const currentUsers = computed(() => {
	const keys = Object.keys(overview.value.users);

	const lastInterval = keys.length ? keys[keys.length - 1] : null;
	return Date.now() - +lastInterval < 1000 * 60 ? overview.value.users[lastInterval] : 0;
});

Api.apps
	.getByID(+route.params.id)
	.then((a) => {
		app.value = a;
		window.document.title = a.name + ' status | Crash Course';
	})
	.catch((err) => alert('Failed to load app', PopupColor.Red, err.message));

function loadOverview() {
	Api.apps.getOverview(+route.params.id).then((o) => (overview.value = o));
}

loadOverview();

const refreshInterval = setInterval(loadOverview, 1000 * 10);
onUnmounted(() => clearInterval(refreshInterval));
</script>

<style>
.row .card {
	flex-basis: 500px;
}
</style>
