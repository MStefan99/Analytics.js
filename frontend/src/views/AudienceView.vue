<template lang="pug">
div(v-if="!!app")
	h1 {{app.name}} audience
	#overview
		#realtime-audience.audience-card
			h2 Realtime
			p Active users
			p#active-users.accent Loading...
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
		#today-audience.audience-card
			h2 Audience today
			b Users
			p#today-users.accent Loading...
			b Sessions
			p#today-sessions.accent Loading...
			b Bounce rate
			p#bounce-rate.accent Loading...
			b Average session
			p#session-duration.accent Loading...
			//a.bold(href="/today/" + website.id) Full report
</template>

<script setup lang="ts">
import {ref} from 'vue';
import type {App} from '../scripts/types';
import Api from '../scripts/api';
import {useRoute} from 'vue-router';

const app = ref<App | null>(null);
const route = useRoute();

Api.apps.getByID(+route.params.id).then((a) => (app.value = a));
</script>

<style></style>
