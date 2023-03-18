<template lang="pug">
#system
	h1 System
	.row
		.card.m-4
			h2 CPU usage
			TimedChart(:data="chartData.cpu" :area="true" :min="0" :max="100")
		.card.m-4
			h2 Memory usage
			TimedChart(:data="chartData.mem" :area="true" :min="0" :max="100")
		.card.m-4
			h2 Network usage
			TimedChart(:data="chartData.up" :area="true" :min="0" :suggestedMax="0.25")
			TimedChart(:data="chartData.down" :area="true" :min="0" :suggestedMax="0.25")
		.card.m-4
			h2 Disk usage
			TimedChart(:data="chartData.disk" :area="true" :min="0" :max="100")
</template>

<script setup lang="ts">
import {computed, onUnmounted, ref} from 'vue';
import {useRoute} from 'vue-router';
import TimedChart from '../components/TimedChart.vue';
import type {Metrics} from '../scripts/types';
import Api from '../scripts/api';

type Dataset = {label: string; color: string; data: {[key: string]: number}};

window.document.title = 'System | Crash Course';

const mb = 1024 * 1024;
const route = useRoute();
const metrics = ref<Metrics[]>([]);
const charts: {name: string; val(m: Metrics): number; label: string; color: string}[] = [
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

const chartData = computed(() => {
	const data: {[key: string]: Dataset[]} = {};

	for (const chart of charts) {
		const dataset: Dataset = {label: chart.label, color: chart.color, data: {}};

		for (const metricsEntry of metrics.value) {
			dataset.data[metricsEntry.time] = chart.val(metricsEntry);
		}

		data[chart.name] = [dataset];
	}

	return data;
});

Api.apps.getMetrics(+route.params.id).then((m) => (metrics.value = m));
const interval = setInterval(
	() => Api.apps.getMetrics(+route.params.id).then((m) => (metrics.value = m)),
	1000 * 30
);
onUnmounted(() => clearInterval(interval));
</script>

<style scoped></style>
