<template lang="pug">
#feedback
	h1 Feedback
	.row.py-3.sticky.top-0.glass
		.input
			label(for="date-input") Starting from
			DatePicker#date-input(type="date" v-model="startTime" @change="loadFeedbacks()")
	table.cells
		thead
			tr
				th Time
				th Message
		tbody
			tr(v-for="feedback in feedbacks" :key="feedback.time")
				td {{new Date(feedback.time).toLocaleString()}}
				td {{feedback.message}}
</template>

<script setup lang="ts">
import {useRoute} from 'vue-router';
import {ref} from 'vue';
import type {Feedback} from '../scripts/types';
import DatePicker from '../components/DatePicker.vue';
import Api from '../scripts/api';

const route = useRoute();
const feedbacks = ref<Feedback[]>([]);
const dayLength = 1000 * 60 * 60 * 24;
const initialDate = new Date(Date.now() - dayLength);

const startTime = ref<Date>(initialDate);

function loadFeedbacks() {
	Api.apps
		.getFeedbacks(+route.params.id, startTime.value.getTime())
		.then((f) => (feedbacks.value = f));
}

loadFeedbacks();
</script>

<style scoped></style>
