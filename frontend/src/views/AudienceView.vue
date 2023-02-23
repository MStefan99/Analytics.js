<template lang="pug">
div(v-if="!!app")
	h1 {{app.name}} audience
	#overview
		#overview.audience-card.max-w-sm(v-if="overview")
			h2 Overview
			p Server logs
			TimedChart(:data="serverChart")
			p Client logs
			TimedChart(:data="clientChart")
		#realtime-audience.audience-card(v-if="realtimeAudience")
			h2 Audience now
			TimedChart(:data="viewsChart" color="#ffffff")
			p Active users
			p#active-users.accent {{realtimeAudience.currentUsers}}
			p Most popular pages
			table
				thead
					tr
						td Page
						td Views
				tbody
					tr(v-for="page of pages" :key="page.url")
						td
							a(:href="page.url") {{page.url}}
						td {{page.hits}}
				tbody#pages-table
			router-link.bold(:to="{name: 'realtime', params: {id: $route.params.id}}") Full report
		#today-audience.audience-card(v-if="todayAudience")
			h2 Audience today
			b Users
			p#today-users.accent {{todayAudience.users}}
			b Sessions
			p#today-sessions.accent {{todayAudience.sessions?.length}}
			b Bounce rate
			p#bounce-rate.accent {{Math.round(todayAudience.bounceRate * 100)}}%
			b Average session
			p#session-duration.accent {{avgSession(todayAudience.avgDuration)}}
			//a.bold(href="/today/" + website.id) Full report
</template>

<script setup lang="ts">
import {computed, ref} from 'vue';
import type {App, RealtimeAudience, DayAudience, AppOverview} from '../scripts/types';
import Api from '../scripts/api';
import {useRoute} from 'vue-router';
import TimedChart from '../components/TimedChart.vue';

const app = ref<App | null>(null);
const overview = ref<AppOverview | null>(null);
const realtimeAudience = ref<RealtimeAudience | null>(null);
const todayAudience = ref<DayAudience | null>(null);
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
		label: 'Info logs',
		color: '#44c40c',
		data: realtimeAudience.value.sessions
	}
]);

Api.apps.getByID(+route.params.id).then((a) => (app.value = a));
Api.apps.getOverview(+route.params.id).then((o) => (overview.value = o));
Api.apps.getRealtimeAudience(+route.params.id).then((a) => (realtimeAudience.value = a));
setInterval(
	() => Api.apps.getRealtimeAudience(+route.params.id).then((a) => (realtimeAudience.value = a)),
	1000 * 30
);
Api.apps.getTodayAudience(+route.params.id).then((a) => (todayAudience.value = a));

const pages = computed<{url: string; hits: number}[]>(() =>
	Object.keys(realtimeAudience.value.pages)
		.sort((k1, k2) => realtimeAudience.value.pages[k2] - realtimeAudience.value.pages[k1])
		.slice(0, 5)
		.map((k) => {
			return {url: k, hits: realtimeAudience.value.pages[k]};
		})
);

function avgSession(seconds: number): string {
	return Math.floor((seconds / 60 / 1000) % 60) + 'm ' + Math.floor((seconds / 1000) % 60) + 's';
}
</script>

<style></style>
