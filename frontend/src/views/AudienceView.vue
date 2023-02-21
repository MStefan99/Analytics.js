<template lang="pug">
div(v-if="!!app")
	h1 {{app.name}} audience
	#overview
		#realtime-audience.audience-card(v-if="realtimeAudience")
			h2 Audience now
			p Active users
			p#active-users.accent {{realtimeAudience.currentUsers}}
			svg#active-users-timeline-svg(viewBox="0 0 210 100" preserveAspectRatio="none")
				rect#top-line(width="210" height="1")
				rect.sessions-bar-underline(v-for="i in 30" :key="i" :x="i * 7" y=99 width=6 height=1)
			b Most popular pages
			table
				thead
					tr
						td Page
						td Views
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
			p#session-duration.accent {{Math.round(todayAudience.avgDuration / 1000)}}s
			//a.bold(href="/today/" + website.id) Full report
</template>

<script setup lang="ts">
import {ref} from 'vue';
import type {App, RealtimeAudience, DayAudience} from '../scripts/types';
import Api from '../scripts/api';
import {useRoute} from 'vue-router';

const app = ref<App | null>(null);
const realtimeAudience = ref<RealtimeAudience | null>(null);
const todayAudience = ref<DayAudience | null>(null);
const route = useRoute();

Api.apps.getByID(+route.params.id).then((a) => (app.value = a));
Api.apps.getRealtimeAudience(+route.params.id).then((a) => (realtimeAudience.value = a));
Api.apps.getTodayAudience(+route.params.id).then((a) => (todayAudience.value = a));
</script>

<style></style>
