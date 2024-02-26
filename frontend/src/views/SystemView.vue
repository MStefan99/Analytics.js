<template lang="pug">
#system
	h1 System
	.row.py-3.sticky.top-0.glass
		.input
			label(for="date-start") Starting from
			DatePicker#date-start.w-full(type="datetime" v-model="start" @change="loadMetrics()")
		.input
			label(for="level-end") Ending on
			DatePicker#date-end.w-full(type="datetime" v-model="end" @change="loadMetrics()")
	.row
		.card
			h2 CPU usage
			TimedChart(:data="[chartDatasets.cpu]" type="line" :min="0" :max="100")
		.card
			h2 Memory usage
			TimedChart(:data="[chartDatasets.mem]" type="line" :min="0" :max="100")
		.card
			h2 Network usage
			TimedChart(
				:data="[chartDatasets.up, chartDatasets.down]"
				type="line"
				:yStacked="false"
				:min="0"
				:suggestedMax="0.25")
		.card
			h2 Disk usage
			TimedChart(:data="[chartDatasets.disk]" type="line" :min="0" :max="100")
</template>

<script setup lang="ts">
import {computed, onUnmounted, ref} from 'vue';
import {useRoute} from 'vue-router';
import TimedChart from '../components/TimedChart.vue';
import type {Metrics} from '../scripts/types';
import Api from '../scripts/api';
import {alert, PopupColor} from '../scripts/popups';
import DatePicker from '../components/DatePicker.vue';
import {useQuery} from '../scripts/composables';

type Dataset = {label: string; color: string; data: {[key: string]: number}};

window.document.title = 'System | Crash Course';

const mb = 1024 * 1024;
const route = useRoute();
const metrics = ref<Metrics[]>([]);
const sessionLength = 1000 * 60 * 30;
const start = ref<Date>(new Date(Date.now() - sessionLength));
const end = ref<Date>(new Date());
const datasetOptions: {name: string; val(m: Metrics): number; label: string; color: string}[] = [
	{
		name: 'cpu',
		val(m) {
			return m.cpu;
		},
		label: 'CPU, %',
		color: '#436'
	},
	{
		name: 'mem',
		val(m) {
			return (m.memUsed / m.memTotal) * 100;
		},
		label: 'Memory, %',
		color: '#724'
	},
	{
		name: 'up',
		val(m) {
			return m.netUp / mb;
		},
		label: 'Upload, MB/s',
		color: '#528'
	},
	{
		name: 'down',
		val(m) {
			return m.netDown / mb;
		},
		label: 'Download, MB/s',
		color: '#272'
	},
	{
		name: 'disk',
		val(m) {
			return (m.diskUsed / m.diskTotal) * 100;
		},
		label: 'Disk usage, %',
		color: '#772'
	}
];

const {query} = useQuery(
	computed(() => ({
		start: start.value.toISOString(),
		end: end.value.toISOString()
	}))
);
start.value = new Date(Array.isArray(query.value.start) ? query.value.start[0] : query.value.start);
end.value = new Date(Array.isArray(query.value.end) ? query.value.end[0] : query.value.end);

const chartDatasets = computed(() => {
	const data: {[key: string]: Dataset} = {};

	for (const chart of datasetOptions) {
		const dataset: Dataset = {label: chart.label, color: chart.color, data: {}};

		for (const metricsEntry of metrics.value) {
			dataset.data[metricsEntry.time] = chart.val(metricsEntry);
		}

		data[chart.name] = dataset;
	}

	return data;
});

function loadMetrics() {
	const now = Date.now();
	if (Math.abs(now - end.value.getTime()) < 1000 * 60) {
		end.value = new Date();
	}
	if (Math.abs(now - sessionLength - start.value.getTime()) < 1000 * 60) {
		start.value = new Date(Date.now() - sessionLength);
	}

	return Api.apps
		.getMetrics(+route.params.id, start.value.getTime(), end.value.getTime())
		.then((m) => (metrics.value = m));
}

loadMetrics().catch((err) => alert('Failed to load metrics', PopupColor.Red, err.message));

const refreshInterval = setInterval(loadMetrics, 1000 * 30);
onUnmounted(() => clearInterval(refreshInterval));
</script>

<style scoped>
.row > .card {
	flex-basis: 500px;
}
</style>
