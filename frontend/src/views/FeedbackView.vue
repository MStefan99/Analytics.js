<template lang="pug">
#feedback
	h1 {{app?.name}} feedback
	.row.py-3.sticky.top-0.glass
		.input
			label(for="date-input") Starting from
			DatePicker#date-input.w-full(v-model="start" @change="loadFeedbacks()")
	table.cells.w-full
		thead
			tr
				th Time
				th Message
		tbody
			tr(v-for="feedback in feedbacks" :key="feedback.id")
				td {{new Date(feedback.time).toLocaleString()}}
				td {{feedback.message}}
			tr(v-if="!feedbacks.length")
				td.text-center(colspan="2") No feedback found matching your criteria
</template>

<script setup lang="ts">
import {useRoute} from 'vue-router';
import {computed, ref} from 'vue';
import type {App, Feedback} from '../scripts/types';
import DatePicker from '../components/DatePicker.vue';
import Api from '../scripts/api';
import {alert, PopupColor} from '../scripts/popups';
import {useQuery} from '../scripts/composables';

const route = useRoute();
const app = ref<App | null>(null);
const feedbacks = ref<Feedback[]>([]);
const dayLength = 1000 * 60 * 60 * 24;
const initialDate = new Date(Date.now() - dayLength);

const start = ref<Date>(initialDate);

const {query} = useQuery(
	computed(() => ({
		start: start.value.toISOString()
	}))
);
start.value = new Date(Array.isArray(query.value.start) ? query.value.start[0] : query.value.start);

Api.apps.getByID(+route.params.id).then((a) => {
	app.value = a;
	window.document.title = a.name + ' feedback | Crash Course';
});

function loadFeedbacks() {
	Api.apps
		.getFeedbacks(+route.params.id, start.value.getTime())
		.then((f) => (feedbacks.value = f))
		.catch((err) => alert('Failed to load feedback', PopupColor.Red, err.message));
}

loadFeedbacks();
</script>

<style scoped></style>
