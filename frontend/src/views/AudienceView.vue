<template lang="pug">
#audience(v-if="app")
	h1 {{app.name}} audience
	.row
		.card.accent.m-4(v-if="realtimeAudience")
			h2 Audience now
			TimedChart(:data="viewsChart" color="#ffffff")
			h3 Active users
			p#active-users.large {{realtimeAudience.currentUsers}}
		.card.m-4(v-if="todayAudience")
			h2 Audience today
			p Users
			p#today-users.large {{todayAudience.users}}
			p Sessions
			p#today-sessions.large {{todayAudience.sessions?.length}}
			p Bounce rate
			p#bounce-rate.large {{Math.round(todayAudience.bounceRate * 100)}}%
			p Average session
			p#session-duration.large {{avgSession(todayAudience.avgDuration)}}
		.card.m-4
			h2 Traffic
			h3 Most popular pages
			table.cells(v-if="pages")
				thead
					tr
						td Page
						td Views
				tbody
					tr(v-for="page of pages" :key="page.url")
						td
							a.underline(:href="page.url") {{page.url}}
						td {{page.hits}}
			h3 Top referrals
			table.cells(v-if="referrers")
				thead
					tr
						td Source
						td Count
				tbody
					tr(v-for="referrer of referrers" :key="referrer.url")
						td
							a.underline(:href="referrer.url || undefined") {{referrer.url || 'Unknown'}}
						td {{referrer.count}}
</template>

<script setup lang="ts">
import {computed, onUnmounted, ref} from 'vue';
import {useRoute} from 'vue-router';

import Api from '../scripts/api';
import type {App, DayAudience, RealtimeAudience} from '../scripts/types';
import TimedChart from '../components/TimedChart.vue';

const route = useRoute();
const app = ref<App | null>(null);
const realtimeAudience = ref<RealtimeAudience | null>(null);
const todayAudience = ref<DayAudience | null>(null);

window.document.title = 'Audience | Crash Course';

const viewsChart = computed(() => [
	{
		label: 'Page views',
		color: '#44c40c',
		data: realtimeAudience.value.sessions
	}
]);

const pages = computed<{url: string; hits: number}[]>(() =>
	Object.keys(realtimeAudience.value?.pages ?? {})
		.sort((k1, k2) => realtimeAudience.value.pages[k2] - realtimeAudience.value.pages[k1])
		.slice(0, 5)
		.map((k) => {
			return {url: k, hits: realtimeAudience.value.pages[k]};
		})
);
const referrers = computed<{url: string; count: number}[]>(() =>
	Object.keys(realtimeAudience.value?.referrers ?? {})
		.sort((k1, k2) => realtimeAudience.value.referrers[k2] - realtimeAudience.value.referrers[k1])
		.slice(0, 5)
		.map((k) => {
			return {url: k, count: realtimeAudience.value.referrers[k]};
		})
);

function avgSession(seconds: number): string {
	return Math.floor((seconds / 60 / 1000) % 60) + 'm ' + Math.floor((seconds / 1000) % 60) + 's';
}

Api.apps.getByID(+route.params.id).then((a) => (app.value = a));
Api.apps.getRealtimeAudience(+route.params.id).then((a) => (realtimeAudience.value = a));
const interval = setInterval(
	() => Api.apps.getRealtimeAudience(+route.params.id).then((a) => (realtimeAudience.value = a)),
	1000 * 30
);
Api.apps.getTodayAudience(+route.params.id).then((a) => (todayAudience.value = a));

onUnmounted(() => clearInterval(interval));
</script>

<style scoped>
.row .card {
	flex-basis: 400px;
}
</style>
