<template lang="pug">
div(v-if="!!app")
	h1 {{app.name}} audience
	#overview
		#realtime-audience.audience-card(v-if="realtimeAudience")
			h2 Audience now
			p Active users
			p#active-users.accent {{realtimeAudience.currentUsers}}
			AudienceBars(:data="realtimeAudience.sessions")
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
			//a.bold(href="/realtime/" + website.id) Full report
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
import type {App, RealtimeAudience, DayAudience} from '../scripts/types';
import Api from '../scripts/api';
import {useRoute} from 'vue-router';
import AudienceBars from '../components/AudienceBars.vue';

const app = ref<App | null>(null);
const realtimeAudience = ref<RealtimeAudience | null>(null);
const todayAudience = ref<DayAudience | null>(null);
const route = useRoute();

Api.apps.getByID(+route.params.id).then((a) => (app.value = a));
Api.apps.getRealtimeAudience(+route.params.id).then((a) => (realtimeAudience.value = a));
Api.apps.getTodayAudience(+route.params.id).then((a) => (todayAudience.value = a));

const pages = computed<{url: string; hits: number}[]>(() =>
	Object.keys(realtimeAudience.value.pages)
		.sort((k1, k2) => realtimeAudience.value.pages[k2] - realtimeAudience.value.pages[k1])
		.slice(0, 5)
		.map((k) => {
			return {url: k, hits: realtimeAudience.value.pages[k]};
		})
);

setTimeout(() => console.log(pages.value), 100);

function avgSession(seconds: number): string {
	return Math.floor((seconds / 60 / 1000) % 60) + 'm ' + Math.floor((seconds / 1000) % 60) + 's';
}
</script>

<style></style>
